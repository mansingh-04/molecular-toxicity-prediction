import type { AnalysisResult, EvaluationRow, ModelId } from '@/types/analysis';
import { MODELS, TOX21_ENDPOINTS } from '@/data/tox21';

/** Held-out metric for one model/endpoint on the result's feature set, if the server reported it. */
export function heldOutMetric(result: AnalysisResult, modelId: ModelId, endpointId: string, split: 'val' | 'test'): EvaluationRow | undefined {
  const meta = result.provenance.modelMetadata?.find((m) => m.modelId === modelId);
  return meta?.evaluation?.find((e) => e.endpointId === endpointId && e.split === split && (e.featureSet ?? 'morgan') === result.featureSet);
}

const csvCell = (v: unknown) => {
  if (v === undefined || v === null) return '';
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/**
 * One row per (model, endpoint). The GNN results can later be exported with the same columns,
 * so AML and DL predictions can be compared in one table.
 */
export function resultToCsv(result: AnalysisResult, compoundName?: string): string {
  const header = ['result_id', 'compound', 'input_smiles', 'canonical_smiles', 'model', 'family', 'feature_set', 'endpoint', 'panel',
    'status', 'probability', 'train_base_rate', 'threshold', 'label', 'test_roc_auc', 'test_pr_auc', 'message', 'completed_at'];
  const rows = result.predictions.map((p) => {
    const model = MODELS.find((m) => m.id === p.modelId);
    const ep = TOX21_ENDPOINTS.find((e) => e.id === p.endpointId);
    const test = heldOutMetric(result, p.modelId, p.endpointId, 'test');
    return [result.id, compoundName ?? '', result.smiles, result.canonicalSmiles ?? '', model?.name ?? p.modelId, model?.family ?? '',
      p.featureSet ?? result.featureSet, p.endpointId, ep?.panel ?? '', p.status, p.score, p.baseRate, p.threshold, p.label,
      test?.rocAuc, test?.prAuc, p.message, result.completedAt];
  });
  return [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\n');
}

export function downloadText(fileName: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadResult(result: AnalysisResult, format: 'csv' | 'json', compoundName?: string) {
  const base = `toxilab_${(compoundName ?? 'compound').replace(/[^\w-]+/g, '_')}_${result.featureSet}_${result.id}`;
  if (format === 'csv') downloadText(`${base}.csv`, resultToCsv(result, compoundName), 'text/csv');
  else downloadText(`${base}.json`, JSON.stringify(result, null, 2), 'application/json');
}
