# Molecular Toxicity Prediction via Fingerprints and Molecular Graph Networks

[![Live demo](https://img.shields.io/badge/Live%20demo-Open%20ToxiLab-0f766e?style=for-the-badge)](https://toxilab.man9876tr.workers.dev/)

**🔗 Live demo: [toxilab.man9876tr.workers.dev](https://toxilab.man9876tr.workers.dev/)** — results dashboard and a 3D lab where you can test any molecule in your browser.

B.Tech CSE (AI) team project. It compares classic machine learning on engineered **Morgan fingerprints** with a **graph neural network** that learns from the molecular graph, on the 12 assays of the **Tox21** dataset, under one scaffold split and one evaluation protocol.

**Status.**
- **Phase 1 (machine learning) is complete:** data preparation, EDA, feature engineering, Logistic Regression, Random Forest, XGBoost, evaluation and the website. 108 classifiers trained and evaluated.
- **Phase 2 (deep learning) is complete:** notebook 04 trains a multi-task Graph Convolutional Network on the same frozen split, with a masked loss for the missing labels, and compares it with Phase 1 under the same metrics. Where every model sees the structure alone, the GCN has the highest mean test ROC-AUC (**0.756** against 0.716 for the best fingerprint model) and leads on 9 of the 12 assays — and it is close to Random Forest on Morgan + descriptors (0.764), which is given 12 extra physicochemical properties the GCN never sees. It also runs in the browser, so the website's lab tests any molecule against it.
- The IEEE-format report in `Report/` covers both phases, including the graph network, the literature review and the comparison below. The deck in `Presentation/` is exported from `presentation/Tox21_Phase1.pptx` and covers both phases too.

---

## 1. Problem statement and objectives

Chemicals can disturb biological pathways. The Tox21 programme measured about 8,000 compounds in high-throughput in-vitro assays for nuclear-receptor signalling and cellular stress responses. Predicting assay activity from structure alone helps prioritise which chemicals to test.

Objectives:
1. Prepare a clean, leakage-free version of Tox21 with a scaffold split shared by every model.
2. Represent molecules as Morgan fingerprints and RDKit descriptors, then train Logistic Regression, Random Forest and XGBoost for each assay.
3. Handle **missing labels** correctly: exclude them from training and evaluation, never treat them as inactive.
4. Evaluate every assay with ROC-AUC and PR-AUC (average precision), tune on validation, and report the test set once.
5. Train a GCN on the molecular graphs under that same protocol and compare it with the fingerprint models.

**Research question:** under the same scaffold split and metrics, how do fingerprint-based ML models compare with a graph neural network across the 12 Tox21 assays? We do not assume the deep model will win.

## 2. Dataset

**Tox21** via MoleculeNet / DeepChem: 7,831 molecules (SMILES) and 12 binary assays.
- 7 nuclear-receptor assays: NR-AR, NR-AR-LBD, NR-AhR, NR-Aromatase, NR-ER, NR-ER-LBD, NR-PPAR-gamma.
- 5 stress-response assays: SR-ARE, SR-ATAD5, SR-HSE, SR-MMP, SR-p53.
- Labels are 1 (active), 0 (inactive) or missing. **17.05% of all label cells are missing.** Per assay, 7.4% (NR-AR) to 25.8% (NR-Aromatase) of labels are missing, and 2.9% (NR-PPAR-gamma) to 16.0% (SR-ARE) of labelled molecules are active.

After cleaning, 7,708 unique molecules remain, split by scaffold 80 / 10 / 10 into train (6,166), validation (771) and test (771), across 2,285 unique scaffolds. Details, the download link and the cleaning steps are in [data/README.md](data/README.md).

## 3. Method

```
tox21.csv ─▶ 01 clean & split ─▶ 02 features + Logistic Regression ─▶ 03 Random Forest + XGBoost + comparison
            Khushi, Riya Yadav   Manpreet Singh, Avneet Singh         Avneet Singh, Satvik Prasad
            · RDKit parsing      · Morgan fingerprint, r=2, 2048 bits  · per-assay RF and XGBoost
            · largest fragment   · 12 RDKit descriptors                · same features, labels, metrics
            · canonical SMILES   · per-assay LR, observed labels only  · imbalance analysis
            · duplicate merge    · C and class weight tuned on val     · best model per assay
            · scaffold split     · imputation/scaling fit on train     · final test report
                     │
                     └────────▶ 04 graph convolutional network (Phase 2)
                                · atoms as nodes, bonds as edges, self-loops
                                · 3 GCN layers, mean + max pooling
                                · one shared network, 12 masked outputs
                                · same split, same metrics, test read once
```

- **Missing labels:** each assay's model is trained only on molecules with a known label for that assay. The GCN does the same with a **masked loss**: unmeasured entries are multiplied by zero, so they contribute no loss and no gradient. Metrics use only known labels too (verified in `tests/`).
- **Class imbalance:** class weighting is a tuned option (LR `class_weight`, RF `balanced_subsample`, XGBoost `scale_pos_weight`, GCN `pos_weight`), not assumed to help. It was not selected for the GCN, and for many Phase 1 assays either.
- **Model selection:** validation ROC-AUC, with PR-AUC breaking ties. For Phase 1, hyperparameters are tuned **per assay**, so each of the 108 classifiers has its own configuration. The GCN is one multi-task network, so it has **one configuration for all 12 assays**, chosen from a 16-point grid, and its number of epochs is chosen on validation by early stopping. In both phases the test set was used once, after every setting was fixed.
- **Why not accuracy:** on the test split, always predicting "inactive" already scores **89.5%** accuracy averaged over the 12 assays (75.9% to 98.0% per assay). Accuracy cannot separate a useful model from a trivial one here, so it is reported nowhere in this project.
- **Reproducibility:** seed 42 and pinned library versions. Re-running notebook 01 on the raw file reproduces the split byte for byte, and re-running notebooks 02–03 reproduces the saved metrics. The GCN is seeded too, but a neural network is more sensitive to its initialisation than a forest: retraining the chosen configuration with three seeds moves validation ROC-AUC by **0.005** ([results/metrics/gnn_seed_stability.csv](results/metrics/gnn_seed_stability.csv)), which is the resolution any GCN comparison here should be read at.
- **Phase 2 (done):** SMILES → molecular graph (atoms as nodes, bonds as edges) → 3 GCN layers → mean + max pooling → 12 masked outputs, on this same frozen split. Bond types are deliberately not used, which is the plain Kipf–Welling model and also a limitation.

## 4. Repository structure

```
molecular-toxicity-prediction/
├── README.md                  this file
├── requirements.txt           pinned Python environment
├── LICENSE                    MIT license
├── data/                      raw Tox21, cleaned data and the frozen split   → data/README.md
├── notebooks/                 01 preprocessing+EDA · 02 fingerprints+LR · 03 RF+XGBoost · 04 GCN
├── results/                   metrics, tuning logs, tables, figures, predictions  → results/README.md
├── models/                    manifests; the AML models are a Release asset, the GCN (0.3 MB) is in models/gnn/
├── tests/                     data-integrity and evaluation-protocol tests  → tests/README.md
└── app/                       ToxiLab website: results dashboard and 3D lab simulation  → app/README.md
```

## 5. Environment setup

Python 3.13. The exact versions matter: scikit-learn 1.6.1 and XGBoost 3.4.1 are needed to load the saved models. PyTorch is only needed for notebook 04; a CPU build is enough.
```
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
```

## 6. Run the notebooks in Google Colab

| Notebook | Open |
| --- | --- |
| 01 · Preprocessing, EDA, scaffold split | [![Open in Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/mansingh-04/molecular-toxicity-prediction/blob/main/notebooks/01_data_preprocessing_eda.ipynb) |
| 02 · Morgan fingerprints, descriptors, Logistic Regression | [![Open in Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/mansingh-04/molecular-toxicity-prediction/blob/main/notebooks/02_morgan_fingerprints_logistic_regression.ipynb) |
| 03 · Random Forest, XGBoost, model comparison | [![Open in Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/mansingh-04/molecular-toxicity-prediction/blob/main/notebooks/03_random_forest_xgboost_comparison.ipynb) |
| 04 · Graph convolutional network (Phase 2) | [![Open in Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/mansingh-04/molecular-toxicity-prediction/blob/main/notebooks/04_graph_convolutional_network.ipynb) |

Notebooks 02 and 03 need the previous notebook's outputs. **Notebook 04 needs only notebook 01's three split files** (plus `all_models_metrics.csv` from notebook 03 if you want its final comparison section), because the GCN reads the molecules themselves rather than a feature matrix.

## 7. Run locally

Open the notebooks with `jupyter lab` and run them in order (01 → 02 → 03 → 04). Notebooks 02 and 03 together take about 20–30 min on a laptop CPU; notebook 04 trains its 16-point grid plus the seed check in about 6 minutes on 4 CPU cores, and needs no GPU.

Run the tests (27 tests, a few seconds, no trained models needed):
```
python -m pytest tests -q
```

## 8. AML training and evaluation

Training, tuning and evaluation all happen inside notebooks 02 and 03. Each notebook ends with a sanity-check cell that must print `OK` for every check. Outputs:
- **Metrics:** `results/metrics/{lr,rf,xgb}_metrics.csv` and the combined `all_models_metrics.csv`, one row per feature set × assay × split.
- **Predictions:** `results/predictions/`, one file per model × feature set × split.
- **Tuning logs:** `results/metrics/tuning/` — validation scores only, never test.
- **Models:** the per-assay settings are in `models/manifests/<model>/<feature_set>.json`. The fitted models themselves are about 150 MB, so they are attached to a GitHub Release rather than committed.

## 9. GNN training and evaluation

Everything is in [notebooks/04_graph_convolutional_network.ipynb](notebooks/04_graph_convolutional_network.ipynb), which reads Member 1's split files and nothing else. It is plain PyTorch — the propagation rule is written out rather than imported, so there is no PyTorch Geometric dependency to match against a torch build.

**The model.** Each molecule becomes a graph: heavy atoms are nodes with a 77-dimensional feature vector (element, total degree, formal charge, attached hydrogens, multiple bonds on the atom, total valence, and aromatic and in-ring flags — each one-hot with an `other` bucket), and every bond is an edge in both directions. The element vocabulary is built from **training molecules only**, the same rule that makes notebook 02 fit its imputer on training rows only. Three graph-convolution layers apply Â H W with Â = D̃^−1/2 (A + I) D̃^−1/2, each followed by batch normalisation, ReLU and dropout; after three layers an atom's vector summarises everything within three bonds of it, which is the GCN's counterpart to the fingerprint's radius. Atom vectors are then reduced per molecule by **mean and max pooling** (concatenated), and a small MLP head produces 12 logits — one shared network for all 12 assays.

**The loss.** Binary cross-entropy on all 12 outputs, multiplied by a 0/1 mask and averaged over observed entries only. Notebook 04 proves the mask works rather than asserting it: it computes the loss and every gradient twice, once with the missing labels filled with 0 and once with 1, and checks that both are bit-identical.

**Chosen on validation** from a 16-point grid (hidden width 64/128 × 2/3 layers × learning rate 5e-4/1e-3 × class weighting on/off): **128 units, 3 layers, lr 5e-4, no class weighting**, stopping at epoch 56 of 81 — 78,220 parameters. Class weighting lost on validation, as it did for most Phase 1 assays.

**Why no hybridisation.** RDKit's `GetHybridization()` would be the obvious extra feature, and the first version of this notebook used it. It was dropped so the model can run in the visitor's browser: RDKit compiled to WebAssembly exposes the molecule as JSON — atomic numbers, charges, implicit hydrogens, Kekulé bond orders, aromatic flags and rings, every one of which was checked against Python RDKit on all 140,937 atoms and matches exactly — but not hybridisation, which RDKit derives internally from conjugation perception. Multiple-bond count and total valence stand in for it, at a cost of 0.0015 validation ROC-AUC, smaller than the spread between seeds. The website's `gcnParity.test.ts` then proves the browser reproduces this notebook on every validation and test molecule (18,504 predictions, largest difference 4×10⁻⁷).

Outputs, in the same formats as Phase 1:
- **Metrics:** `results/metrics/gnn_metrics.csv` (one row per assay × split, `feature_set` = `graph`), merged into `all_models_metrics.csv` and `summary.csv`.
- **Predictions:** `results/predictions/gnn_graph_{val,test}.csv`.
- **Tuning log:** `results/metrics/tuning/gnn_tuning_log.csv` — validation scores only, never test.
- **Seed check:** `results/metrics/gnn_seed_stability.csv`.
- **Model:** `models/gnn/graph/gcn.pt` (0.3 MB, small enough to commit) with its manifest in [models/manifests/gnn/graph.json](models/manifests/gnn/graph.json), which stores the atom-feature vocabulary the weights depend on.

## 10. Results (verified, from `results/metrics/`)

Mean over the 12 assays:

| Model | Features | Val ROC-AUC | Val PR-AUC | Test ROC-AUC | Test PR-AUC |
|---|---|---|---|---|---|
| Logistic Regression | Morgan | 0.724 | 0.323 | 0.702 | 0.277 |
| Logistic Regression | Descriptors | 0.723 | 0.222 | 0.666 | 0.219 |
| Logistic Regression | Morgan + descriptors | 0.749 | 0.297 | 0.739 | 0.269 |
| Random Forest | Morgan | 0.750 | 0.382 | 0.716 | 0.317 |
| Random Forest | Descriptors | 0.743 | 0.333 | 0.736 | 0.301 |
| **Random Forest** | **Morgan + descriptors** | **0.785** | **0.407** | **0.764** | **0.370** |
| XGBoost | Morgan | 0.737 | 0.349 | 0.712 | 0.281 |
| XGBoost | Descriptors | 0.749 | 0.337 | 0.710 | 0.269 |
| XGBoost | Morgan + descriptors | 0.774 | 0.391 | 0.755 | 0.354 |
| **GCN** | **Molecular graph** | 0.767 | 0.392 | 0.756 | 0.359 |

Read the GCN row against the three **Morgan** rows, not against the bottom of the table: those are the models that, like it, see nothing but the structure. On that comparison the GCN is clearly ahead on both metrics (0.756 / 0.359 against 0.716 / 0.317 for the best of them). Random Forest on Morgan + descriptors still has the highest test ROC-AUC overall (0.764), but its margin over the GCN is 0.008 — about the seed noise — and it is given 12 hand-made physicochemical properties the GCN never receives.

**Does adding the 12 descriptors help?** Gain on the test split, morgan + descriptors minus morgan:

| Model | Δ ROC-AUC | Δ PR-AUC |
|---|---|---|
| Logistic Regression | +0.037 | **−0.009** |
| Random Forest | +0.047 | +0.053 |
| XGBoost | +0.043 | +0.073 |

Every model gains ROC-AUC, but on PR-AUC the two tree models gain substantially while Logistic Regression loses a little. A linear model cannot combine 2,048 sparse bits with 12 dense descriptors the way a tree can. We ran no ablation, so we report the effect without claiming the mechanism.

**Structure alone.** Test ROC-AUC per assay for the three fingerprint models and the GCN. Every model in this table sees the molecule and nothing else, so this is the comparison the project was built to make:

| Assay | Test labels (obs / active) | LR | RF | XGBoost | GCN |
|---|---|---|---|---|---|
| NR-AR | 691 / 14 | 0.514 | 0.552 | 0.509 | **0.576** |
| NR-AR-LBD | 598 / 12 | 0.719 | 0.758 | 0.754 | **0.800** |
| NR-AhR | 582 / 110 | 0.806 | 0.811 | 0.772 | **0.820** |
| NR-Aromatase | 490 / 53 | 0.785 | 0.751 | 0.744 | **0.834** |
| NR-ER | 537 / 72 | 0.641 | 0.664 | **0.683** | 0.662 |
| NR-ER-LBD | 631 / 24 | 0.551 | 0.637 | 0.638 | **0.690** |
| NR-PPAR-gamma | 559 / 32 | 0.750 | 0.747 | 0.797 | **0.810** |
| SR-ARE | 497 / 120 | **0.728** | 0.708 | 0.666 | 0.728 |
| SR-ATAD5 | 645 / 33 | 0.725 | **0.797** | 0.778 | 0.779 |
| SR-HSE | 605 / 55 | 0.731 | 0.716 | 0.739 | **0.799** |
| SR-MMP | 465 / 89 | 0.774 | 0.746 | 0.751 | **0.824** |
| SR-p53 | 618 / 75 | 0.694 | 0.709 | 0.721 | **0.755** |
| **Mean** | | 0.702 | 0.716 | 0.712 | **0.756** |

What these results show:
- Every model is far above chance on most assays, and of the four that see structure alone the **GCN has the highest mean and leads on 9 of the 12 assays** (Logistic Regression 1, Random Forest 1, XGBoost 1). SR-ARE is effectively a tie: 0.72794 for Logistic Regression against 0.72770 for the GCN.
- The margin is larger than the noise we can measure: +0.040 mean ROC-AUC over Random Forest on Morgan, against a 0.005 spread when the GCN is retrained with three seeds. It still comes from one split, with no confidence intervals.
- **Representation is not the only thing that differs.** The GCN is one network sharing its layers across all 12 assays, while Phase 1 trains 12 independent models per feature set. This is a comparison of two pipelines, not of two kinds of mathematics. The obvious explanation — that sparse assays borrow from common ones — is **not** well supported by our own numbers: the gain over the best fingerprint model correlates only weakly with how many training actives an assay has (Pearson −0.27; +0.028 mean gain on the six rarest assays against +0.021 on the six commonest), and the two largest gains, SR-HSE and SR-MMP, are on assays with 272 and 698 training actives. We ran no ablation, so the mechanism is unexplained.
- **Hand-made descriptors are no longer ahead by much.** Random Forest on morgan + descriptors reaches 0.764 against the GCN's 0.756, a gap of 0.008 that one split cannot resolve. The honest summary: given only the structure the graph model wins, and once the trees are handed 12 physicochemical properties the two are level.
- **No model wins everywhere,** in either phase. Among the fingerprint models alone, Logistic Regression takes the highest ROC-AUC on 3 of the 12 assays with Morgan features; with morgan + descriptors it leads on none (Random Forest 8, XGBoost 4).
- NR-AR and NR-AR-LBD have only 14 and 12 test actives, so their scores are noisy and should not be over-read, whichever model wins them.

More tables and the full per-assay results, including morgan + descriptors: [results/README.md](results/README.md).

Figures:
- EDA: [missing labels](results/figures/eda_missing_labels.png) · [actives vs inactives](results/figures/eda_active_vs_inactive.png) · [split sizes](results/figures/eda_split_sizes.png) · [active rate per split](results/figures/eda_split_active_rate.png)
- Models: [ROC-AUC per assay](results/figures/morgan_roc_auc_by_endpoint.png) · [validation heatmap](results/figures/validation_roc_auc_heatmap.png) · [class imbalance](results/figures/class_imbalance.png)
- GCN: [GCN vs the fingerprint models](results/figures/gnn_vs_aml_roc_auc.png) · [training curve](results/figures/gnn_training_curve.png)

## 11. Website (ToxiLab)

**Live demo:** [ToxiLab](https://toxilab.man9876tr.workers.dev/)

`app/` contains a website for presenting the project:
- a **results dashboard** showing the dataset and the model comparison, including the GCN in the structure-only view
- a small **3D lab simulation** where you test molecules: pick a vial from the shelf, or type any SMILES at the analyzer, and get the 12 assay probabilities

**All four models run inside the visitor's browser**, with RDKit compiled to WebAssembly reproducing the same cleaning step. The three fingerprint models read the Morgan bits; the GCN rebuilds the molecular graph and runs its own forward pass from a 0.3 MB weight file. Nothing is sent to a server. A test checks them against the Python models on all 1,542 validation and test molecules (55,512 predictions, largest difference 4×10⁻⁷). Because the site is static, it can be hosted for free (e.g. Cloudflare Pages).
```
cd app && npm install && npm run dev      # http://localhost:5173
```
Details, tests and hosting steps: [app/README.md](app/README.md).

## 12. Team and contributions

| Member | Responsibility | Main files |
| --- | --- | --- |
| **Khushi** | Data loading and inspection, SMILES validation and standardisation, duplicate and conflicting-label audit, exploratory data analysis | `notebooks/01_…`, `data/`, EDA figures |
| **Riya Yadav** | Data cleaning and exploratory analysis, Bemis–Murcko scaffold split and leakage checks, project documentation and the report | `notebooks/01_…`, `data/splits/` |
| **Manpreet Singh** | Morgan fingerprint and molecular descriptor generation, shared feature interfaces, website and deployment | `notebooks/02_…`, `app/`, `README.md` |
| **Avneet Singh** | Model selection and training for Logistic Regression and Random Forest, per-assay hyperparameter search on validation data | `notebooks/02_…`, `notebooks/03_…` |
| **Satvik Prasad** | Model selection and training for XGBoost, per-assay evaluation, model comparison and class-imbalance analysis | `notebooks/03_…`, `results/` |

All five members contributed to interpreting the results and preparing the report and presentation. The table covers Phase 1. **Phase 2** — `notebooks/04_…`, the GCN results in `results/`, the dashboard's structure-only comparison and the graph model running in the lab — was carried out jointly by **Manpreet Singh and Khushi** under the same protocol.

## 13. Limitations and responsible use

- **Acyclic molecules are only in training.** All 1,753 acyclic molecules share the empty scaffold, so the scaffold split puts them all in train. Validation and test contain only ring-containing molecules, so results say nothing about acyclic chemicals. The team kept this frozen split so every member's results stay comparable.
- **One split and one seed, without confidence intervals.** Small differences between models may not be meaningful — the gap between Random Forest and XGBoost on morgan + descriptors is about 0.008 ROC-AUC, and so is the gap between Random Forest on morgan + descriptors and the GCN. A single split cannot resolve either. For the GCN we at least measured the seed noise: 0.005 validation ROC-AUC across three seeds.
- **Few test actives for some assays.** NR-AR has 14 and NR-AR-LBD has 12, so their test scores are noisy.
- **Colab and local runs differ slightly.** Random Forest and XGBoost results differ a little between the Colab run and the re-run used here (see `results/README.md`). This repository uses the re-run consistently.
- **The GCN is one configuration for 12 assays**, while every Phase 1 model is tuned per assay. That is inherent to a multi-task network, but it means the two sides were not given identical tuning budgets.
- **The GCN ignores bond types as edge weights.** A plain Kipf–Welling layer averages over neighbours, so a single and a double bond carry the same message. Bond orders reach it only through two atom-level features. A message-passing network or GIN with edge features would use them directly; that is the obvious next experiment, not a result we can report.
- **The GCN's features were chosen partly for deployment.** It avoids RDKit's hybridisation, which the browser's RDKit cannot reproduce, and uses multiple-bond count and total valence instead. That costs a little accuracy (0.0015 validation ROC-AUC, well inside the seed spread) and buys a model whose predictions are provably identical in the notebook and on the website.
- **Assay activity, not toxicity.** The models predict activity in specific **in-vitro assays**. They are research outputs, not a measurement, a safety assessment or a verdict on human toxicity, and must not be used for regulatory, clinical or medical decisions.

## 14. References

**Dataset and benchmark**
1. R. Huang *et al.*, "Tox21Challenge to build predictive models of nuclear receptor and stress response pathways as mediated by exposure to environmental chemicals and drugs," *Frontiers in Environmental Science*, vol. 3, art. 85, 2016. doi: [10.3389/fenvs.2015.00085](https://doi.org/10.3389/fenvs.2015.00085)
2. Z. Wu *et al.*, "MoleculeNet: a benchmark for molecular machine learning," *Chemical Science*, vol. 9, no. 2, pp. 513–530, 2018. doi: [10.1039/C7SC02664A](https://doi.org/10.1039/C7SC02664A)

**Representations**
3. D. Rogers and M. Hahn, "Extended-connectivity fingerprints," *Journal of Chemical Information and Modeling*, vol. 50, no. 5, pp. 742–754, 2010. doi: [10.1021/ci100050t](https://doi.org/10.1021/ci100050t)
4. G. W. Bemis and M. A. Murcko, "The properties of known drugs. 1. Molecular frameworks," *Journal of Medicinal Chemistry*, vol. 39, no. 15, pp. 2887–2893, 1996. doi: [10.1021/jm9602928](https://doi.org/10.1021/jm9602928)

**Fingerprints versus graphs — the question this project asks**
5. D. Jiang *et al.*, "Could graph neural networks learn better molecular representation for drug discovery? A comparison study of descriptor-based and graph-based models," *Journal of Cheminformatics*, vol. 13, art. 12, 2021. doi: [10.1186/s13321-020-00479-8](https://doi.org/10.1186/s13321-020-00479-8)
6. A. Mayr, G. Klambauer, T. Unterthiner and S. Hochreiter, "DeepTox: toxicity prediction using deep learning," *Frontiers in Environmental Science*, vol. 3, art. 80, 2016. doi: [10.3389/fenvs.2015.00080](https://doi.org/10.3389/fenvs.2015.00080)

**Models (Phase 1) and graph methods (Phase 2)**
7. L. Breiman, "Random forests," *Machine Learning*, vol. 45, no. 1, pp. 5–32, 2001. doi: [10.1023/A:1010933404324](https://doi.org/10.1023/A:1010933404324)
8. T. Chen and C. Guestrin, "XGBoost: a scalable tree boosting system," in *Proc. KDD*, 2016, pp. 785–794. doi: [10.1145/2939672.2939785](https://doi.org/10.1145/2939672.2939785)
9. T. N. Kipf and M. Welling, "Semi-supervised classification with graph convolutional networks," in *Proc. ICLR*, 2017. [arXiv:1609.02907](https://arxiv.org/abs/1609.02907)
10. J. Gilmer *et al.*, "Neural message passing for quantum chemistry," in *Proc. ICML*, 2017. [arXiv:1704.01212](https://arxiv.org/abs/1704.01212)

**Software**
11. F. Pedregosa *et al.*, "Scikit-learn: machine learning in Python," *JMLR*, vol. 12, pp. 2825–2830, 2011.
12. RDKit: open-source cheminformatics. [rdkit.org](https://www.rdkit.org)

## 15. License

MIT — see [LICENSE](LICENSE).
