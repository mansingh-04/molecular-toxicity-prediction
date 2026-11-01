"""Checks on the frozen data, the saved results and the notebooks.

Run from the repository root:  python -m pytest tests -q
They only read files, so they take a few seconds and need no trained models.
"""

import json
import re
from pathlib import Path

import nbformat
import numpy as np
import pandas as pd
import pytest

ROOT = Path(__file__).resolve().parents[1]
TASKS = ["NR-AR", "NR-AR-LBD", "NR-AhR", "NR-Aromatase", "NR-ER", "NR-ER-LBD",
         "NR-PPAR-gamma", "SR-ARE", "SR-ATAD5", "SR-HSE", "SR-MMP", "SR-p53"]
SPLITS = ["train", "val", "test"]


@pytest.fixture(scope="module")
def splits():
    return {s: pd.read_csv(ROOT / "data" / "splits" / f"tox21_{s}.csv") for s in SPLITS}


@pytest.fixture(scope="module")
def report():
    return json.loads((ROOT / "data" / "processed" / "preprocessing_report.json").read_text())


# ---------- data ----------
def test_twelve_assay_targets_with_binary_or_missing_labels(splits):
    for df in splits.values():
        assert [c for c in df.columns if c in TASKS] == TASKS
        values = df[TASKS].to_numpy(dtype=float)
        assert set(np.unique(values[~np.isnan(values)])) <= {0.0, 1.0}


def test_missing_labels_are_kept_missing_not_set_to_zero(splits, report):
    total_missing = sum(int(df[TASKS].isna().sum().sum()) for df in splits.values())
    expected = sum(s["missing"] for s in report["clean_label_stats"])
    assert total_missing == expected > 0


def test_split_sizes_match_the_preprocessing_report(splits, report):
    assert {s: len(df) for s, df in splits.items()} == report["split_sizes"]
    assert sum(len(df) for df in splits.values()) == report["clean_rows"]


def test_no_molecule_or_scaffold_is_shared_between_partitions(splits):
    for a, b in [("train", "val"), ("train", "test"), ("val", "test")]:
        assert not set(splits[a]["mol_id"]) & set(splits[b]["mol_id"])
        assert not set(splits[a]["smiles"]) & set(splits[b]["smiles"])          # no duplicate structures leak
        assert not set(splits[a]["scaffold"].dropna()) & set(splits[b]["scaffold"].dropna())


def test_no_duplicate_structures_after_cleaning(splits):
    all_smiles = pd.concat([df["smiles"] for df in splits.values()])
    assert all_smiles.is_unique


def test_known_limitation_acyclic_molecules_are_all_in_training(splits, report):
    """Documented limitation (see README): acyclic molecules share an empty scaffold, so the
    scaffold split puts all of them in training. If the split policy is changed, update this test."""
    acyclic = {s: int(df["scaffold"].isna().sum()) for s, df in splits.items()}
    assert acyclic == {"train": report["acyclic_molecules_empty_scaffold"], "val": 0, "test": 0}


# ---------- results ----------
METRIC_FILES = ["lr_metrics.csv", "rf_metrics.csv", "xgb_metrics.csv"]


@pytest.mark.parametrize("name", METRIC_FILES)
def test_metrics_use_only_observed_labels(name, splits):
    """n_observed per endpoint must equal the number of known labels in that split."""
    m = pd.read_csv(ROOT / "results" / "metrics" / name)
    for r in m.itertuples():
        y = splits[r.split][r.endpoint]
        assert r.n_observed == y.notna().sum()
        assert r.n_positive == (y == 1).sum() and r.n_negative == (y == 0).sum()


@pytest.mark.parametrize("name", METRIC_FILES)
def test_metrics_cover_every_endpoint_feature_set_and_split(name):
    m = pd.read_csv(ROOT / "results" / "metrics" / name)
    assert len(m) == 12 * 3 * 3
    assert set(m["endpoint"]) == set(TASKS) and set(m["split"]) == set(SPLITS)
    assert m["roc_auc"].between(0, 1).all() and m["pr_auc"].between(0, 1).all()


@pytest.mark.parametrize("name", ["lr_tuning_log.csv", "rf_tuning_log.csv", "xgb_tuning_log.csv"])
def test_tuning_used_validation_scores_only(name):
    cols = pd.read_csv(ROOT / "results" / "metrics" / "tuning" / name).columns
    assert any(c.startswith("val_") for c in cols)
    assert not any("test" in c for c in cols)


def test_prediction_files_keep_missing_labels_as_missing(splits):
    p = pd.read_csv(ROOT / "results" / "predictions" / "lr_morgan_test.csv")
    assert len(p) == len(splits["test"]) * 12
    assert p["y_true"].isna().sum() == splits["test"][TASKS].isna().sum().sum()


# ---------- notebooks and documentation ----------
@pytest.mark.parametrize("path", sorted((ROOT / "notebooks").glob("*.ipynb")), ids=lambda p: p.name)
def test_notebooks_are_valid_and_free_of_local_paths(path):
    nb = nbformat.read(path, as_version=4)
    nbformat.validate(nb)
    assert not re.search(r"/Users/|C:\\\\Users", path.read_text())


def test_local_links_in_markdown_files_exist():
    missing = []
    for md in [p for p in ROOT.rglob("*.md") if "app/" not in str(p.relative_to(ROOT)) and "runs/" not in str(p.relative_to(ROOT))]:
        for target in re.findall(r"\]\(([^)#\s]+)", md.read_text()):
            if target.startswith(("http://", "https://", "mailto:")):
                continue
            if not (md.parent / target).exists():
                missing.append(f"{md.relative_to(ROOT)} -> {target}")
    assert missing == []
