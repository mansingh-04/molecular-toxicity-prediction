import { useEffect, useMemo, useState } from 'react';
import type { ModelId } from '@/types/analysis';
import { TOX21_ENDPOINTS } from '@/data/tox21';
import { COMPARED_MODELS, fmt, mean, type MetricRow } from './siteData';
import { CountUp, useInView } from './motion';

type Split = 'test' | 'val';
type Metric = 'rocAuc' | 'prAuc';
const FEATURES = [
  { id: 'morgan', label: 'Morgan' },
  { id: 'morgan+descriptors', label: 'Morgan + descriptors' },
  { id: 'descriptors', label: 'Descriptors' },
];
const FEATURE_LONG: Record<string, string> = { morgan: 'Morgan fingerprints', 'morgan+descriptors': 'Morgan fingerprints + descriptors', descriptors: 'descriptors only' };

/** Endpoint-wise comparison of every model, read from public/data/metrics.json. */
export function ComparisonSection({ rows }: { rows: MetricRow[] }) {
  const [split, setSplit] = useState<Split>('test');
  const [featureSet, setFeatureSet] = useState('morgan');
  const [metric, setMetric] = useState<Metric>('rocAuc');
  const [showTable, setShowTable] = useState(false);

  const value = (model: ModelId, endpoint: string, fs = featureSet, sp: string = split, m: Metric = metric) =>
    rows.find((r) => r.model === model && r.endpoint === endpoint && r.featureSet === fs && r.split === sp)?.[m] ?? undefined;
  const present = COMPARED_MODELS.filter((m) => rows.some((r) => r.model === m.id));
  const pending = COMPARED_MODELS.filter((m) => !present.includes(m));
  const metricName = metric === 'rocAuc' ? 'ROC-AUC' : 'PR-AUC';

  const summary = useMemo(() => present.map((m) => {
    const wins = TOX21_ENDPOINTS.filter((ep) => {
      const mine = value(m.id, ep.id);
      return typeof mine === 'number' && present.every((o) => (value(o.id, ep.id) ?? -1) <= mine);
    }).length;
    return { ...m, mean: mean(TOX21_ENDPOINTS.map((ep) => value(m.id, ep.id))), wins };
  }), [rows, split, featureSet, metric]); // eslint-disable-line react-hooks/exhaustive-deps
  const ranked = [...summary].sort((a, b) => (b.mean ?? 0) - (a.mean ?? 0));
  const leader = ranked[0];
  const spread = ranked.length > 1 && leader?.mean !== undefined ? leader.mean - (ranked.at(-1)!.mean ?? leader.mean) : undefined;
  const positiveRate = (ep: string) => {
    const r = rows.find((x) => x.endpoint === ep && x.split === split && x.featureSet === featureSet);
    return r ? r.nPositive / r.nObserved : undefined;
  };

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="d-card flex flex-wrap items-center gap-x-6 gap-y-3 px-5 py-4">
        <Seg label="Data" value={split} onChange={setSplit} options={[{ id: 'test', label: 'Test' }, { id: 'val', label: 'Validation' }]} />
        <Seg label="Features" value={featureSet} onChange={setFeatureSet} options={FEATURES} />
        <Seg label="Metric" value={metric} onChange={setMetric} options={[{ id: 'rocAuc', label: 'ROC-AUC' }, { id: 'prAuc', label: 'PR-AUC' }]} />
      </div>

      {/* Model cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summary.map((m) => (
          <div key={m.id} className="d-card group relative overflow-hidden p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
            <div className="absolute inset-x-0 top-0 h-1" style={{ background: m.color }} />
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-900">{m.name}</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">{m.family}</span>
            </div>
            {m === leader && <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">★ Highest mean</div>}
            <div className="d-num mt-3 text-[2.25rem] leading-none">{m.mean !== undefined ? <CountUp value={m.mean} decimals={3} duration={900} /> : '—'}</div>
            <div className="mt-1.5 text-xs text-slate-500">mean {metricName} · 12 assays</div>
            <div className="mt-4">
              <div className="flex gap-[3px]" aria-label={`Best on ${m.wins} of 12 assays`}>
                {Array.from({ length: 12 }, (_, i) => <span key={i} className="h-1.5 flex-1 rounded-full transition-colors duration-500" style={{ background: i < m.wins ? m.color : '#e2e8f0' }} />)}
              </div>
              <div className="mt-1.5 text-xs text-slate-500">Best on <b className="font-semibold text-slate-800">{m.wins}</b> of 12 assays</div>
            </div>
          </div>
        ))}
        {pending.map((m) => (
          <div key={m.id} className="relative overflow-hidden rounded-2xl border border-dashed border-indigo-200 bg-gradient-to-br from-indigo-50/70 to-white p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-900">{m.name}</span>
              <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">{m.family}</span>
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm font-medium text-indigo-700"><span className="h-2 w-2 animate-pulse rounded-full bg-indigo-500" />In training</div>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">Member 4's GCN learns directly from atoms and bonds. Its results will appear here under the same split and metrics.</p>
          </div>
        ))}
      </div>

      {/* Insight */}
      {leader?.mean !== undefined && (
        <div className="flex items-start gap-3 rounded-2xl border border-teal-100 bg-teal-50/60 px-5 py-4 text-sm text-slate-700">
          <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-teal-600 text-[11px] font-bold text-white">i</span>
          <p>
            On the <b className="text-slate-900">{split === 'test' ? 'test' : 'validation'}</b> set with <b className="text-slate-900">{FEATURE_LONG[featureSet]}</b>, <b className="text-slate-900">{leader.name}</b> has
            the highest mean {metricName} ({fmt(leader.mean)}). {spread !== undefined && `The gap between the best and worst model is only ${fmt(spread)}, from one split and one seed, so the ranking should be read with caution.`}
          </p>
        </div>
      )}

      {/* Dot chart */}
      <div className="d-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-slate-900">{metricName} per assay</h3>
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
            {present.map((m) => <span key={m.id} className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: m.color }} />{m.name}</span>)}
            <span className="inline-flex items-center gap-1.5 text-slate-400"><span className="inline-block h-3 border-l border-dashed border-slate-400" />{metric === 'rocAuc' ? 'random (0.5)' : 'random (= share of actives)'}</span>
          </div>
        </div>
        <DotChart
          models={present}
          rows={TOX21_ENDPOINTS.map((ep) => ({ id: ep.id, name: ep.name, values: present.map((m) => value(m.id, ep.id)), baseline: metric === 'rocAuc' ? 0.5 : positiveRate(ep.id) }))}
          metric={metric}
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
          <p className="text-xs text-slate-500">Further right is better: the model ranks active molecules above inactive ones more often. Hover a dot for its value.</p>
          <button className="text-xs font-medium text-teal-700 hover:text-teal-900" onClick={() => setShowTable((v) => !v)} aria-expanded={showTable}>{showTable ? 'Hide table' : 'Show as table'} →</button>
        </div>
        {showTable && <MetricTable rows={rows} models={present} split={split} featureSet={featureSet} value={value} />}
      </div>

      {/* Feature-set comparison */}
      <FeatureBars models={present} value={value} metricName={metricName} split={split} />
    </div>
  );
}

