export type ModelId = 'logreg' | 'rf' | 'xgboost' | 'gnn';
export type ModelFamily = 'aml' | 'dl';
export type AnalysisMode = 'aml' | 'dl' | 'comparison';
/** Input features for the AML models. 'morgan' is the main AML-vs-GNN comparison setting. */
export type FeatureSet = 'morgan' | 'descriptors' | 'morgan+descriptors';

export interface ModelInfo {
  id: ModelId;
  name: string;
  short: string;
  family: ModelFamily;
  featurization: string;
  description: string;
}

export interface Tox21Endpoint {
  id: string;
  name: string;
  panel: 'Nuclear Receptor' | 'Stress Response';
  description: string;
}

export type PredictionStatus = 'ok' | 'unavailable' | 'unsupported' | 'error';

export interface EndpointPrediction {
  endpointId: string;
  modelId: ModelId;
  featureSet?: FeatureSet;
  status: PredictionStatus;
  /** Predicted probability (0–1) that the compound is active in this assay. */
  score?: number;
  /** Share of actives among this endpoint's training labels, so a score can be read against the base rate. */
  baseRate?: number;
  /** Binary call derived from score and threshold, where the model supports it. */
  label?: 0 | 1;
  threshold?: number;
  uncertainty?: { lower: number; upper: number } | { std: number };
  message?: string;
}

/** One held-out evaluation row from the team's metrics files (dataset-level, never per-compound). */
export interface EvaluationRow {
  endpointId: string;
  featureSet?: FeatureSet;
  split: string;
  /** null = undefined (only one class in the evaluated labels). */
  rocAuc?: number | null;
  prAuc?: number | null;
  nObserved?: number;
  nPositive?: number;
  nNegative?: number;
}

/** Metadata the model server reports for each model. */
export interface ModelMetadata {
  modelId: ModelId;
  name?: string;
  family?: ModelFamily;
  version: string;
  trainedOn?: string;
  /** True if trained model files are loaded on the server for at least one feature set. */
  available?: boolean;
  featureSets?: { id: FeatureSet; available: boolean; message?: string | null }[];
  message?: string | null;
  evaluation?: EvaluationRow[];
}

export interface AnalysisProvenance {
  kind: 'model';
  serviceName: string;
  disclaimer: string;
  modelMetadata?: ModelMetadata[];
}

export interface PipelineLogEntry {
  at: number;
  message: string;
  /** 'real' = a computation reported by the model server; 'info' = status message. */
  kind: 'real' | 'info' | 'error';
}

export interface AnalysisInput {
  compoundId: string;
  smiles: string;
  canonicalSmiles?: string;
}

export interface AnalysisConfiguration {
  mode: AnalysisMode;
  models: ModelId[];
  featureSet: FeatureSet;
}

export interface AnalysisResult {
  id: string;
  experimentId: string;
  compoundId: string;
  smiles: string;
  mode: AnalysisMode;
  models: ModelId[];
  featureSet: FeatureSet;
  /** Display name for home-page predictions (lab runs use the compound record). */
  label?: string;
  /** Structure as standardised by the server (largest fragment, canonical SMILES). */
  canonicalSmiles?: string;
  inputNotes?: string[];
  /** Set when this exact structure is in the Tox21 dataset: its measured labels and split. */
  knownRecord?: { molId: string; split: 'train' | 'val' | 'test'; labels: Record<string, number | null> } | null;
  predictions: EndpointPrediction[];
  provenance: AnalysisProvenance;
  log: PipelineLogEntry[];
  startedAt: string;
  completedAt: string;
}

export interface AnalysisProgress {
  fraction: number;
  message: string;
  entry?: PipelineLogEntry;
}
