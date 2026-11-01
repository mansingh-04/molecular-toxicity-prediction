import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useGame } from '@/store/gameStore';
import { DatasetSection } from './dashboard/DatasetSection';
import { ComparisonSection } from './dashboard/ComparisonSection';
import { ModelDetailsSection } from './dashboard/ModelDetailsSection';
import { COMPARED_MODELS, mean, useSiteData } from './dashboard/siteData';
import { CountUp, Reveal } from './dashboard/motion';

const SECTIONS = [
  { id: 'pipeline', label: 'Approach' },
  { id: 'dataset', label: 'Dataset' },
  { id: 'comparison', label: 'Results' },
  { id: 'models', label: 'Model details' },
];

/**
 * Landing page: the project's results (approach, dataset, model comparison) and the link to the
 * lab simulation, where molecules are tested. All numbers come from public/data/*.json.
 */
export function HomePage() {
  const openLab = useGame((s) => s.enterLab);
  const { data, error } = useSiteData();
  const scroller = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState('');

  // Nav: add a border once the page scrolls, and highlight the section in view.
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const onScroll = () => {
      setScrolled(el.scrollTop > 8);
      const line = Math.max(160, el.clientHeight * 0.4);
      const current = [...SECTIONS].reverse().find((s) => (document.getElementById(s.id)?.getBoundingClientRect().top ?? 1e9) < line);
      setActive(current?.id ?? '');
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);
  const go = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const best = data && COMPARED_MODELS
    .map((m) => ({ m, v: mean(data.metrics.filter((r) => r.model === m.id && r.split === 'test' && r.featureSet === 'morgan').map((r) => r.rocAuc)) }))
    .filter((x) => x.v !== undefined)
    .sort((a, b) => b.v! - a.v!)[0];

  return (
    <div ref={scroller} className="d-page h-full overflow-y-auto">
      {/* ---------- Navigation ---------- */}
      <header className={`sticky top-0 z-30 bg-[#f6f7f9]/80 backdrop-blur-xl transition-[border-color,box-shadow] duration-300 ${scrolled ? 'border-b border-slate-200/80 shadow-[0_1px_12px_-6px_rgba(15,23,42,0.12)]' : 'border-b border-transparent'}`}>
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-5 py-3.5">
          <button className="flex items-center gap-2.5" onClick={() => scroller.current?.scrollTo({ top: 0, behavior: 'smooth' })}>
            <Logo />
            <span className="text-[15px] font-semibold tracking-tight text-slate-900">ToxiLab</span>
          </button>
          <nav className="hidden items-center gap-1 md:flex" aria-label="Sections">
            {SECTIONS.map((s) => (
              <button key={s.id} onClick={() => go(s.id)}
                className={`rounded-full px-3 py-1.5 text-sm transition-colors ${active === s.id ? 'bg-slate-900/[0.06] text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}>
                {s.label}
              </button>
            ))}
          </nav>
          <button className="d-btn-dark ml-auto px-4 py-2" onClick={openLab}>Lab simulation <Arrow /></button>
        </div>
      </header>

      {/* ---------- Hero ---------- */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_80%_10%,rgba(20,184,166,0.12),transparent_60%),radial-gradient(50%_50%_at_10%_90%,rgba(42,120,214,0.10),transparent_60%)]" />
        <div aria-hidden className="pointer-events-none absolute inset-0 [background-image:linear-gradient(rgba(15,23,42,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.035)_1px,transparent_1px)] [background-size:44px_44px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 pb-16 pt-12 md:pt-20 lg:grid-cols-[1.15fr_1fr]">
          <div>
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-xs font-medium text-slate-600 backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full bg-teal-500" /> B.Tech CSE (AI) project · Tox21
              </span>
            </Reveal>
            <Reveal delay={80}>
              <h1 className="mt-5 text-[2.6rem] font-semibold leading-[1.06] tracking-[-0.045em] text-slate-900 md:text-[3.6rem]">
                Molecular toxicity prediction via <span className="bg-gradient-to-r from-teal-600 to-teal-500 bg-clip-text text-transparent">fingerprints</span> and <span className="bg-gradient-to-r from-indigo-600 to-violet-500 bg-clip-text text-transparent">molecular graphs</span>
              </h1>
            </Reveal>
            <Reveal delay={160}>
              <p className="d-lead mt-5 max-w-xl">
                Under one scaffold split and one set of metrics, how do classic models on engineered Morgan fingerprints compare
                with a graph neural network that learns from the molecule itself, across the 12 Tox21 assays?
              </p>
            </Reveal>
            <Reveal delay={240}>
              <div className="mt-8 flex flex-wrap gap-3">
                <button className="d-btn-dark" onClick={() => go('comparison')}>See the results <Arrow /></button>
                <button className="d-btn-light" onClick={openLab}>Test a molecule in the lab</button>
              </div>
            </Reveal>
          </div>
          <Reveal delay={200} className="hidden lg:block"><HeroVisual best={best?.v} /></Reveal>
        </div>

        {/* stats strip */}
        <div className="relative mx-auto max-w-6xl px-5 pb-16">
          <Reveal>
            <div className="d-card grid grid-cols-2 divide-slate-100 md:grid-cols-4 md:divide-x">
              <Stat label="Clean molecules" sub={data ? `from ${data.dataset.raw_rows.toLocaleString('en-US')} raw` : ''}>{data ? <CountUp value={data.dataset.clean_rows} /> : '—'}</Stat>
              <Stat label="Tox21 assays" sub="7 nuclear receptor · 5 stress"><CountUp value={12} duration={900} /></Stat>
              <Stat label="Models" sub="3 trained (AML) · GCN pending"><CountUp value={3} duration={900} /><span className="text-slate-300"> + 1</span></Stat>
              <Stat label="Best mean test ROC-AUC" sub={best ? `${best.m.name}, Morgan` : ''}>{best ? <CountUp value={best.v!} decimals={3} /> : '—'}</Stat>
            </div>
          </Reveal>
        </div>
      </section>

      <main className="mx-auto max-w-6xl space-y-28 px-5 pb-24">
        {error && <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">Could not load the results files: {error}</p>}

        <Section id="pipeline" n="01" eyebrow="Approach" title="Two pipelines, one protocol" lead="Both pipelines read the same SMILES, use the same scaffold split, and are scored with the same metrics, so only the representation and the model differ.">
          <Pipeline />
        </Section>

        <Section id="dataset" n="02" eyebrow="Dataset" title="Tox21, cleaned and split by scaffold" lead="Prepared by Member 1. Every model trains and is evaluated on exactly these molecules, and missing labels are never treated as inactive.">
          {data ? <DatasetSection d={data.dataset} /> : <Skeleton />}
        </Section>

        <Section id="comparison" n="03" eyebrow="Results" title="How the models compare" lead="Held-out performance on every assay. Settings were tuned on validation; the test set was used once, at the end.">
          {data ? <ComparisonSection rows={data.metrics} /> : <Skeleton />}
        </Section>

        <Section id="models" n="04" eyebrow="Model details" title="Inside each model" lead="How every model was configured and tuned, and what its predictions look like at a decision threshold: precision, recall, F1 and the confusion matrix.">
          {data ? <ModelDetailsSection rows={data.metrics} /> : <Skeleton />}
        </Section>

        <Reveal>
          <section className="relative overflow-hidden rounded-3xl bg-slate-900 px-8 py-12 text-white md:px-12">
            <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_80%_at_90%_20%,rgba(45,212,191,0.25),transparent_60%),radial-gradient(40%_60%_at_0%_100%,rgba(99,102,241,0.25),transparent_60%)]" />
            <div className="relative grid items-center gap-8 md:grid-cols-[1.4fr_1fr]">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-300">Lab simulation</div>
                <h2 className="mt-3 text-3xl font-semibold tracking-[-0.02em] md:text-4xl">Step into the lab</h2>
                <p className="mt-3 max-w-lg text-slate-300">Walk through a 3D laboratory and test any molecule: pick a sample vial from the shelf, or type your own SMILES at the analyzer. It runs the same trained models in your browser and prints the 12-assay report.</p>
                <button className="d-btn mt-7 bg-white text-slate-900 hover:-translate-y-px hover:bg-teal-50" onClick={openLab}>Open the lab <Arrow /></button>
              </div>
              <ol className="space-y-3 text-sm">
                {['Pick a vial, or type your own SMILES', 'Load it into the Toxicity Analyzer', 'Run the models and read the report'].map((t, i) => (
                  <li key={t} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 backdrop-blur">
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-teal-400/15 font-mono text-xs text-teal-300">{i + 1}</span>{t}
                  </li>
                ))}
              </ol>
            </div>
          </section>
        </Reveal>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-8 text-xs text-slate-500">
          <div className="flex items-center gap-2.5"><Logo small /><span>ToxiLab · Molecular Toxicity Prediction via Fingerprints and Molecular Graph Networks</span></div>
          <p className="max-w-xl">Predictions estimate activity in Tox21 in-vitro assays. They are research outputs, not measurements or a verdict on human toxicity. One scaffold split, one seed (42), no confidence intervals.</p>
        </div>
      </footer>
    </div>
  );
}

function Section({ id, n, eyebrow, title, lead, children }: { id: string; n: string; eyebrow: string; title: string; lead: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24">
      <Reveal>
        <div className="mb-10 grid gap-4 md:grid-cols-[1fr_1.1fr] md:items-end">
          <div>
            <div className="d-eyebrow flex items-center gap-3"><span className="font-mono text-slate-400">{n}</span><span className="h-px w-8 bg-teal-600/40" />{eyebrow}</div>
            <h2 className="d-h2 mt-3">{title}</h2>
          </div>
          <p className="d-lead md:pb-1">{lead}</p>
        </div>
      </Reveal>
      <Reveal delay={100}>{children}</Reveal>
    </section>
  );
}

function Stat({ label, sub, children }: { label: string; sub: string; children: ReactNode }) {
  return (
    <div className="px-6 py-6">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className="d-num mt-2 text-3xl md:text-[2.1rem]">{children}</div>
      <div className="mt-1 text-xs text-slate-400">{sub}</div>
    </div>
  );
}

/** The two pipelines as a flow diagram with animated connectors. */
function Pipeline() {
  const lanes = [
    { tag: 'Pipeline A · Machine learning', color: '#2a78d6', steps: [['SMILES', 'text input'], ['RDKit cleaning', 'largest fragment, canonical'], ['Morgan fingerprint', 'radius 2 · 2048 bits'], ['LR · RF · XGBoost', 'one model per assay'], ['12 probabilities', 'one per assay']], status: 'Trained' },
    { tag: 'Pipeline B · Deep learning', color: '#6250d6', steps: [['SMILES', 'text input'], ['Molecular graph', 'atoms = nodes, bonds = edges'], ['GCN', 'masked loss for missing labels'], ['Graph pooling', 'one vector per molecule'], ['12 probabilities', 'one per assay']], status: 'In progress' },
  ];
  return (
    <div className="grid gap-5">
      {lanes.map((lane) => (
        <div key={lane.tag} className="d-card p-6">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-sm font-semibold text-slate-900"><span className="h-2.5 w-2.5 rounded-full" style={{ background: lane.color }} />{lane.tag}</div>
            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${lane.status === 'Trained' ? 'bg-emerald-50 text-emerald-700' : 'bg-indigo-50 text-indigo-700'}`}>{lane.status}</span>
          </div>
          <div className="flex flex-col gap-3 md:flex-row md:items-stretch md:gap-0">
            {lane.steps.map(([t, s], i) => (
              <div key={t} className="flex items-center md:flex-1">
                <div className="group flex-1 rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3 transition-all duration-300 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white hover:shadow-md">
                  <div className="text-sm font-medium text-slate-900">{t}</div>
                  <div className="mt-0.5 text-xs text-slate-500">{s}</div>
                </div>
                {i < lane.steps.length - 1 && (
                  <svg className="mx-1 hidden h-4 w-8 shrink-0 md:block" viewBox="0 0 32 16" aria-hidden>
                    <line x1="0" y1="8" x2="26" y2="8" stroke={lane.color} strokeWidth="2" className="flow-line" opacity={0.7} />
                    <path d="M24 3l6 5-6 5" fill="none" stroke={lane.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity={0.8} />
                  </svg>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Hero illustration: a gently floating molecular graph with two result cards. */
function HeroVisual({ best }: { best?: number }) {
  const nodes: [number, number, string][] = [
    [190, 120, '#0f766e'], [250, 85, '#0f766e'], [310, 120, '#0f766e'], [310, 190, '#0f766e'], [250, 225, '#0f766e'], [190, 190, '#0f766e'],
    [130, 85, '#dc2626'], [370, 85, '#0f766e'], [430, 120, '#2563eb'], [250, 295, '#0f766e'], [190, 330, '#dc2626'], [310, 330, '#0f766e'],
  ];
  const edges = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0], [0, 6], [2, 7], [7, 8], [4, 9], [9, 10], [9, 11]];
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[460px]">
      <div className="absolute inset-6 rounded-[2.5rem] border border-slate-200/80 bg-white/60 shadow-[0_30px_80px_-30px_rgba(15,23,42,0.25)] backdrop-blur" />
      <svg viewBox="80 40 400 340" className="float-slow absolute inset-10" aria-hidden>
        {edges.map(([a, b], i) => <line key={i} x1={nodes[a][0]} y1={nodes[a][1]} x2={nodes[b][0]} y2={nodes[b][1]} stroke="#cbd5e1" strokeWidth="3" strokeLinecap="round" />)}
        <circle cx="250" cy="155" r="38" fill="none" stroke="#99f6e4" strokeWidth="2" strokeDasharray="4 6" className="flow-line" />
        {nodes.map(([x, y, c], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r="15" fill={c} opacity="0.12" className="pulse-node" style={{ animationDelay: `${i * 0.25}s` }} />
            <circle cx={x} cy={y} r="7" fill={c} />
          </g>
        ))}
      </svg>
      <div className="float-slower absolute -left-2 top-16 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-xl shadow-slate-900/10">
        <div className="text-[11px] font-medium text-slate-500">Best mean test ROC-AUC</div>
        <div className="d-num text-xl">{best !== undefined ? best.toFixed(3) : '…'}</div>
      </div>
      <div className="float-slow absolute -right-1 bottom-16 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-xl shadow-slate-900/10">
        <div className="flex items-center gap-2 text-[11px] font-medium text-slate-500"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Runs in your browser</div>
        <div className="text-sm font-medium text-slate-900">Same numbers as Python</div>
      </div>
    </div>
  );
}

function Skeleton() {
  return <div className="d-card space-y-3 p-6">{[70, 100, 85].map((w) => <div key={w} className="shimmer h-4 rounded" style={{ width: `${w}%` }} />)}</div>;
}

function Logo({ small = false }: { small?: boolean }) {
  return (
    <span className={`grid place-items-center rounded-lg bg-gradient-to-br from-teal-500 to-indigo-600 text-white shadow-sm ${small ? 'h-6 w-6' : 'h-8 w-8'}`}>
      <svg viewBox="0 0 24 24" className={small ? 'h-3.5 w-3.5' : 'h-[18px] w-[18px]'} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.7 3h10.6a2 2 0 0 0 1.7-3l-5-9V3" /></svg>
    </span>
  );
}

const Arrow = () => <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M3 8h10M9 4l4 4-4 4" /></svg>;
