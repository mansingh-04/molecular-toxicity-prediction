"""Loads the trained AML models (the notebooks' saved files) and predicts with them in Python.

This is the reference implementation. The website runs exported copies of these models in the
browser (backend/export_for_browser.py), and backend/verify_models.py plus
src/services/inference/parity.test.ts check that both give the same numbers.

Expected layout (exactly what Member 2's and Member 3's notebooks produce):
    artifacts/models/logistic_regression/<feature_set>/<ENDPOINT>.joblib + manifest.json
    artifacts/models/random_forest/<feature_set>/<ENDPOINT>.joblib      + manifest.json
    artifacts/models/xgboost/<feature_set>/<ENDPOINT>.json              + manifest.json
<feature_set> is one of: morgan, descriptors, morgan_descriptors.
"""

import json
from pathlib import Path

import joblib
import xgboost

from features import FEATURE_SET_FOLDER, FEATURE_SETS, build_features

ENDPOINTS = ["NR-AR", "NR-AR-LBD", "NR-AhR", "NR-Aromatase", "NR-ER", "NR-ER-LBD",
             "NR-PPAR-gamma", "SR-ARE", "SR-ATAD5", "SR-HSE", "SR-MMP", "SR-p53"]

# modelId (used by the website) -> folder written by the notebooks
AML_MODELS = {
    "logreg": {"name": "Logistic Regression", "folder": "logistic_regression"},
    "rf": {"name": "Random Forest", "folder": "random_forest"},
    "xgboost": {"name": "XGBoost", "folder": "xgboost"},
}


def load_endpoint_model(model_id: str, path: Path):
    """Load one saved per-endpoint classifier. Only load files produced by our own team."""
    if model_id == "xgboost":
        model = xgboost.XGBClassifier()
        model.load_model(path)
        return model
    return joblib.load(path)


class ModelRegistry:
    """All trained models, loaded once: models[(model_id, feature_set)][endpoint] -> fitted model (or None)."""

    def __init__(self, artifacts_dir: Path):
        self.artifacts_dir = Path(artifacts_dir)
        self.models = {}
        for model_id, spec in AML_MODELS.items():
            for feature_set in FEATURE_SETS:
                folder = self.artifacts_dir / "models" / spec["folder"] / FEATURE_SET_FOLDER[feature_set]
                if not (folder / "manifest.json").is_file():
                    continue
                manifest = json.loads((folder / "manifest.json").read_text())
                self.models[(model_id, feature_set)] = {
                    # an endpoint can be skipped in training (one class only): then there is no model
                    ep: load_endpoint_model(model_id, folder / info["model_file"]) if info.get("model_file") else None
                    for ep, info in ((ep, manifest["endpoint_models"].get(ep, {})) for ep in ENDPOINTS)
                }

    def predict(self, mol, model_id: str, feature_set: str) -> dict:
        """Probability of activity for each endpoint (None where no model exists)."""
        X = build_features(mol, feature_set)
        return {ep: (float(m.predict_proba(X)[0, 1]) if m is not None else None)
                for ep, m in self.models[(model_id, feature_set)].items()}
