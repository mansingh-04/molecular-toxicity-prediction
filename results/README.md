# Results

All numbers come from the run of notebooks 02 and 03 that is saved in `notebooks/`. That run used the frozen split in `data/splits/`, seed 42, and the library versions in `requirements.txt`. Every value is computed from the files in this folder; nothing is typed in by hand.

Rules behind every number:
- **Missing labels are excluded.** Each assay is scored only on molecules with a known label for that assay.
- **ROC-AUC** is scikit-learn's `roc_auc_score`. **PR-AUC** is average precision (`average_precision_score`). Both are left empty if only one class is present.
- **Hyperparameters were chosen on validation ROC-AUC.** The test set was scored once, after every choice was fixed. The tuning logs contain validation scores only.

## Mean over the 12 assays

| Model | Features | Val ROC-AUC | Val PR-AUC | Test ROC-AUC | Test PR-AUC |
|---|---|---|---|---|---|
| Logistic Regression | Morgan | 0.724 | 0.323 | 0.702 | 0.277 |
| Logistic Regression | Descriptors | 0.723 | 0.222 | 0.666 | 0.219 |
| Logistic Regression | Morgan + descriptors | 0.749 | 0.297 | 0.739 | 0.269 |
| Random Forest | Morgan | 0.750 | 0.382 | 0.716 | 0.317 |
| Random Forest | Descriptors | 0.743 | 0.333 | 0.736 | 0.301 |
| Random Forest | Morgan + descriptors | 0.785 | 0.407 | 0.764 | 0.370 |
| XGBoost | Morgan | 0.737 | 0.349 | 0.712 | 0.281 |
| XGBoost | Descriptors | 0.749 | 0.337 | 0.710 | 0.269 |
| XGBoost | Morgan + descriptors | 0.774 | 0.391 | 0.755 | 0.354 |
| GCN | Molecular graph | 0.767 | 0.392 | 0.756 | 0.359 |

Source: [metrics/summary.csv](metrics/summary.csv), plus [metrics/lr_summary.csv](metrics/lr_summary.csv) for the training split.

The GCN row belongs with the three **Morgan** rows: those are the models that also see nothing but the structure. Against them it is ahead on both metrics by a clear margin. Random Forest on morgan + descriptors (0.764 / 0.370) is still nominally first on ROC-AUC, by 0.008 — about the GCN's seed noise — while being given 12 physicochemical properties the GCN never sees.

## Test ROC-AUC per assay, structure only (Morgan fingerprints, and the graph for the GCN)

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

Bold marks the best model for that assay: GCN 9, LR 1, RF 1, XGBoost 1 (SR-ARE is a tie to three decimals: 0.72794 for LR against 0.72770 for the GCN). NR-AR and NR-AR-LBD have only 14 and 12 test actives, so their scores are noisy.
Source: [metrics/all_models_metrics.csv](metrics/all_models_metrics.csv).

## The GCN (notebook 04)

One multi-task network for all 12 assays: 3 graph-convolution layers of width 128, mean + max pooling, 78,220 parameters, trained on the molecular graph with a masked loss. Chosen from a 16-point grid on validation ROC-AUC (learning rate 5e-4, no class weighting), stopped at epoch 56 of 81 by validation score, seed 42.

Its 77 atom features deliberately exclude RDKit's hybridisation, which the browser's RDKit cannot reproduce, so the same model runs on the website and its predictions there are provably identical (`app/src/services/inference/gcnParity.test.ts`). Notebook 04 measures what that costs: 0.0015 validation ROC-AUC, smaller than the seed spread below.

Because a neural network depends on its initialisation far more than a forest does, the chosen configuration was retrained with seeds 42, 43 and 44 and scored on **validation only**: mean 0.7638, spread 0.0048 ([metrics/gnn_seed_stability.csv](metrics/gnn_seed_stability.csv)). Read every GCN comparison at that resolution. The test split was still scored exactly once, with the seed-42 model.

Two differences from Phase 1 that are part of the method, not oversights:
- **One configuration for 12 assays.** A multi-task network shares its layers across the assays, so it cannot be tuned per assay the way the 108 Phase 1 classifiers were.
- **Multi-task sharing.** One network learns all 12 assays together, which no Phase 1 model does. The tempting story is that sparse assays borrow from common ones, but our numbers barely support it: the gain over the best fingerprint model correlates only −0.27 with an assay's training actives, and the two largest gains (SR-HSE, SR-MMP) are on assays with 272 and 698 actives. Sharing may still help; this split does not show it.

