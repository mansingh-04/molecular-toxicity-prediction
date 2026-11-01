import { Fragment, useState } from 'react';
import type { AnalysisResult, EndpointPrediction, ModelId } from '@/types/analysis';
import { MODELS, TOX21_ENDPOINTS, featureSetLabel } from '@/data/tox21';
import { useGame } from '@/store/gameStore';
import { MoleculeView2D } from '@/components/compounds/MoleculeView2D';
import { downloadResult, heldOutMetric } from '@/services/analysis/exportResult';

const fmt = (v?: number | null, d = 2) => (v === undefined || v === null ? '—' : v.toFixed(d));

export function ResultsView({ result, title }: { result: AnalysisResult; title?: string }) {
  const compound = useGame((s) => s.getCompound(result.compoundId));
  const [showLog, setShowLog] = useState(false);
  const models = result.models.map((id) => MODELS.find((m) => m.id === id)!).filter(Boolean);
  const pred = (ep: string, m: ModelId) => result.predictions.find((p) => p.endpointId === ep && p.modelId === m);
  const panels = ['Nuclear Receptor', 'Stress Response'] as const;
  const name = compound?.name ?? title ?? result.label ?? 'Compound';

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-[180px_1fr]">
        <MoleculeView2D smiles={result.canonicalSmiles ?? result.smiles} height={140} />
        <div className="space-y-1 text-sm">
          <div className="text-lg font-semibold text-white">{title || result.label || 'Prediction report'}</div>
          <div className="text-lab-200">{name} · <code className="mono text-xs text-lab-300">{result.canonicalSmiles ?? result.smiles}</code></div>
          {result.inputNotes?.map((n) => <div key={n} className="text-xs text-warn-400">{n}</div>)}
          <div className="text-xs text-lab-400">
            Features: <b className="text-lab-200">{featureSetLabel(result.featureSet)}</b> · Models: {models.map((m) => m.name).join(', ')}
          </div>
          <div className="text-xs text-lab-400">Completed {new Date(result.completedAt).toLocaleString()} · computed in your browser</div>
          <div className="flex gap-2 pt-1">
            <button className="btn-secondary px-2.5 py-1 text-xs" onClick={() => downloadResult(result, 'csv', name)}>Download CSV</button>
            <button className="btn-ghost px-2.5 py-1 text-xs" onClick={() => downloadResult(result, 'json', name)}>Download JSON</button>
          </div>
        </div>
      </div>

      {result.knownRecord && (
        <div className="rounded-lg border border-warn-500/30 bg-warn-500/10 p-3 text-xs text-lab-200">
          <b className="text-warn-400">This molecule is in the Tox21 dataset</b> ({result.knownRecord.molId}, {result.knownRecord.split === 'train' ? 'training' : result.knownRecord.split === 'val' ? 'validation' : 'test'} set).
          {result.knownRecord.split === 'train'
            ? ' The models learned from its measured results, so these predictions are not a fair test of the models.'
            : ' The models never trained on it, so the predictions can be compared with its measured results.'}
        </div>
      )}
      <HowToRead />
      <Summary result={result} />

      <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-ink-850 text-left text-[11px] uppercase tracking-wider text-lab-400">
            <tr>
              <th className="px-3 py-2">Tox21 assay</th>
              <th className="px-3 py-2">Base rate</th>
              {models.map((m) => <th key={m.id} className="px-3 py-2">{m.name}</th>)}
            </tr>
          </thead>
          <tbody>
            {panels.map((panel) => (
              <Fragment key={panel}>
                <tr><td colSpan={models.length + 2} className="bg-white/[0.02] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-accent-400">{panel}</td></tr>
                {TOX21_ENDPOINTS.filter((e) => e.panel === panel).map((ep) => {
                  const base = models.map((m) => pred(ep.id, m.id)?.baseRate).find((b) => b !== undefined && b !== null);
                  return (
                    <tr key={ep.id} className="border-t border-white/[0.04] align-top">
                      <td className="px-3 py-2" title={ep.description}>
                        <div className="mono text-xs text-white">{ep.id}</div>
                        <div className="text-[11px] text-lab-400">{ep.name}</div>
                      </td>
                      <td className="mono px-3 py-2 text-xs text-lab-300">{base !== undefined ? `${(base * 100).toFixed(1)}%` : '—'}</td>
                      {models.map((m) => (
                        <td key={m.id} className="px-3 py-2">
                          <Cell p={pred(ep.id, m.id)} testAuc={heldOutMetric(result, m.id, ep.id, 'test')?.rocAuc} />
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <ModelEval result={result} />

      <p className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-[11px] text-lab-300">{result.provenance.disclaimer}</p>

      <div>
        <button className="btn-ghost px-2 text-xs" onClick={() => setShowLog((v) => !v)} aria-expanded={showLog}>{showLog ? 'Hide' : 'Show'} pipeline log ({result.log.length})</button>
        {showLog && (
          <ul className="mono mt-1 space-y-0.5 text-[11px]">
            {result.log.map((l, i) => (
              <li key={i}><span className={l.kind === 'real' ? 'text-ok-400' : l.kind === 'error' ? 'text-danger-400' : 'text-lab-400'}>[{l.kind}]</span> <span className="text-lab-200">{l.message}</span></li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function HowToRead() {
  return (
    <details className="rounded-xl border border-accent-500/20 bg-accent-500/5 p-3 text-xs text-lab-200">
      <summary className="cursor-pointer font-medium text-accent-300">How to read this report</summary>
      <ul className="mt-2 list-disc space-y-1 pl-4">
        <li><b>Probability</b> is the model’s estimate that this compound is <i>active in that in-vitro assay</i>. It is not a human-toxicity verdict.</li>
        <li><b>Base rate</b> is the share of actives in that assay’s training data. A probability well above the base rate means the model ranks the compound as more likely active than a typical training molecule.</li>
        <li>Models trained with class weighting give higher probabilities overall, so compare a model’s scores <i>across assays</i> rather than raw numbers <i>between models</i>.</li>
        <li><b>test AUC</b> under each cell is how well that model ranked actives above inactives for that assay on the held-out test set (0.5 = chance, 1 = perfect). Low values mean the prediction is less reliable.</li>
      </ul>
    </details>
  );
}

function Cell({ p, testAuc }: { p?: EndpointPrediction; testAuc?: number | null }) {
  if (!p || p.status === 'unavailable') return <span className="text-xs text-lab-400" title={p?.message}>Not available</span>;
  if (p.status === 'unsupported') return <span className="text-xs text-warn-400" title={p.message}>Unsupported</span>;
  if (p.status === 'error') return <span className="text-xs text-danger-400" title={p.message}>Error</span>;
  const score = p.score ?? 0;
  const lift = p.baseRate ? score / p.baseRate : undefined;
  const high = lift !== undefined && lift >= 2;
  return (
    <div className="min-w-[120px]">
      <div className="flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.08]">
          <div className={`h-full rounded-full ${high ? 'bg-warn-400' : 'bg-accent-500'}`} style={{ width: `${Math.max(2, score * 100)}%` }} />
        </div>
        <span className="mono w-10 text-right text-xs text-white">{score.toFixed(2)}</span>
      </div>
      <div className="mt-0.5 flex justify-between text-[10px] text-lab-400">
        <span className={high ? 'text-warn-400' : ''}>{lift !== undefined ? `${lift.toFixed(1)}× base` : ''}</span>
        <span>test AUC {fmt(testAuc)}</span>
      </div>
      {p.label !== undefined && p.label !== null && (
        <div className={`text-[10px] ${p.label === 1 ? 'text-warn-400' : 'text-lab-300'}`}>{p.label === 1 ? 'active' : 'inactive'} call (t={p.threshold})</div>
      )}
    </div>
  );
}

function Summary({ result }: { result: AnalysisResult }) {
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {result.models.map((id) => {
        const m = MODELS.find((x) => x.id === id)!;
        const ok = result.predictions.filter((p) => p.modelId === id && p.status === 'ok' && p.score !== undefined);
        const top = [...ok].sort((a, b) => (b.score! / (b.baseRate || 1)) - (a.score! / (a.baseRate || 1))).slice(0, 3);
        const unavailable = result.predictions.find((p) => p.modelId === id && p.status !== 'ok');
        return (
          <div key={id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
            <div className="text-xs text-lab-400">{m.name}</div>
            {ok.length ? (
              <>
                <div className="mt-1 text-[11px] text-lab-300">Highest relative to base rate:</div>
                {top.map((p) => (
                  <div key={p.endpointId} className="mono flex justify-between text-xs text-white">
                    <span>{p.endpointId}</span><span>{p.score!.toFixed(2)}{p.baseRate ? ` · ${(p.score! / p.baseRate).toFixed(1)}×` : ''}</span>
                  </div>
                ))}
                {ok.length < 12 && <div className="mt-1 text-[10px] text-warn-400">{12 - ok.length} endpoint(s) not available</div>}
              </>
            ) : (
              <div className="mt-1 text-sm text-warn-400">{unavailable?.message ?? 'No usable output'}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Mean held-out ROC-AUC / PR-AUC for each model on this feature set (dataset-level, not about this compound). */
function ModelEval({ result }: { result: AnalysisResult }) {
  const rows = result.models.flatMap((id) => {
    const meta = result.provenance.modelMetadata?.find((m) => m.modelId === id);
    return (['val', 'test'] as const).map((split) => {
      const ev = (meta?.evaluation ?? []).filter((e) => e.split === split && (e.featureSet ?? 'morgan') === result.featureSet);
      const mean = (k: 'rocAuc' | 'prAuc') => {
        const v = ev.map((e) => e[k]).filter((x): x is number => typeof x === 'number');
        return v.length ? v.reduce((a, b) => a + b, 0) / v.length : undefined;
      };
      return { id, split, n: ev.length, roc: mean('rocAuc'), pr: mean('prAuc') };
    });
  }).filter((r) => r.n > 0);

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-xs text-lab-300">
      <div className="h-section mb-1">Model performance on held-out data ({featureSetLabel(result.featureSet)})</div>
      ROC-AUC and PR-AUC (average precision) describe how well a model separates actives from inactives on the labelled scaffold-split data. They describe the model, not this compound.
      {rows.length ? (
        <table className="mt-2 w-full max-w-md text-[11px]">
          <thead className="text-lab-400"><tr><th className="text-left">Model</th><th className="text-left">Split</th><th>Mean ROC-AUC</th><th>Mean PR-AUC</th><th>Endpoints</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={`${r.id}-${r.split}`}>
                <td>{MODELS.find((m) => m.id === r.id)?.name}</td><td>{r.split === 'val' ? 'validation' : 'test'}</td>
                <td className="mono text-center">{fmt(r.roc, 3)}</td><td className="mono text-center">{fmt(r.pr, 3)}</td><td className="text-center">{r.n}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="mt-1">No evaluation metrics were reported by the server for these models.</div>
      )}
    </div>
  );
}
