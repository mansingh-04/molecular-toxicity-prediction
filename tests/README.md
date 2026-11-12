# Tests

```
python -m pytest tests -q
```

`test_data_integrity.py` reads only files in the repository, so it needs no trained models. It checks that:
- the split files contain exactly the 12 Tox21 assays, with labels 0, 1 or missing.
- missing labels are kept as missing: the total matches the preprocessing report.
- split sizes match the report, with no duplicate structures.
- no molecule, canonical SMILES or scaffold is shared between train, validation and test (no leakage).
- the known limitation holds: all acyclic molecules are in train. If the split policy changes, update this test.
- every metric row was computed on exactly the known labels of its split, for all four models. This proves missing labels were excluded from evaluation.
- every AML model has results for 12 assays × 3 feature sets × 3 splits, with ROC-AUC and PR-AUC between 0 and 1.
- the GCN has results for 12 assays × 3 splits on the one feature set it has (`graph`), its rows appear unchanged in `all_models_metrics.csv`, and `summary.csv`'s GCN means match its per-assay rows.
- the tuning logs contain validation scores only, so the test set was not used for tuning — including the GCN's, where the number of epochs is also a validation choice.
- the prediction files keep missing labels as missing, and every probability is between 0 and 1.
- the notebooks are valid Jupyter files and contain no local computer paths.
- every relative link in the project's own Markdown files points to a file that exists. Markdown inside `app/`, scratch `runs/` and installed environments (`.venv/`, `node_modules/`) is not ours to check, so it is skipped.

The website has its own tests (`cd app && npm test`) and Python checks (`app/backend/tests`). See the main README.
