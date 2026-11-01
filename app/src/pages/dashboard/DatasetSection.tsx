import { Fragment, type ReactNode } from 'react';
import { TOX21_ENDPOINTS } from '@/data/tox21';
import type { DatasetReport } from './siteData';
import { CountUp, useInView } from './motion';

const n = (x: number) => x.toLocaleString('en-US');
const SPLIT_COLORS = ['#1c5cab', '#3987e5', '#86b6ef']; // one blue ramp, dark -> light (ordinal)

/** Member 1's data: how the raw file was cleaned, how it was split, and how imbalanced each assay is. */
export function DatasetSection({ d }: { d: DatasetReport }) {
  const merged = d.raw_rows - d.invalid_smiles_removed - d.clean_rows;
  return (
    <div className="space-y-5">
      {/* Cleaning funnel */}
      <div className="d-card p-6">
        <h3 className="text-sm font-semibold text-slate-900">From raw file to clean dataset</h3>
        <div className="mt-5 grid items-stretch gap-3 md:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr]">
          <Step value={d.raw_rows} label="Raw molecules" sub="tox21.csv" />
          <Chevron />
          <Step value={d.invalid_smiles_removed} label="Unreadable, removed" sub="RDKit rejected these SMILES" />
          <Chevron />
          <Step value={merged} label="Duplicate rows, removed" sub={`${n(d.duplicate_rows_involved)} rows were only ${d.duplicate_groups} molecules`} />
          <Chevron />
          <Step value={d.clean_rows} label="Clean molecules" sub="unique canonical SMILES" highlight />
        </div>
        <div className="mt-5 flex flex-wrap gap-2 text-xs">
          <Pill>{n(d.multi_fragment_smiles)} salts/mixtures reduced to the largest fragment (e.g. sodium acetate → acetate)</Pill>
          <Pill>{d.duplicate_label_conflicts_set_to_nan} conflicting duplicate labels set to missing</Pill>
          <Pill>Missing labels stay missing (masked, never 0)</Pill>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_1.6fr]">
        <SplitCard d={d} />
        <AssayCard d={d} />
      </div>
    </div>
  );
}

function SplitCard({ d }: { d: DatasetReport }) {
  const { ref, inView } = useInView<HTMLDivElement>();
  const total = d.split_sizes.train + d.split_sizes.val + d.split_sizes.test;
  const parts = [['Train', d.split_sizes.train], ['Validation', d.split_sizes.val], ['Test', d.split_sizes.test]] as const;
  return (
    <div ref={ref} className="d-card flex flex-col p-6">
      <h3 className="text-sm font-semibold text-slate-900">Scaffold split · 80 / 10 / 10</h3>
      <p className="mt-1 text-xs text-slate-500">Whole Bemis–Murcko scaffold groups go to one partition, so test molecules have ring systems the models never saw.</p>
      <div className={`mt-6 flex h-3 gap-[2px] overflow-hidden rounded-full ${inView ? 'is-visible' : ''}`} role="img" aria-label={parts.map(([l, v]) => `${l} ${v}`).join(', ')}>
        {parts.map(([l, v], i) => (
          <div key={l} className="grow-x h-full" style={{ width: `${(100 * v) / total}%`, background: SPLIT_COLORS[i], transitionDelay: `${i * 150}ms` }} />
        ))}
      </div>
      <dl className="mt-5 space-y-3">
        {parts.map(([l, v], i) => (
          <div key={l} className="flex items-center justify-between text-sm">
            <dt className="flex items-center gap-2 text-slate-600"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: SPLIT_COLORS[i] }} />{l}</dt>
            <dd className="font-mono text-slate-900">{n(v)} <span className="text-slate-400">· {((100 * v) / total).toFixed(0)}%</span></dd>
          </div>
        ))}
      </dl>
      <div className="mt-auto grid grid-cols-2 gap-3 border-t border-slate-100 pt-5">
        <div><div className="d-num text-xl"><CountUp value={d.n_unique_scaffolds} /></div><div className="text-xs text-slate-500">unique scaffolds, none shared</div></div>
        <div><div className="d-num text-xl"><CountUp value={d.acyclic_molecules_empty_scaffold} /></div><div className="text-xs text-slate-500">acyclic molecules, all in train</div></div>
      </div>
    </div>
  );
}

function AssayCard({ d }: { d: DatasetReport }) {
  const { ref, inView } = useInView<HTMLDivElement>();
  const maxActive = Math.max(...d.clean_label_stats.map((s) => s.active_pct));
  return (
    <div ref={ref} className={`d-card p-6 ${inView ? 'is-visible' : ''}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900">The 12 assays</h3>
        <span className="text-xs text-slate-500">Every assay is imbalanced: 3–16% of labelled molecules are active</span>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <thead><tr><th className="d-th">Assay</th><th className="d-th">Labelled</th><th className="d-th">Active share</th><th className="d-th">Missing</th></tr></thead>
          <tbody>
            {(['Nuclear Receptor', 'Stress Response'] as const).map((panel) => (
              <Fragment key={panel}>
                <tr><td colSpan={4} className="pb-1 pt-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-teal-700">{panel}</td></tr>
                {d.clean_label_stats.filter((s) => TOX21_ENDPOINTS.find((e) => e.id === s.assay)?.panel === panel).map((s, i) => (
                  <tr key={s.assay} className="border-t border-slate-100 transition-colors hover:bg-slate-50/80">
                    <td className="py-2 pr-4" title={TOX21_ENDPOINTS.find((e) => e.id === s.assay)?.name}><span className="font-mono text-xs text-slate-900">{s.assay}</span></td>
                    <td className="py-2 pr-4 font-mono text-xs text-slate-500">{n(s.labelled)}</td>
                    <td className="py-2 pr-4">
                      <div className="flex items-center gap-3" title={`${n(s.active)} active of ${n(s.labelled)} labelled · ${(s.inactive / s.active).toFixed(1)} inactive per active`}>
                        <div className="h-1.5 w-32 overflow-hidden rounded-full bg-slate-100">
                          <div className="grow-x h-full rounded-full bg-[#2a78d6]" style={{ width: `${(100 * s.active_pct) / maxActive}%`, transitionDelay: `${i * 60}ms` }} />
                        </div>
                        <span className="font-mono text-xs text-slate-900">{s.active_pct.toFixed(1)}%</span>
                      </div>
                    </td>
                    <td className="py-2 font-mono text-xs text-slate-500">{s.missing_pct.toFixed(1)}%</td>
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Step({ value, label, sub, highlight = false }: { value: number; label: string; sub: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border px-4 py-4 ${highlight ? 'border-teal-200 bg-gradient-to-br from-teal-50 to-white' : 'border-slate-200 bg-slate-50/50'}`}>
      <div className={`d-num text-2xl ${highlight ? '!text-teal-700' : ''}`}><CountUp value={value} /></div>
      <div className="mt-1 text-sm font-medium text-slate-700">{label}</div>
      <div className="text-xs text-slate-500">{sub}</div>
    </div>
  );
}

const Chevron = () => (
  <div className="hidden items-center justify-center text-slate-300 md:flex" aria-hidden>
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M6 3l5 5-5 5" /></svg>
  </div>
);

const Pill = ({ children }: { children: ReactNode }) => <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-600">{children}</span>;
