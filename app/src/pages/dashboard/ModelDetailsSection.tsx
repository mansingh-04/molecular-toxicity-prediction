import { useEffect, useState } from 'react';
import type { ModelId } from '@/types/analysis';
import { COMPARED_MODELS, fmt, mean, type MetricRow } from './siteData';
import { useInView } from './motion';

/** One decision threshold applied to the test predictions. */
interface ThresholdMetrics {
  threshold: number;
  tp: number; fp: number; tn: number; fn: number;
  accuracy: number | null;
  majorityBaseline: number | null;
  balancedAccuracy: number;
  precision: number;
  recall: number;
  specificity: number;
  f1: number;
}
interface EndpointDetail {
  endpoint: string;
  params: Record<string, string | number | null> | null;
  nTrainObserved: number;
  nTrainPositive: number;
  default: ThresholdMetrics;
  tuned: ThresholdMetrics;
}
interface ModelDetail {
  modelId: ModelId;
  baseParams: Record<string, string> | null;
  grid: Record<string, string[]> | null;
  seed: number;
  selectionMetric: string;
  nFeatures: number;
  versions: Record<string, string | null>;
  endpoints: EndpointDetail[];
}

const pct = (v: number | null | undefined) => (typeof v === 'number' ? `${(v * 100).toFixed(1)}%` : '—');
const avg = (rows: EndpointDetail[], pick: (e: EndpointDetail) => number | null) => mean(rows.map(pick));

/**
 * Model details for the presentation: how each model was configured, and what its predictions look
 * like at a decision threshold (accuracy, precision, recall, F1, confusion matrix).
 * Thresholds are tuned on validation predictions and applied to test, so test data never influences them.
 */
