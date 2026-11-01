"""Check that the saved models, loaded here, give exactly the notebooks' saved test predictions.

It runs Member 1's raw test SMILES through standardise -> features -> model and compares with
results/<model>/predictions/*_test.csv. (The website's in-browser copies are checked against the
same files in src/services/inference/parity.test.ts.)

Run from the AI-ML-Project folder:
    .venv/bin/python backend/verify_models.py
"""

import sys
from pathlib import Path

import pandas as pd

from features import FEATURE_SET_FOLDER, standardise_smiles
from prediction_service import AML_MODELS, ModelRegistry

ARTIFACTS = Path(__file__).parent / "artifacts"
SHORT = {"logreg": "lr", "rf": "rf", "xgboost": "xgb"}


def main(test_csv: str, n_molecules: int = 50) -> None:
    registry = ModelRegistry(ARTIFACTS)
    test = pd.read_csv(test_csv)
    if "split" in test.columns:
        test = test[test["split"] == "test"]
    test = test.head(n_molecules)
    mols = [standardise_smiles(s)[0] for s in test["smiles_original"]]
    worst = 0.0
    for (model_id, feature_set) in registry.models:
        folder = AML_MODELS[model_id]["folder"]
        path = ARTIFACTS / "results" / folder / "predictions" / f"{SHORT[model_id]}_{FEATURE_SET_FOLDER[feature_set]}_test.csv"
        saved = pd.read_csv(path).set_index(["mol_id", "endpoint"])["y_prob"]
        for mol_id, mol in zip(test["mol_id"], mols):
            for endpoint, prob in registry.predict(mol, model_id, feature_set).items():
                if prob is not None:
                    worst = max(worst, abs(prob - saved[(mol_id, endpoint)]))
        print(f"{model_id:8s} {feature_set:20s} checked")
    print(f"Largest difference from the notebook predictions: {worst:.2e}")
    print("OK" if worst < 1e-9 else "MISMATCH: the loaded models or features differ from training")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else str(ARTIFACTS / "data" / "tox21_clean.csv"))
