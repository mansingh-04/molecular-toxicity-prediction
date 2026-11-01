"""Convert the trained Morgan-fingerprint models into small files the website runs in the browser.

Run from the AI-ML-Project folder:
    .venv/bin/python backend/export_for_browser.py

Writes to public/models/:
    logreg.json                 Logistic Regression: one weight per fingerprint bit + intercept, per endpoint
    rf_<ENDPOINT>.bin           Random Forest trees for one endpoint (compact binary, see below)
    xgboost_<ENDPOINT>.bin      XGBoost trees for one endpoint (same format)
    manifest.json               endpoints, model settings, base rates, file list
and to public/data/:
    dataset.json                Member 1's cleaning and split statistics (preprocessing_report.json)
    metrics.json                every model x feature set x split x endpoint: ROC-AUC, PR-AUC, label counts
    model_details.json          per model: hyperparameters, training config, and threshold metrics
                                (accuracy, balanced accuracy, precision, recall, F1, confusion matrix)

Tree file format (all little-endian):
    uint32 n_trees, uint32 n_nodes
    int32  tree_start[n_trees]      index of each tree's root node
    int16  feature[n_nodes]         fingerprint bit tested at this node, -1 = leaf  (padded to 4 bytes)
    32-bit data[n_nodes]            internal node: int32 index of the right child
                                    leaf: float32 value (RF: probability of active, XGB: margin)
Nodes are stored depth-first, so the left child of node i is always node i + 1.
Rule at every internal node: bit == 0 -> go left, bit == 1 -> go right.
(For 0/1 fingerprint bits this is exactly sklearn's "x <= 0.5" and XGBoost's "x < 1".)
"""

import json
import math
import struct
from pathlib import Path

import joblib
import numpy as np
import xgboost

from prediction_service import ENDPOINTS

ROOT = Path(__file__).resolve().parents[1]
MODELS = ROOT / "backend" / "artifacts" / "models"
RESULTS = ROOT / "backend" / "artifacts" / "results"
OUT = ROOT / "public" / "models"
DATA_OUT = ROOT / "public" / "data"
DATA = ROOT / "backend" / "artifacts" / "data"
METRIC_FILES = [("logreg", "logistic_regression", "lr"), ("rf", "random_forest", "rf"), ("xgboost", "xgboost", "xgb")]


def write_trees(path: Path, trees) -> int:
    """trees: list of (feature list, data list) in depth-first order. Returns bytes written."""
    starts, features, data = [], [], []
    for tree_features, tree_data in trees:
        offset = len(features)
        starts.append(offset)
        features.extend(tree_features)
        # right-child indices are stored relative to the whole file
        data.extend(d if isinstance(d, float) else d + offset for d in tree_data)
    n = len(features)
    buf = bytearray(struct.pack("<II", len(starts), n))
    buf += struct.pack(f"<{len(starts)}i", *starts)
    buf += np.asarray(features, dtype="<i2").tobytes()
    if n % 2:
        buf += b"\0\0"                              # pad so the 32-bit array is 4-byte aligned
    for f, d in zip(features, data):
        buf += struct.pack("<f", d) if f == -1 else struct.pack("<i", d)
    path.write_bytes(bytes(buf))
    return len(buf)


def sklearn_tree(estimator):
    """sklearn already stores trees depth-first with left child = i + 1."""
    t = estimator.tree_
    features, data = [], []
    for i in range(t.node_count):
        if t.children_left[i] == -1:
            features.append(-1)
            v = t.value[i, 0]
            data.append(float(v[1] / v.sum()))         # probability of class 1 (active) in this leaf
        else:
            assert t.children_left[i] == i + 1 and t.threshold[i] == 0.5
            features.append(int(t.feature[i]))
            data.append(int(t.children_right[i]))
    return features, data


def xgboost_tree(node):
    """Re-write one XGBoost JSON tree depth-first: node, its 'yes' (bit 0) subtree, then its 'no' subtree."""
    features, data = [], []

    def visit(n):
        i = len(features)
        if "leaf" in n:
            features.append(-1)
            data.append(float(n["leaf"]))
            return
        assert n["split_condition"] == 1, "expected binary fingerprint splits (x < 1)"
        children = {c["nodeid"]: c for c in n["children"]}
        features.append(int(n["split"][1:]))
        data.append(0)                                 # right-child index filled in below
        visit(children[n["yes"]])                      # x < 1  (bit 0) -> left
        data[i] = len(features)
        visit(children[n["no"]])                       # bit 1 -> right
    visit(node)
    return features, data


