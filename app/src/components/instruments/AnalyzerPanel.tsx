import { useState } from 'react';
import type { ModelId } from '@/types/analysis';
import { useGame } from '@/store/gameStore';
import { MODELS } from '@/data/tox21';
import { MoleculeView2D } from '@/components/compounds/MoleculeView2D';
import { ModelStatusBanner } from '@/components/analysis/ModelStatus';
import { Icon } from '@/components/ui/Icon';

const AML = MODELS.filter((m) => m.family === 'aml');

/** Quick examples for the custom-molecule form: one from the test set, one not in Tox21 at all. */
const EXAMPLES = [
  { name: 'Coumestrol', smiles: 'O=c1oc2cc(O)ccc2c2oc3cc(O)ccc3c12' },
  { name: 'Diclofenac', smiles: 'OC(=O)Cc1ccccc1Nc1c(Cl)cccc1Cl' },
];

/** The analyzer: load the vial you are holding (or type a custom SMILES), choose models, run them, open the report. */
export function AnalyzerBody() {
  const compound = useGame((s) => s.heldCompound());
  const analysis = useGame((s) => s.analysis);
  const modelState = useGame((s) => s.modelStatus.state);
  const analyze = useGame((s) => s.analyzeHeldVial);
  const returnVial = useGame((s) => s.returnVial);
  const openPanel = useGame((s) => s.openPanel);
  const close = useGame((s) => s.closePanel);
  const [models, setModels] = useState<ModelId[]>(AML.map((m) => m.id));
  const [customOpen, setCustomOpen] = useState(false);

  if (!compound || customOpen) {
    return (
      <div className="space-y-4">
        {!compound && (
          <div className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-3 text-xs text-lab-300">
            <Icon name="vial" className="mt-0.5 h-4 w-4 shrink-0 text-lab-400" />
            <span>No sample loaded. Either fetch a vial from Chemical Storage (walk west, look at a vial, press E → Pick up), or type any molecule below.</span>
          </div>
        )}
        <CustomMoleculeForm onDone={() => setCustomOpen(false)} onCancel={compound ? () => setCustomOpen(false) : close} />
      </div>
    );
  }

  const running = analysis.state === 'running';
  return (
    <div className="space-y-4">
      <ModelStatusBanner />
      <div className="grid gap-4 sm:grid-cols-[170px_1fr]">
        <MoleculeView2D smiles={compound.canonicalSmiles ?? compound.smiles} height={140} />
        <div className="space-y-3">
          <div>
            <div className="flex items-center gap-2 text-xs text-lab-400">
              Loaded sample {compound.origin === 'custom' && <span className="rounded bg-accent-500/15 px-1.5 text-[10px] font-semibold text-accent-300">CUSTOM</span>}
            </div>
            <div className="text-lg font-semibold text-white">{compound.name}</div>
            <code className="mono break-all text-[11px] text-lab-400">{compound.canonicalSmiles ?? compound.smiles}</code>
          </div>
          <fieldset disabled={running}>
            <legend className="label">Models (Morgan fingerprints)</legend>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {AML.map((m) => (
                <label key={m.id} className="flex items-center gap-2 text-sm text-lab-100">
                  <input type="checkbox" className="accent-accent-500" checked={models.includes(m.id)}
                    onChange={() => setModels(models.includes(m.id) ? models.filter((x) => x !== m.id) : [...models, m.id])} />
                  {m.name}
                </label>
              ))}
              <label className="flex items-center gap-2 text-sm text-lab-400" title="Member 4's GCN is not trained yet">
                <input type="checkbox" disabled /> Graph Neural Network (pending)
              </label>
            </div>
          </fieldset>
        </div>
      </div>

      {analysis.log.length > 0 && (
        <ol className="mono space-y-0.5 rounded-lg bg-ink-950/70 p-3 text-[11px] text-lab-200">
          {analysis.log.map((l, i) => <li key={i}><span className="text-ok-400">✓</span> {l.message}</li>)}
        </ol>
      )}
      {analysis.state === 'error' && <p className="rounded-lg border border-danger-500/30 bg-danger-500/10 p-2 text-xs text-danger-400">{analysis.error}</p>}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <button className="btn-ghost text-xs" disabled={running} onClick={() => setCustomOpen(true)}><Icon name="plus" className="h-3.5 w-3.5" /> Use a custom molecule</button>
        <div className="flex flex-wrap gap-2">
          <button className="btn-ghost" disabled={running} onClick={() => { returnVial(); close(); }}>{compound.origin === 'custom' ? 'Unload sample' : 'Return vial to shelf'}</button>
          {analysis.state === 'done' ? (
            <button className="btn-primary" autoFocus onClick={() => openPanel('results')}>View report</button>
          ) : (
            <button className="btn-primary" disabled={running || !models.length || modelState !== 'ready'} onClick={() => void analyze(models)}>
              <Icon name="play" /> {running ? 'Running…' : 'Run analysis'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Type a name and a SMILES; RDKit checks it, and it becomes the loaded sample. */
function CustomMoleculeForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const load = useGame((s) => s.loadCustomMolecule);
  const [name, setName] = useState('');
  const [smiles, setSmiles] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError(undefined);
    const r = await load(name, smiles);
    setBusy(false);
    if (r.ok) onDone();
    else setError(r.error);
  };

  return (
    <div className="space-y-3">
      <div className="h-section">Custom molecule</div>
      <div className="grid gap-4 sm:grid-cols-[1fr_170px]">
        <div className="space-y-3">
          <div>
            <label className="label" htmlFor="custom-name">Name (optional)</label>
            <input id="custom-name" className="input" value={name} maxLength={80} placeholder="e.g. My compound" onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="custom-smiles">SMILES</label>
            <input id="custom-smiles" className="input mono" value={smiles} maxLength={2000} placeholder="e.g. CC(=O)Oc1ccccc1C(=O)O" spellCheck={false} autoFocus
              onChange={(e) => { setSmiles(e.target.value); setError(undefined); }}
              onKeyDown={(e) => e.key === 'Enter' && smiles.trim() && !busy && void submit()} />
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
              <span className="text-lab-400">Try:</span>
              {EXAMPLES.map((ex) => (
                <button key={ex.name} className="rounded-full border border-white/10 px-2 py-0.5 text-lab-300 hover:border-white/30" onClick={() => { setName(ex.name); setSmiles(ex.smiles); setError(undefined); }}>{ex.name}</button>
              ))}
            </div>
          </div>
        </div>
        {smiles.trim() ? <MoleculeView2D smiles={smiles} height={140} /> : <div className="grid h-[140px] place-items-center rounded-xl border border-dashed border-white/10 text-[11px] text-lab-400">Structure preview</div>}
      </div>
      {error && <p className="rounded-lg border border-danger-500/30 bg-danger-500/10 p-2 text-xs text-danger-400">{error}</p>}
      <p className="text-[11px] text-lab-400">RDKit checks the structure first. Salts are reduced to the largest fragment, exactly as in training.</p>
      <div className="flex justify-end gap-2">
        <button className="btn-ghost" onClick={onCancel}>Cancel</button>
        <button className="btn-primary" disabled={!smiles.trim() || busy} onClick={() => void submit()}>{busy ? 'Checking…' : 'Load into analyzer'}</button>
      </div>
    </div>
  );
}
