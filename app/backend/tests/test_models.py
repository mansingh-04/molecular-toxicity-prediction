"""Python-side checks (run: .venv/bin/python -m pytest backend/tests).
The browser copies of the models are checked separately in src/services/inference/parity.test.ts."""

import sys
from pathlib import Path

import pandas as pd
import pytest

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))

from features import InvalidSmilesError, build_features, standardise_smiles  # noqa: E402

CLEAN = BACKEND / "artifacts" / "data" / "tox21_clean.csv"


def test_standardisation_matches_member1_cleaning():
    """Our cleaning step reproduces Member 1's cleaned SMILES for every molecule."""
    df = pd.read_csv(CLEAN)
    mismatches = [o for o, s in zip(df.smiles_original, df.smiles) if standardise_smiles(o)[1] != s]
    assert mismatches == []


def test_salt_stripping_and_invalid_input():
    assert standardise_smiles("CC(=O)[O-].[Na+]")[1] == "CC(=O)[O-]"
    with pytest.raises(InvalidSmilesError):
        standardise_smiles("C1CC(")


def test_feature_shapes():
    mol = standardise_smiles("CCO")[0]
    assert build_features(mol, "morgan").shape == (1, 2048)
    assert build_features(mol, "descriptors").shape == (1, 12)
    assert build_features(mol, "morgan+descriptors").shape == (1, 2060)


@pytest.mark.skipif(not (BACKEND / "artifacts" / "models" / "random_forest").is_dir(), reason="trained models not installed")
def test_saved_models_reproduce_notebook_predictions():
    """Loading a saved Random Forest and predicting gives the notebook's saved probability."""
    from prediction_service import ModelRegistry
    reg = ModelRegistry(BACKEND / "artifacts")
    saved = pd.read_csv(BACKEND / "artifacts/results/random_forest/predictions/rf_morgan_test.csv").set_index(["mol_id", "endpoint"])["y_prob"]
    row = pd.read_csv(CLEAN).query("split == 'test'").iloc[0]
    probs = reg.predict(standardise_smiles(row.smiles_original)[0], "rf", "morgan")
    assert max(abs(p - saved[(row.mol_id, ep)]) for ep, p in probs.items()) < 1e-9