def train_base_rates(metrics_csv: Path):
    import pandas as pd
    df = pd.read_csv(metrics_csv).query("feature_set == 'morgan' and split == 'train'").set_index("endpoint")
    return {ep: float(df.loc[ep, "n_positive"] / df.loc[ep, "n_observed"]) for ep in ENDPOINTS}


def threshold_metrics(y_true, y_prob, threshold):
    """Counts and rates at one decision threshold."""
    pred = (y_prob >= threshold).astype(int)
    tp = int(((pred == 1) & (y_true == 1)).sum())
    tn = int(((pred == 0) & (y_true == 0)).sum())
    fp = int(((pred == 1) & (y_true == 0)).sum())
    fn = int(((pred == 0) & (y_true == 1)).sum())
    recall = tp / (tp + fn) if tp + fn else 0.0          # sensitivity: share of actives found
    specificity = tn / (tn + fp) if tn + fp else 0.0     # share of inactives correctly passed
    precision = tp / (tp + fp) if tp + fp else 0.0
    n = tp + tn + fp + fn
    return {
        "threshold": round(float(threshold), 4),
        "tp": tp, "fp": fp, "tn": tn, "fn": fn,
        "accuracy": round((tp + tn) / n, 4) if n else None,
        # the score of always predicting the larger class: accuracy must be read against this
        "majorityBaseline": round(max(tp + fn, tn + fp) / n, 4) if n else None,
        "balancedAccuracy": round((recall + specificity) / 2, 4),
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "specificity": round(specificity, 4),
        "f1": round(2 * precision * recall / (precision + recall), 4) if precision + recall else 0.0,
    }


def best_threshold(y_true, y_prob):
    """Threshold maximising balanced accuracy, chosen on VALIDATION data only."""
    best, chosen = -1.0, 0.5
    for t in np.unique(np.round(y_prob, 4)):
        m = threshold_metrics(y_true, y_prob, t)
        if m["balancedAccuracy"] > best:
            best, chosen = m["balancedAccuracy"], float(t)
    return chosen


def export_model_details():
    """Hyperparameters and threshold metrics for the Morgan models, for the website's model cards.

    The decision threshold is tuned per assay on the VALIDATION predictions and then applied to the
    test predictions, so no test data influences the choice. Accuracy is exported together with the
    majority-class baseline, because on these imbalanced assays accuracy alone is misleading.
    """
    import pandas as pd
    out = []
    for model_id, folder, short in METRIC_FILES:
        manifest = json.loads((MODELS / folder / "morgan" / "manifest.json").read_text())
        preds = {s: pd.read_csv(RESULTS / folder / "predictions" / f"{short}_morgan_{s}.csv").dropna(subset=["y_true"])
                 for s in ("val", "test")}
        endpoints = []
        for ep in ENDPOINTS:
            v = preds["val"].query("endpoint == @ep")
            t = preds["test"].query("endpoint == @ep")
            if v.empty or t.empty:
                continue
            tuned = best_threshold(v["y_true"].to_numpy(), v["y_prob"].to_numpy())
            y, prob = t["y_true"].to_numpy(), t["y_prob"].to_numpy()
            endpoints.append({
                "endpoint": ep,
                "params": manifest["endpoint_models"][ep].get("params"),
                "nTrainObserved": manifest["endpoint_models"][ep].get("n_train_observed"),
                "nTrainPositive": manifest["endpoint_models"][ep].get("n_train_positive"),
                "default": threshold_metrics(y, prob, 0.5),
                "tuned": threshold_metrics(y, prob, tuned),
            })
        out.append({
            "modelId": model_id,
            "baseParams": manifest.get("base_params"),
            "grid": manifest.get("grid"),
            "seed": manifest.get("seed"),
            "selectionMetric": manifest.get("selection_metric"),
            "nFeatures": manifest.get("features", {}).get("n_features") or manifest.get("feature_config", {}).get("n_features"),
            "versions": manifest.get("versions"),
            "endpoints": endpoints,
        })
    (DATA_OUT / "model_details.json").write_text(json.dumps({"featureSet": "morgan", "models": out}, separators=(",", ":")))
    print(f"Wrote model_details.json ({sum(len(m['endpoints']) for m in out)} endpoint rows)")


