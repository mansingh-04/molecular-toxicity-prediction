import { LocalModelService } from '@/services/inference/localModelService';
import type { AnalysisService } from './types';

/** All predictions come from the team's trained models, running in the browser (src/services/inference/). */
export const analysisService: AnalysisService = new LocalModelService();

export * from './types';
