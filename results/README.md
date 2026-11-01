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

Source: [metrics/summary.csv](metrics/summary.csv), plus [metrics/lr_summary.csv](metrics/lr_summary.csv) for the training split.

## Test ROC-AUC per assay (Morgan fingerprints only, the main AML vs GNN setting)

| Assay | Test labels (obs / active) | LR | RF | XGBoost |
|---|---|---|---|---|
| NR-AR | 691 / 14 | 0.514 | **0.552** | 0.509 |
| NR-AR-LBD | 598 / 12 | 0.719 | **0.758** | 0.754 |
| NR-AhR | 582 / 110 | 0.806 | **0.811** | 0.772 |
| NR-Aromatase | 490 / 53 | **0.785** | 0.751 | 0.744 |
| NR-ER | 537 / 72 | 0.641 | 0.664 | **0.683** |
| NR-ER-LBD | 631 / 24 | 0.551 | 0.637 | **0.638** |
| NR-PPAR-gamma | 559 / 32 | 0.750 | 0.747 | **0.797** |
| SR-ARE | 497 / 120 | **0.728** | 0.708 | 0.666 |
| SR-ATAD5 | 645 / 33 | 0.725 | **0.797** | 0.778 |
| SR-HSE | 605 / 55 | 0.731 | 0.716 | **0.739** |
| SR-MMP | 465 / 89 | **0.774** | 0.746 | 0.751 |
| SR-p53 | 618 / 75 | 0.694 | 0.709 | **0.721** |

Bold marks the best model for that assay. NR-AR and NR-AR-LBD have only 14 and 12 test actives, so their scores are noisy.
Source: [metrics/all_models_metrics.csv](metrics/all_models_metrics.csv).

## Files

| Folder | Content |
| --- | --- |
| `metrics/` | `lr_metrics.csv`, `rf_metrics.csv`, `xgb_metrics.csv`: one row per feature set × assay × split, with ROC-AUC, PR-AUC, label counts and chosen hyperparameters. `all_models_metrics.csv` and `summary.csv` hold validation and test results for all models. |
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

## Not available yet

GNN (Member 4) results. Once they exist, add them here using the same metrics, split and file format (`model, feature_set, endpoint, split, n_observed, n_positive, n_negative, roc_auc, pr_auc`).
