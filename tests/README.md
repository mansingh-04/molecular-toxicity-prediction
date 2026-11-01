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
- every metric row was computed on exactly the known labels of its split. This proves missing labels were excluded from evaluation.
- every model has results for 12 assays × 3 feature sets × 3 splits, with ROC-AUC and PR-AUC between 0 and 1.
- the tuning logs contain validation scores only, so the test set was not used for tuning.
- the prediction files keep missing labels as missing.
- the notebooks are valid Jupyter files and contain no local computer paths.
- every relative link in the Markdown files points to a file that exists.

The website has its own tests (`cd app && npm test`) and Python checks (`app/backend/tests`). See the main README.
