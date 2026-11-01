# Data

## Source

**Tox21** (Toxicology in the 21st Century), as distributed by MoleculeNet / DeepChem:

- File: `tox21.csv.gz` (7,831 molecules, 12 binary assay labels, ~120 KB)
- Download: https://deepchemdata.s3-us-west-1.amazonaws.com/datasets/tox21.csv.gz
- Columns: `mol_id`, `smiles`, and 12 assays. 7 are nuclear-receptor assays (`NR-AR`, `NR-AR-LBD`, `NR-AhR`, `NR-Aromatase`, `NR-ER`, `NR-ER-LBD`, `NR-PPAR-gamma`). 5 are stress-response assays (`SR-ARE`, `SR-ATAD5`, `SR-HSE`, `SR-MMP`, `SR-p53`).
- Labels: `1` = active, `0` = inactive, empty = **not measured**. Missing labels are never treated as inactive.

The raw file is small and public, so it is committed in `raw/` to make the project reproducible offline. Notebook 01 can also download it (see `notebooks/README.md`).

## Folders

| Path | Content | Produced by |
| --- | --- | --- |
| `raw/tox21.csv.gz` | Raw Tox21 file, unchanged | DeepChem download |
| `processed/tox21_clean.csv` | 7,708 cleaned molecules with `smiles` (canonical, largest fragment), `smiles_original`, `scaffold`, `split` and the 12 labels | `notebooks/01_data_preprocessing_eda.ipynb` |
| `processed/preprocessing_report.json` | Counts from every cleaning step and the split | notebook 01 |
| `processed/label_stats_clean.csv` | Active / inactive / missing counts per assay | notebook 01 |
| `splits/tox21_{train,val,test}.csv` | The **frozen** scaffold split used by every model | notebook 01 |
| `splits/split_{train,val,test}_idx.csv` | Row indices of each partition in `tox21_clean.csv` | notebook 01 |

**Reproducibility check:** running notebook 01 on `raw/tox21.csv.gz` reproduces the four CSV files and the report **byte for byte**. This was checked while assembling the repository.

## Cleaning (notebook 01, Member 1)

| Step | Molecules |
| --- | --- |
| Raw file | 7,831 |
| SMILES RDKit cannot parse, removed | −8 |
| Salts and mixtures reduced to the largest fragment (by heavy atoms) | 244 affected |
| Duplicate structures merged by canonical SMILES (72 groups, 187 rows) | −115 |
| Conflicting labels among duplicates set to missing | 47 labels |
| **Clean dataset** | **7,708** |

## Split

A deterministic Bemis–Murcko **scaffold split**, 80 / 10 / 10. Scaffold groups are assigned largest first to train, then validation, then test.

| Partition | Molecules |
| --- | --- |
| Train | 6,166 |
| Validation | 771 |
| Test | 771 |

No molecule, canonical SMILES or scaffold is shared between partitions (checked in `tests/test_data_integrity.py`).

**Known limitation.** Acyclic molecules have no ring scaffold, so all 1,753 of them share the empty scaffold and form one group, which the algorithm places in training. Validation and test therefore contain only ring-containing molecules. The team decided to keep this frozen split, so all members' results stay comparable, and to report the limitation. Changing it would require re-running notebook 01 with a different grouping rule and retraining every model.
