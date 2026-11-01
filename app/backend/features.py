"""Molecule standardisation and the AML feature functions used at prediction time.

The feature code copies Member 2's notebook exactly (same RDKit generator, same 12
descriptors in the same order). A model only gives valid outputs if it receives the
same features it was trained on, so do not change these settings without retraining.
"""

import math

import numpy as np
from rdkit import Chem, RDLogger
from rdkit.Chem import Crippen, Descriptors, Lipinski, rdFingerprintGenerator, rdMolDescriptors

MORGAN_RADIUS = 2
MORGAN_N_BITS = 2048

# Order matters: saved models expect the columns in exactly this order.
DESCRIPTORS = {
    "MolWt": Descriptors.MolWt,
    "MolLogP": Crippen.MolLogP,
    "NumHDonors": Lipinski.NumHDonors,
    "NumHAcceptors": Lipinski.NumHAcceptors,
    "TPSA": rdMolDescriptors.CalcTPSA,
    "NumRotatableBonds": Lipinski.NumRotatableBonds,
    "RingCount": rdMolDescriptors.CalcNumRings,
    "NumAromaticRings": rdMolDescriptors.CalcNumAromaticRings,
    "HeavyAtomCount": Lipinski.HeavyAtomCount,
    "NumHeteroatoms": rdMolDescriptors.CalcNumHeteroatoms,
    "FractionCSP3": rdMolDescriptors.CalcFractionCSP3,
    "FormalCharge": Chem.GetFormalCharge,
}

FEATURE_SETS = ["morgan", "descriptors", "morgan+descriptors"]
# Folder names used by Member 2's and Member 3's notebooks
FEATURE_SET_FOLDER = {"morgan": "morgan", "descriptors": "descriptors", "morgan+descriptors": "morgan_descriptors"}

_morgan_generator = rdFingerprintGenerator.GetMorganGenerator(radius=MORGAN_RADIUS, fpSize=MORGAN_N_BITS)


class InvalidSmilesError(ValueError):
    """Raised when RDKit cannot read a SMILES string."""


def largest_fragment(mol):
    """Member 1's rule (Tox21_Preprocessing.ipynb): keep the fragment with the most heavy atoms."""
    frags = Chem.GetMolFrags(mol, asMols=True, sanitizeFrags=True)
    return mol if len(frags) == 1 else max(frags, key=lambda m: m.GetNumHeavyAtoms())


def standardise_smiles(smiles: str):
    """Parse a SMILES, keep the largest fragment (strips salts) and return (mol, canonical_smiles, notes).

    Same steps as Member 1's cleaning of the training data: parse with RDKit, reduce
    to the largest fragment, write canonical SMILES. The features are then computed
    from that canonical SMILES, exactly like Member 2's notebook did.
    """
    if not isinstance(smiles, str) or not smiles.strip():
        raise InvalidSmilesError("The SMILES string is empty.")
    RDLogger.DisableLog("rdApp.*")          # keep RDKit's own messages out of the server log
    try:
        mol = Chem.MolFromSmiles(smiles.strip())
        if mol is None:
            raise InvalidSmilesError(f"RDKit could not parse or sanitise the SMILES '{smiles}'.")
        if mol.GetNumAtoms() == 0:
            raise InvalidSmilesError("The molecule has no atoms.")
        notes = []
        if len(Chem.GetMolFrags(mol)) > 1:
            mol = largest_fragment(mol)
            notes.append("Input had several fragments; only the largest fragment was kept (salt stripping).")
        canonical = Chem.MolToSmiles(mol, canonical=True)
        # Member 2 computed features from the canonical SMILES string, so re-read it the same way.
        mol = Chem.MolFromSmiles(canonical)
    finally:
        RDLogger.EnableLog("rdApp.*")
    return mol, canonical, notes


def morgan_fingerprint(mol) -> np.ndarray:
    """2048-bit Morgan fingerprint, radius 2 (ECFP4-like), as 0/1 values."""
    return _morgan_generator.GetFingerprintAsNumPy(mol).astype(np.uint8)


def molecular_descriptors(mol) -> np.ndarray:
    """The 12 RDKit descriptors. A failed or non-finite value becomes NaN (the models impute it)."""
    values = []
    for function in DESCRIPTORS.values():
        try:
            value = float(function(mol))
        except Exception:
            value = math.nan
        values.append(value if math.isfinite(value) else math.nan)
    return np.array(values)


def build_features(mol, feature_set: str) -> np.ndarray:
    """Return a (1, n_features) matrix in the column order the models were trained with."""
    if feature_set == "morgan":
        row = morgan_fingerprint(mol).astype(np.float64)
    elif feature_set == "descriptors":
        row = molecular_descriptors(mol)
    elif feature_set == "morgan+descriptors":
        row = np.concatenate([morgan_fingerprint(mol).astype(np.float64), molecular_descriptors(mol)])
    else:
        raise ValueError(f"Unknown feature set '{feature_set}'. Use one of {FEATURE_SETS}.")
    return row.reshape(1, -1)