## Files

| Folder | Content |
| --- | --- |
| `metrics/` | `lr_metrics.csv`, `rf_metrics.csv`, `xgb_metrics.csv`: one row per feature set × assay × split, with ROC-AUC, PR-AUC, label counts and chosen hyperparameters. `gnn_metrics.csv` is the same for the GCN, with `feature_set` = `graph` and one row per assay × split. `all_models_metrics.csv` and `summary.csv` hold validation and test results for all four models. |
| `metrics/gnn_seed_stability.csv` | The chosen GCN configuration retrained with three seeds, scored on validation only |
| `metrics/tuning/` | Every hyperparameter setting tried, with its validation scores |
| `tables/` | The best model per assay chosen on validation, its test result, and how class imbalance relates to performance |
| `figures/` | EDA plots (`eda_*.png`, from notebook 01) and model-comparison plots (from notebook 03) |
| `predictions/` | Validation and test probabilities for every model, feature set, molecule and assay (`y_true` is empty where the label is missing) |

## Figures

| Figure | Shows |
| --- | --- |
| [figures/eda_missing_labels.png](figures/eda_missing_labels.png) | Share of missing labels per assay |
| [figures/eda_active_vs_inactive.png](figures/eda_active_vs_inactive.png) | Active vs inactive counts per assay (log scale) |
| [figures/eda_split_sizes.png](figures/eda_split_sizes.png) | Train / validation / test sizes |
| [figures/eda_split_active_rate.png](figures/eda_split_active_rate.png) | Share of actives per assay in each split |
| [figures/morgan_roc_auc_by_endpoint.png](figures/morgan_roc_auc_by_endpoint.png) | ROC-AUC per assay for LR, RF and XGBoost on Morgan fingerprints, validation and test |
| [figures/validation_roc_auc_heatmap.png](figures/validation_roc_auc_heatmap.png) | Validation ROC-AUC for every model and feature set |
| [figures/class_imbalance.png](figures/class_imbalance.png) | PR-AUC vs share of actives, and ROC-AUC vs number of training actives |
| [figures/gnn_vs_aml_roc_auc.png](figures/gnn_vs_aml_roc_auc.png) | Test ROC-AUC per assay: the GCN against LR, RF and XGBoost on Morgan fingerprints |
| [figures/gnn_training_curve.png](figures/gnn_training_curve.png) | The GCN's masked training loss and validation score per epoch, with the selected epoch marked |

## Reproducibility: the original Colab run

Members 2 and 3 first ran their notebooks on Google Colab, but the trained model files from that run were not kept. The notebooks were therefore re-run unchanged on Member 1's split, and **this repository uses that re-run throughout**. Comparing the two runs shows the pipeline reproduces: Logistic Regression matched the Colab results exactly, while Random Forest and XGBoost differ slightly because tree training depends on the CPU and the library build.

| Model | Features | Test ROC-AUC (Colab run) | Test ROC-AUC (this repo) |
|---|---|---|---|
| Logistic Regression | Morgan | 0.702 | 0.702 |
| Logistic Regression | Descriptors | 0.666 | 0.666 |
| Logistic Regression | Morgan + descriptors | 0.739 | 0.739 |
| Random Forest | Morgan | 0.712 | 0.716 |
| Random Forest | Descriptors | 0.735 | 0.736 |
| Random Forest | Morgan + descriptors | 0.761 | 0.764 |
| XGBoost | Morgan | 0.716 | 0.712 |
| XGBoost | Descriptors | 0.718 | 0.710 |
| XGBoost | Morgan + descriptors | 0.753 | 0.755 |

The re-run's trained models are the ones in `models/` and the ones the website in `app/` uses. **Use these numbers in the report and the presentation.**

The GCN was trained once, here, on this same split, so it has no Colab/local discrepancy to report. Its own uncertainty is the seed spread above (0.005 validation ROC-AUC over three seeds).

## Still open

- **The presentation PDF lags the deck.** `presentation/Tox21_Phase1.pptx` carries the GCN slides; the PDF in `Presentation/` is exported by hand from PowerPoint and must be refreshed after a rebuild. The report in `Report/` is current.
- **Bond features.** The GCN uses the plain Kipf–Welling layer, which ignores bond order. An MPNN or GIN with edge features is the natural next experiment.
