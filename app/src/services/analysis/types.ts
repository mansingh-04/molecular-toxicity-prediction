import type { AnalysisConfiguration, AnalysisInput, AnalysisProgress, AnalysisResult, ModelMetadata } from '@/types/analysis';

export interface AnalysisServiceInfo {
  name: string;
  description: string;
  baseUrl: string;
}

export interface ServerHealth {
  status: string;
  rdkitVersion: string;
  /** modelId -> feature sets whose trained files are loaded */
  loadedModels: Record<string, string[]>;
  metricsLoaded: boolean;
  threshold: number | null;
}

export interface RunOptions {
  experimentId: string;
  onProgress?: (p: AnalysisProgress) => void;
  signal?: AbortSignal;
}

/** Analysis (inference) contract. The analyzer UI only depends on this interface. */
export interface AnalysisService {
  info(): AnalysisServiceInfo;
  health(): Promise<ServerHealth>;
  listModels(): Promise<ModelMetadata[]>;
  runAnalysis(input: AnalysisInput, configuration: AnalysisConfiguration, options: RunOptions): Promise<AnalysisResult>;
}

export class AnalysisError extends Error {}
