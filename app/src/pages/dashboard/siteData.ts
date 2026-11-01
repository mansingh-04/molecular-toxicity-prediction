import { useEffect, useState } from 'react';
import type { ModelId } from '@/types/analysis';
import { loadMetrics } from '@/services/inference/localModelService';

/** Member 1's preprocessing report (public/data/dataset.json). */
export interface DatasetReport {
  raw_rows: number;
  invalid_smiles_removed: number;
  multi_fragment_smiles: number;
  duplicate_groups: number;
  duplicate_rows_involved: number;
  duplicate_label_conflicts_set_to_nan: number;
  clean_rows: number;
  n_unique_scaffolds: number;
  acyclic_molecules_empty_scaffold: number;
  split_sizes: Record<'train' | 'val' | 'test', number>;
  split_active_counts: Record<'train' | 'val' | 'test', Record<string, number>>;
  split_labelled_counts: Record<'train' | 'val' | 'test', Record<string, number>>;
  clean_label_stats: { assay: string; active: number; inactive: number; labelled: number; missing: number; missing_pct: number; active_pct: number }[];
}

export interface MetricRow {
  model: ModelId;
  featureSet: string;
  split: string;
  endpoint: string;
  rocAuc: number | null;
  prAuc: number | null;
  nObserved: number;
  nPositive: number;
  nNegative: number;
}

/**
 * The models compared on the page. The GNN slot is shown as pending until its metrics are added to metrics.json.
 * Colours: validated categorical palette for a white surface (fixed order, colour-blind safe).
 */
export const COMPARED_MODELS: { id: ModelId; name: string; short: string; family: 'AML' | 'DL'; color: string }[] = [
  { id: 'logreg', name: 'Logistic Regression', short: 'LR', family: 'AML', color: '#2a78d6' },
  { id: 'rf', name: 'Random Forest', short: 'RF', family: 'AML', color: '#eb6834' },
  { id: 'xgboost', name: 'XGBoost', short: 'XGB', family: 'AML', color: '#1baf7a' },
  { id: 'gnn', name: 'Graph Neural Network', short: 'GCN', family: 'DL', color: '#6250d6' },
];

export function useSiteData() {
  const [data, setData] = useState<{ dataset: DatasetReport; metrics: MetricRow[] }>();
  const [error, setError] = useState<string>();
  useEffect(() => {
    Promise.all([fetch(`${import.meta.env.BASE_URL}data/dataset.json`).then((r) => r.json() as Promise<DatasetReport>), loadMetrics()])
      .then(([dataset, metrics]) => setData({ dataset, metrics: metrics.rows as MetricRow[] }))
      .catch((e) => setError(String(e)));
  }, []);
  return { data, error };
}

export const mean = (xs: (number | null | undefined)[]) => {
  const v = xs.filter((x): x is number => typeof x === 'number');
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : undefined;
};
export const fmt = (v: number | null | undefined, d = 3) => (typeof v === 'number' ? v.toFixed(d) : '—');