/** Horizontal dot plot. Dots glide to new positions when the view changes. */
function DotChart({ models, rows, metric }: { models: typeof COMPARED_MODELS; rows: { id: string; name: string; values: (number | undefined)[]; baseline?: number }[]; metric: Metric }) {
  const { ref, inView } = useInView<HTMLDivElement>();
  const [hover, setHover] = useState<{ x: number; y: number; title: string; text: string; color: string }>();
  // Draw at the real width (so text stays readable on phones) instead of scaling a fixed drawing.
  const [W, setW] = useState(760);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(300, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  const [lo, hi] = metric === 'rocAuc' ? [0.4, 0.95] : [0, 0.9];
  const L = W < 520 ? 108 : 150, R = 16, rowH = 30, top = 10, H = top + rows.length * rowH + 26;
  const x = (v: number) => L + ((Math.min(hi, Math.max(lo, v)) - lo) / (hi - lo)) * (W - L - R);
  const ticks = metric === 'rocAuc' ? (W < 520 ? [0.4, 0.6, 0.8] : [0.4, 0.5, 0.6, 0.7, 0.8, 0.9]) : W < 520 ? [0, 0.4, 0.8] : [0, 0.2, 0.4, 0.6, 0.8];

  return (
    <div ref={ref} className="relative mt-4">
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="block w-full" role="img" aria-label="Score per assay for each model" onMouseLeave={() => setHover(undefined)}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={x(t)} x2={x(t)} y1={top} y2={H - 24} stroke="#eef2f6" />
            <text x={x(t)} y={H - 8} textAnchor="middle" fontSize="10.5" fill="#94a3b8" fontFamily="Geist Mono, monospace">{t.toFixed(1)}</text>
          </g>
        ))}
        {rows.map((r, i) => {
          const cy = top + i * rowH + rowH / 2;
          const vals = r.values.filter((v): v is number => typeof v === 'number');
          return (
            <g key={r.id}>
              <rect x={0} y={cy - rowH / 2 + 2} width={W} height={rowH - 4} rx={8} fill={hover?.title.startsWith(r.id) ? '#f8fafc' : 'transparent'} />
              <text x={8} y={cy + 4} fontSize="11.5" fill="#0f172a" fontFamily="Geist Mono, monospace">{r.id}</text>
              {vals.length > 1 && (
                <line x1={x(Math.min(...vals))} x2={x(Math.max(...vals))} y1={cy} y2={cy} stroke="#e2e8f0" strokeWidth="3" strokeLinecap="round" className="dot-move" />
              )}
              {typeof r.baseline === 'number' && <line x1={x(r.baseline)} x2={x(r.baseline)} y1={cy - 9} y2={cy + 9} stroke="#94a3b8" strokeDasharray="2 2" />}
              {r.values.map((v, k) => typeof v === 'number' && (
                <g key={k} className="dot-move" style={{ transform: `translate(${inView ? x(v) : L}px, ${cy}px)`, opacity: inView ? 1 : 0, transitionDelay: `${i * 25 + k * 40}ms` }}>
                  <circle r={7} fill={models[k].color} stroke="#fff" strokeWidth="2.5" />
                  <circle r={14} fill="transparent" style={{ cursor: 'default' }}
                    onMouseEnter={() => setHover({ x: x(v) / W, y: cy / H, title: `${r.id} · ${r.name}`, text: `${models[k].name}: ${v.toFixed(3)}`, color: models[k].color })} />
                </g>
              ))}
            </g>
          );
        })}
      </svg>
      {hover && (
        <div className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-xl shadow-slate-900/10" style={{ left: `${hover.x * 100}%`, top: `calc(${hover.y * 100}% - 8px)` }}>
          <div className="text-slate-500">{hover.title}</div>
          <div className="mt-0.5 flex items-center gap-1.5 font-medium text-slate-900"><span className="h-2 w-2 rounded-full" style={{ background: hover.color }} />{hover.text}</div>
        </div>
      )}
    </div>
  );
}

