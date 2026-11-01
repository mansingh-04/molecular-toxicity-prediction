import type { AnalysisResult } from '@/types/analysis';
import { nextStep } from '@/services/lab/guidance';

/**
 * Lab flow through the shared store: pick up a vial -> analyse it -> read the report.
 * The model service is stubbed here; the real models are checked against Python in
 * src/services/inference/parity.test.ts.
 */
vi.mock('@/services/analysis', () => {
  class AnalysisError extends Error {}
  const fakeResult = (smiles: string, models: string[]): AnalysisResult => ({
    id: `res-${Math.random()}`, experimentId: 'x', compoundId: 'c', smiles, canonicalSmiles: smiles, mode: 'aml', models: models as AnalysisResult['models'],
    featureSet: 'morgan', predictions: [], provenance: { kind: 'model', serviceName: 'test', disclaimer: '' }, log: [], startedAt: '', completedAt: '',
  });
  return {
    AnalysisError,
    analysisService: {
      info: () => ({ name: 'test', description: 'test', baseUrl: '/' }),
      health: async () => ({ status: 'ok' }),
      listModels: async () => [],
      runAnalysis: vi.fn(async (input: { smiles: string }, cfg: { models: string[] }, opts: { onProgress?: (p: unknown) => void }) => {
        if (input.smiles === 'bad(') throw new AnalysisError('RDKit could not read the SMILES');
        opts.onProgress?.({ fraction: 1, message: 'done', entry: { at: 0, message: 'Models evaluated.', kind: 'real' } });
        return fakeResult(input.smiles, cfg.models);
      }),
    },
  };
});

const { useGame } = await import('./gameStore');
const g = () => useGame.getState();

beforeEach(async () => {
  useGame.setState({ heldSlotId: undefined, customSample: undefined, analysis: { state: 'idle', log: [] }, results: {} });
  await g().init();
});

describe('lab simulation', () => {
  it('cannot analyse with empty hands', async () => {
    const r = await g().analyzeHeldVial(['logreg']);
    expect(r.ok).toBe(false);
  });

  it('picks up a vial, analyses it and keeps the report', async () => {
    const slot = g().vialSlots().find((v) => v.compoundId === 'cmp-caffeine')!;
    expect(g().pickUpVial(slot.id).ok).toBe(true);
    expect(g().heldCompound()?.name).toBe('Caffeine');

    const r = await g().analyzeHeldVial(['logreg', 'rf', 'xgboost']);
    expect(r.ok).toBe(true);
    const { analysis, results } = g();
    expect(analysis.state).toBe('done');
    expect(results[analysis.resultId!].label).toBe('Caffeine');
    expect(analysis.log).toHaveLength(1);
  });

  it('needs at least one model', async () => {
    g().pickUpVial(g().vialSlots()[0].id);
    expect((await g().analyzeHeldVial([])).ok).toBe(false);
  });

  it('picking another vial clears the previous report; returning empties the hands', async () => {
    const [a, b] = g().vialSlots();
    g().pickUpVial(a.id);
    await g().analyzeHeldVial(['rf']);
    g().pickUpVial(b.id);
    expect(g().analysis.state).toBe('idle');
    g().returnVial();
    expect(g().heldSlotId).toBeUndefined();
  });

  it('loads a custom SMILES at the analyzer and analyses it like a vial', async () => {
    g().pickUpVial(g().vialSlots()[0].id);
    expect((await g().loadCustomMolecule('Ethyl acetate', 'CCOC(C)=O')).ok).toBe(true);
    expect(g().heldSlotId).toBeUndefined(); // the vial went back on its shelf
    expect(g().heldCompound()?.name).toBe('Ethyl acetate');
    expect(g().heldCompound()?.origin).toBe('custom');
    expect((await g().analyzeHeldVial(['logreg'])).ok).toBe(true);
    expect(g().results[g().analysis.resultId!].label).toBe('Ethyl acetate');
  });

  it('rejects an unreadable custom SMILES with a message', async () => {
    const r = await g().loadCustomMolecule('', 'C1CC(');
    expect(r.ok).toBe(false);
    expect(g().customSample).toBeUndefined();
  });
});

describe('next-step guidance', () => {
  it('sends you to storage, then the analyzer, then the report', () => {
    expect(nextStep(undefined, 'idle').target).toBe('storage');
    expect(nextStep('Caffeine', 'idle').target).toBe('analyzer');
    expect(nextStep('Caffeine', 'done').text).toMatch(/report/);
    expect(nextStep('Aspirin', 'idle', true).text).toMatch(/loaded in the analyzer/);
  });
});