def export_site_data():
    """Dataset statistics and all held-out metrics for the dashboard (read from the team's files, nothing typed by hand)."""
    import pandas as pd
    DATA_OUT.mkdir(parents=True, exist_ok=True)
    report = json.loads((DATA / "preprocessing_report.json").read_text())
    (DATA_OUT / "dataset.json").write_text(json.dumps(report, indent=1))

    rows = []
    for model_id, folder, short in METRIC_FILES:
        df = pd.read_csv(RESULTS / folder / f"{short}_metrics.csv")
        for r in df.itertuples():
            clean = lambda v: None if pd.isna(v) else round(float(v), 6)
            rows.append({"model": model_id, "featureSet": r.feature_set, "split": r.split, "endpoint": r.endpoint,
                         "rocAuc": clean(r.roc_auc), "prAuc": clean(r.pr_auc), "nObserved": int(r.n_observed),
                         "nPositive": int(r.n_positive), "nNegative": int(r.n_negative)})
    (DATA_OUT / "metrics.json").write_text(json.dumps({"selectionMetric": "validation ROC-AUC", "rows": rows}, separators=(",", ":")))
    print(f"Wrote dataset.json and metrics.json ({len(rows)} metric rows) to {DATA_OUT.relative_to(ROOT)}")
    export_model_details()


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    files = {}

    # Logistic Regression: p = sigmoid(intercept + sum of weights of the bits that are 1)
    lr = {}
    for ep in ENDPOINTS:
        model = joblib.load(MODELS / "logistic_regression" / "morgan" / f"{ep}.joblib").steps[-1][1]
        lr[ep] = {"intercept": float(model.intercept_[0]), "weights": [round(float(w), 9) for w in model.coef_[0]]}
    (OUT / "logreg.json").write_text(json.dumps(lr, separators=(",", ":")))
    files["logreg"] = ["logreg.json"]

    # Random Forest: p = average over trees of the leaf probability
    files["rf"] = []
    for ep in ENDPOINTS:
        forest = joblib.load(MODELS / "random_forest" / "morgan" / f"{ep}.joblib")
        forest = forest.steps[-1][1] if hasattr(forest, "steps") else forest
        write_trees(OUT / f"rf_{ep}.bin", [sklearn_tree(e) for e in forest.estimators_])
        files["rf"].append(f"rf_{ep}.bin")

    # XGBoost: p = sigmoid(base margin + sum of leaf values)
    files["xgboost"], xgb_base = [], {}
    for ep in ENDPOINTS:
        booster = xgboost.XGBClassifier()
        booster.load_model(MODELS / "xgboost" / "morgan" / f"{ep}.json")
        b = booster.get_booster()
        base = float(json.loads(b.save_config())["learner"]["learner_model_param"]["base_score"].strip("[]"))
        xgb_base[ep] = math.log(base / (1 - base))      # base_score is a probability; trees add to its logit
        write_trees(OUT / f"xgboost_{ep}.bin", [xgboost_tree(json.loads(t)) for t in b.get_dump(dump_format="json")])
        files["xgboost"].append(f"xgboost_{ep}.bin")

    manifest = {
        "endpoints": ENDPOINTS,
        "featureSet": "morgan",
        "fingerprint": {"radius": 2, "nBits": 2048},
        "baseRate": {m: train_base_rates(RESULTS / folder / f"{short}_metrics.csv")
                     for m, folder, short in [("logreg", "logistic_regression", "lr"), ("rf", "random_forest", "rf"), ("xgboost", "xgboost", "xgb")]},
        "xgboostBaseMargin": xgb_base,
        "files": files,
    }
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=1))
    total = sum(p.stat().st_size for p in OUT.iterdir())
    print(f"Wrote {len(list(OUT.iterdir()))} files to {OUT.relative_to(ROOT)} ({total / 1e6:.1f} MB)")
    export_site_data()


if __name__ == "__main__":
    main()