function MetricTable({ rows, models, split, featureSet, value }: {
  rows: MetricRow[]; models: typeof COMPARED_MODELS; split: Split; featureSet: string; value: (m: ModelId, ep: string) => number | undefined;
}) {
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full min-w-[560px] text-sm">
        <thead><tr><th className="d-th">Assay</th><th className="d-th">Labels (obs / active)</th>{models.map((m) => <th key={m.id} className="d-th">{m.short}</th>)}</tr></thead>
        <tbody>
          {TOX21_ENDPOINTS.map((ep) => {
            const c = rows.find((r) => r.endpoint === ep.id && r.split === split && r.featureSet === featureSet);
            const top = Math.max(...models.map((m) => value(m.id, ep.id) ?? -1));
            return (
              <tr key={ep.id} className="border-t border-slate-100 hover:bg-slate-50/80">
                <td className="py-2 pr-4 font-mono text-xs text-slate-900">{ep.id}</td>
                <td className={`py-2 pr-4 font-mono text-xs ${c && c.nPositive < 20 ? 'text-amber-700' : 'text-slate-500'}`} title={c && c.nPositive < 20 ? 'Fewer than 20 actives: noisy score' : undefined}>{c ? `${c.nObserved} / ${c.nPositive}` : '—'}{c && c.nPositive < 20 ? ' ⚠' : ''}</td>
                {models.map((m) => { const v = value(m.id, ep.id); return <td key={m.id} className={`py-2 pr-4 font-mono text-xs ${v === top ? 'font-semibold text-slate-900' : 'text-slate-500'}`}>{fmt(v)}</td>; })}
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-2 text-[11px] text-slate-400">Bold = best model for that assay. ⚠ = fewer than 20 actives, so the score is noisy.</p>
    </div>
  );
}

/** Mean score per model for each input representation, as horizontal bars. */
function FeatureBars({ models, value, metricName, split }: { models: typeof COMPARED_MODELS; value: (m: ModelId, ep: string, fs?: string) => number | undefined; metricName: string; split: Split }) {
  const { ref, inView } = useInView<HTMLDivElement>();
  const data = models.map((m) => ({ m, means: FEATURES.map((f) => mean(TOX21_ENDPOINTS.map((ep) => value(m.id, ep.id, f.id)))) }));
  const all = data.flatMap((d) => d.means).filter((v): v is number => typeof v === 'number');
  const lo = Math.floor((Math.min(...all) - 0.05) * 20) / 20, hi = Math.ceil((Math.max(...all) + 0.01) * 20) / 20;
  const pct = (v?: number) => (v === undefined ? 0 : ((v - lo) / (hi - lo)) * 100);
  const helped = data.filter(({ means }) => (means[1] ?? 0) > (means[0] ?? 0)).length; // combined vs Morgan-only
  return (
    <div ref={ref} className={`d-card p-6 ${inView ? 'is-visible' : ''}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900">Does the input representation matter?</h3>
        <span className="text-xs text-slate-500">Mean {metricName} over 12 assays · {split === 'test' ? 'test' : 'validation'} · axis starts at {lo.toFixed(2)}</span>
      </div>
      <div className="mt-5 grid gap-6 md:grid-cols-3">
        {data.map(({ m, means }) => {
          const best = Math.max(...means.map((v) => v ?? -1));
          return (
            <div key={m.id}>
              <div className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-900"><span className="h-2.5 w-2.5 rounded-full" style={{ background: m.color }} />{m.name}</div>
              <div className="space-y-2.5">
                {FEATURES.map((f, i) => (
                  <div key={f.id}>
                    <div className="flex justify-between text-xs"><span className="text-slate-500">{f.label}</span><span className={`font-mono ${means[i] === best ? 'font-semibold text-slate-900' : 'text-slate-500'}`}>{fmt(means[i])}</span></div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className="grow-x h-full rounded-full" style={{ width: `${pct(means[i])}%`, background: m.color, opacity: means[i] === best ? 1 : 0.45, transitionDelay: `${i * 120}ms` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-5 text-xs text-slate-500">
        {helped === data.length ? 'Here, adding descriptors to the fingerprint helps every model. ' : `Here, adding descriptors to the fingerprint helps ${helped} of ${data.length} models. `}
        Morgan-only remains the main setting, because the GCN is compared on the same molecules without hand-made descriptors.
      </p>
    </div>
  );
}

function Seg<T extends string>({ label, value, onChange, options }: { label: string; value: T; onChange: (v: T) => void; options: { id: T; label: string }[] }) {
  return (
    <div className="flex min-w-0 max-w-full items-center gap-2.5">
      <span className="shrink-0 text-xs font-medium text-slate-400">{label}</span>
      <div className="d-seg" role="group" aria-label={label}>
        {options.map((o) => <button key={o.id} className="d-seg-btn" aria-pressed={value === o.id} onClick={() => onChange(o.id)}>{o.label}</button>)}
      </div>
    </div>
  );
}