export function ModelDetailsSection({ rows }: { rows: MetricRow[] }) {
  const [data, setData] = useState<{ models: ModelDetail[] }>();
  const [error, setError] = useState<string>();
  const [active, setActive] = useState<ModelId>('rf');
  const [tuned, setTuned] = useState(true);
  const { ref, inView } = useInView<HTMLDivElement>();

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/model_details.json`)
      .then((r) => r.json() as Promise<{ models: ModelDetail[] }>)
      .then(setData)
      .catch((e) => setError(String(e)));
  }, []);

  if (error) return <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">Could not load the model details: {error}</p>;
  if (!data) return <div className="d-card p-6"><div className="shimmer h-4 w-2/3 rounded" /></div>;

  const model = data.models.find((m) => m.modelId === active) ?? data.models[0];
  const info = COMPARED_MODELS.find((m) => m.id === model.modelId)!;
  const at = (e: EndpointDetail) => (tuned ? e.tuned : e.default);
  const rocAuc = mean(rows.filter((r) => r.model === model.modelId && r.split === 'test' && r.featureSet === 'morgan').map((r) => r.rocAuc));
  const prAuc = mean(rows.filter((r) => r.model === model.modelId && r.split === 'test' && r.featureSet === 'morgan').map((r) => r.prAuc));
  const accuracy = avg(model.endpoints, (e) => at(e).accuracy);
  const baseline = avg(model.endpoints, (e) => e.default.majorityBaseline);
  const beatsBaseline = accuracy !== undefined && baseline !== undefined && accuracy > baseline;

  return (
    <div ref={ref} className={`space-y-5 ${inView ? 'is-visible' : ''}`}>
      {/* model picker + threshold switch */}
      <div className="d-card flex flex-wrap items-center gap-x-6 gap-y-3 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-medium text-slate-400">Model</span>
          <div className="d-seg" role="group" aria-label="Model">
            {data.models.map((m) => {
              const meta = COMPARED_MODELS.find((c) => c.id === m.modelId)!;
              return <button key={m.modelId} className="d-seg-btn" aria-pressed={active === m.modelId} onClick={() => setActive(m.modelId)}>{meta.short}</button>;
            })}
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-medium text-slate-400">Decision threshold</span>
          <div className="d-seg" role="group" aria-label="Decision threshold">
            <button className="d-seg-btn" aria-pressed={tuned} onClick={() => setTuned(true)}>Tuned on validation</button>
            <button className="d-seg-btn" aria-pressed={!tuned} onClick={() => setTuned(false)}>Default 0.50</button>
          </div>
        </div>
      </div>

      {/* configuration card */}
      <div className="d-card p-6">
        <div className="flex items-center gap-2.5">
          <span className="h-3 w-3 rounded-full" style={{ background: info.color }} />
          <h3 className="text-base font-semibold text-slate-900">{info.name}</h3>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">{info.family}</span>
        </div>
        <dl className="mt-4 grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Input features">{model.nFeatures.toLocaleString('en-US')} Morgan bits <span className="text-slate-400">(radius 2)</span></Field>
          <Field label="Models trained">12 <span className="text-slate-400">one per assay</span></Field>
          <Field label="Random seed">{model.seed}</Field>
          <Field label="Chosen on">validation {model.selectionMetric === 'roc_auc' ? 'ROC-AUC' : model.selectionMetric}</Field>
          {model.baseParams && (
            <Field label="Fixed settings" wide>
              <span className="font-mono text-xs text-slate-600">{Object.entries(model.baseParams).map(([k, v]) => `${k}=${v}`).join(' · ')}</span>
            </Field>
          )}
          {model.grid && (
            <Field label="Tuned per assay" wide>
              <span className="font-mono text-xs text-slate-600">{Object.entries(model.grid).map(([k, v]) => `${k} ∈ {${v.join(', ')}}`).join(' · ')}</span>
            </Field>
          )}
        </dl>
      </div>

      {/* headline numbers */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Test ROC-AUC" value={fmt(rocAuc)} note="ranking quality · 0.5 = chance" good />
        <Tile label="Test PR-AUC" value={fmt(prAuc)} note="precision-recall · focuses on actives" good />
        <Tile label="Balanced accuracy" value={pct(avg(model.endpoints, (e) => at(e).balancedAccuracy))} note="average of recall and specificity" good />
        <Tile label="F1 score" value={pct(avg(model.endpoints, (e) => at(e).f1))} note="balance of precision and recall" good />
      </div>

      {/* the accuracy caveat, stated plainly */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5">
        <h4 className="text-sm font-semibold text-amber-900">Why we do not headline accuracy</h4>
        <div className="mt-3 grid gap-4 sm:grid-cols-3">
          <div><div className="d-num text-2xl">{pct(accuracy)}</div><div className="text-xs text-slate-600">this model&rsquo;s accuracy</div></div>
          <div><div className="d-num text-2xl">{pct(baseline)}</div><div className="text-xs text-slate-600">&ldquo;always inactive&rdquo; baseline</div></div>
          <div><div className={`d-num text-2xl ${beatsBaseline ? '!text-emerald-700' : '!text-amber-700'}`}>{beatsBaseline ? 'above' : 'below'}</div><div className="text-xs text-slate-600">accuracy vs that baseline</div></div>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-amber-900/90">
          Only 3–16% of molecules are active, so a model that answers &ldquo;inactive&rdquo; every time already scores about {pct(baseline)}.
          Accuracy therefore cannot separate a useful model from a lazy one, which is why this project reports
          <b> ROC-AUC</b> and <b>PR-AUC</b>, and why balanced accuracy, precision, recall and F1 are shown above instead.
        </p>
      </div>

      {/* per-assay table */}
      <div className="d-card p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h4 className="text-sm font-semibold text-slate-900">Per-assay behaviour on the test set</h4>
          <span className="text-xs text-slate-500">{tuned ? 'threshold tuned per assay on validation data' : 'fixed threshold of 0.50'}</span>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr>
                <th className="d-th">Assay</th><th className="d-th">Chosen settings</th><th className="d-th">Thresh.</th>
                <th className="d-th" title="true positives / false positives / true negatives / false negatives">TP / FP / TN / FN</th>
                <th className="d-th" title="share of actives the model finds">Recall</th>
                <th className="d-th" title="share of flagged molecules that really are active">Precision</th>
                <th className="d-th">F1</th><th className="d-th">Balanced acc.</th>
              </tr>
            </thead>
            <tbody>
              {model.endpoints.map((e) => {
                const m = at(e);
                return (
                  <tr key={e.endpoint} className="border-t border-slate-100 hover:bg-slate-50/80">
                    <td className="py-2 pr-4"><span className="font-mono text-xs text-slate-900">{e.endpoint}</span></td>
                    <td className="py-2 pr-4 font-mono text-[11px] text-slate-500">{e.params ? Object.entries(e.params).map(([k, v]) => `${k}=${v}`).join(', ') : '—'}</td>
                    <td className="py-2 pr-4 font-mono text-xs text-slate-500">{m.threshold.toFixed(2)}</td>
                    <td className="py-2 pr-4 font-mono text-xs"><span className="text-emerald-700">{m.tp}</span> / <span className="text-amber-700">{m.fp}</span> / <span className="text-slate-500">{m.tn}</span> / <span className="text-red-700">{m.fn}</span></td>
                    <td className="py-2 pr-4 font-mono text-xs text-slate-900">{pct(m.recall)}</td>
                    <td className="py-2 pr-4 font-mono text-xs text-slate-900">{pct(m.precision)}</td>
                    <td className="py-2 pr-4 font-mono text-xs text-slate-900">{pct(m.f1)}</td>
                    <td className="py-2 font-mono text-xs text-slate-900">{pct(m.balancedAccuracy)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-slate-500">
          <b className="text-emerald-700">TP</b> actives correctly flagged · <b className="text-amber-700">FP</b> inactives wrongly flagged ·
          <b className="text-slate-600"> TN</b> inactives correctly passed · <b className="text-red-700">FN</b> actives missed.
          Lowering the threshold finds more actives (higher recall) at the cost of more false alarms (lower precision).
          Library versions: {Object.entries(model.versions).filter(([, v]) => v).map(([k, v]) => `${k} ${v}`).join(', ')}.
        </p>
      </div>
    </div>
  );
}

function Field({ label, children, wide = false }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? 'sm:col-span-2' : undefined}>
      <dt className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400">{label}</dt>
      <dd className="mt-1 text-slate-800">{children}</dd>
    </div>
  );
}

function Tile({ label, value, note }: { label: string; value: string; note: string; good?: boolean }) {
  return (
    <div className="d-card p-5">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className="d-num mt-2 text-[1.9rem] leading-none">{value}</div>
      <div className="mt-1.5 text-[11px] text-slate-400">{note}</div>
    </div>
  );
}
