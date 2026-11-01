import type { FeatureSet, ModelId, ModelInfo, ModelMetadata, Tox21Endpoint } from '@/types/analysis';

/** The 12 binary assay endpoints of the Tox21 Data Challenge. */
export const TOX21_ENDPOINTS: Tox21Endpoint[] = [
  { id: 'NR-AR', name: 'Androgen receptor (full length)', panel: 'Nuclear Receptor', description: 'Androgen receptor agonism, cell-based full-length receptor assay.' },
  { id: 'NR-AR-LBD', name: 'Androgen receptor (ligand-binding domain)', panel: 'Nuclear Receptor', description: 'Androgen receptor agonism via the ligand-binding domain.' },
  { id: 'NR-AhR', name: 'Aryl hydrocarbon receptor', panel: 'Nuclear Receptor', description: 'Activation of the aryl hydrocarbon receptor.' },
  { id: 'NR-Aromatase', name: 'Aromatase', panel: 'Nuclear Receptor', description: 'Inhibition of aromatase (CYP19A1).' },
  { id: 'NR-ER', name: 'Estrogen receptor α (full length)', panel: 'Nuclear Receptor', description: 'Estrogen receptor alpha agonism, full-length receptor.' },
  { id: 'NR-ER-LBD', name: 'Estrogen receptor α (ligand-binding domain)', panel: 'Nuclear Receptor', description: 'Estrogen receptor alpha agonism via the ligand-binding domain.' },
  { id: 'NR-PPAR-gamma', name: 'PPAR-γ', panel: 'Nuclear Receptor', description: 'Peroxisome proliferator-activated receptor gamma agonism.' },
  { id: 'SR-ARE', name: 'Antioxidant response element', panel: 'Stress Response', description: 'Activation of the Nrf2/antioxidant response element pathway.' },
  { id: 'SR-ATAD5', name: 'ATAD5 (genotoxicity)', panel: 'Stress Response', description: 'ATAD5 induction, a marker of genotoxic stress.' },
  { id: 'SR-HSE', name: 'Heat shock factor response element', panel: 'Stress Response', description: 'Activation of the heat shock response.' },
  { id: 'SR-MMP', name: 'Mitochondrial membrane potential', panel: 'Stress Response', description: 'Disruption of mitochondrial membrane potential.' },
  { id: 'SR-p53', name: 'p53 response', panel: 'Stress Response', description: 'Activation of the p53 DNA-damage response.' },
];

export const MODELS: ModelInfo[] = [
  { id: 'logreg', name: 'Logistic Regression', short: 'LR', family: 'aml', featurization: 'Morgan fingerprint and/or 12 RDKit descriptors', description: 'Linear baseline; one classifier per endpoint (Member 2).' },
  { id: 'rf', name: 'Random Forest', short: 'RF', family: 'aml', featurization: 'Morgan fingerprint and/or 12 RDKit descriptors', description: 'Bagged decision-tree ensemble; one classifier per endpoint (Member 3).' },
  { id: 'xgboost', name: 'XGBoost', short: 'XGB', family: 'aml', featurization: 'Morgan fingerprint and/or 12 RDKit descriptors', description: 'Gradient-boosted trees; one classifier per endpoint (Member 3).' },
  { id: 'gnn', name: 'Graph Neural Network', short: 'GNN', family: 'dl', featurization: 'Molecular graph (atoms = nodes, bonds = edges)', description: 'Graph model over 12 endpoints (Member 4, not trained yet).' },
];

/** AML input feature sets, in the same order and naming as the training notebooks. */
export const FEATURE_SETS: { id: FeatureSet; label: string; desc: string }[] = [
  { id: 'morgan', label: 'Morgan fingerprints', desc: '2048 bits, radius 2. The main setting for the AML vs GNN comparison.' },
  { id: 'morgan+descriptors', label: 'Morgan + descriptors', desc: 'Fingerprint bits plus 12 RDKit descriptors.' },
  { id: 'descriptors', label: 'Descriptors only', desc: '12 RDKit descriptors (weight, LogP, TPSA, …).' },
];

export const featureSetLabel = (id?: FeatureSet) => FEATURE_SETS.find((f) => f.id === (id ?? 'morgan'))?.label ?? id ?? 'Morgan fingerprints';

/** Is this model loaded on the server for this feature set? Returns a reason when it is not. */
export function modelAvailability(modelStatus: { state: string; models: ModelMetadata[] }, modelId: ModelId, featureSet: FeatureSet): { available: boolean; reason?: string } {
  if (modelStatus.state === 'loading') return { available: false, reason: 'Checking the model server…' };
  if (modelStatus.state === 'error') return { available: false, reason: 'Model server offline.' };
  const meta = modelStatus.models.find((m) => m.modelId === modelId);
  if (!meta) return { available: false, reason: 'Not reported by the model server.' };
  if (meta.family === 'dl' || modelId === 'gnn') return { available: !!meta.available, reason: meta.available ? undefined : meta.message ?? 'Not trained yet.' };
  const fs = meta.featureSets?.find((f) => f.id === featureSet);
  if (fs?.available) return { available: true };
  return { available: false, reason: fs?.message ?? meta.message ?? 'Model files not installed.' };
}

export const modelsForMode = (mode: 'aml' | 'dl' | 'comparison') =>
  MODELS.filter((m) => mode === 'comparison' || m.family === mode);
