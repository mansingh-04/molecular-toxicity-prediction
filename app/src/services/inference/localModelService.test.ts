// @vitest-environment node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import initRDKitModule from '@rdkit/rdkit/dist/RDKit_minimal.js';
import type { RDKitModule } from '@rdkit/rdkit';

/**
 * The lab's own code path, end to end: the analyzer calls analysisService.runAnalysis, which cleans
 * the structure, computes the fingerprint, builds the molecular graph and runs all four models.
 *
 * parity.test.ts and gcnParity.test.ts check the model maths on every held-out molecule; this test
 * checks the service that the lab actually calls, including that the GCN branch is wired up and
 * returns the probabilities the notebook saved.
 */
const ROOT = join(__dirname, '..', '..', '..');

let rdkit: RDKitModule;
vi.mock('@/services/chemistry/rdkitLoader', () => ({ loadRDKit: async () => rdkit }));

// The service fetches its model files from the site root; in node, serve them from public/.
const originalFetch = globalThis.fetch;
beforeAll(async () => {
  rdkit = (await (initRDKitModule as unknown as () => Promise<RDKitModule>)()) as RDKitModule;
  globalThis.fetch = (async (url: string) => {
    const file = join(ROOT, 'public', String(url).replace(/^\//, ''));
    const body = readFileSync(file);
    return {
      ok: true,
      status: 200,
      json: async () => JSON.parse(body.toString('utf8')),
      arrayBuffer: async () => body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength),
    };
  }) as unknown as typeof fetch;
});
afterAll(() => {
  globalThis.fetch = originalFetch;
});

function readCsv(path: string): Record<string, string>[] {
  const [head, ...lines] = readFileSync(path, 'utf8').trim().split('\n');
  const cols = head.split(',');
  return lines.map((l) => Object.fromEntries(l.split(',').map((v, i) => [cols[i], v])));
}

describe('the analysis service the lab calls', () => {
  it('runs all four models on one molecule and matches the notebooks', async () => {
    const { LocalModelService } = await import('./localModelService');
    const molecule = readCsv(join(ROOT, 'backend', 'artifacts', 'data', 'tox21_clean.csv')).find((r) => r.split === 'test')!;
    const saved = Object.fromEntries((['logreg', 'rf', 'xgboost', 'gnn'] as const).map((model) => {
      const file = model === 'gnn'
        ? join(ROOT, 'backend', 'artifacts', 'results', 'gnn', 'predictions', 'gnn_graph_test.csv')
        : join(ROOT, 'backend', 'artifacts', 'results',
               { logreg: 'logistic_regression', rf: 'random_forest', xgboost: 'xgboost' }[model],
               'predictions', `${{ logreg: 'lr', rf: 'rf', xgboost: 'xgb' }[model]}_morgan_test.csv`);
      const rows = readCsv(file).filter((r) => r.mol_id === molecule.mol_id);
      return [model, new Map(rows.map((r) => [r.endpoint, Number(r.y_prob)]))];
    }));

    const result = await new LocalModelService().runAnalysis(
      { compoundId: 'c', smiles: molecule.smiles_original },
      { mode: 'comparison', models: ['logreg', 'rf', 'xgboost', 'gnn'], featureSet: 'morgan' },
      { experimentId: 'test' },
    );

    expect(result.canonicalSmiles).toBe(molecule.smiles);
    expect(result.predictions).toHaveLength(48);          // 4 models x 12 assays
    expect(result.predictions.every((p) => p.status === 'ok')).toBe(true);

    let worst = 0;
    for (const p of result.predictions) {
      const want = saved[p.modelId].get(p.endpointId)!;
      expect(want).toBeDefined();
      worst = Math.max(worst, Math.abs(p.score! - want));
    }
    expect(worst).toBeLessThan(1e-5);

    const gcn = result.predictions.filter((p) => p.modelId === 'gnn');
    expect(gcn).toHaveLength(12);
    expect(gcn.every((p) => p.featureSet === 'graph')).toBe(true);
    expect(gcn.every((p) => typeof p.baseRate === 'number')).toBe(true);
    expect(result.log.some((l) => l.message.includes('Molecular graph built'))).toBe(true);
  }, 60000);

  it('can run the GCN on its own', async () => {
    const { LocalModelService } = await import('./localModelService');
    const result = await new LocalModelService().runAnalysis(
      { compoundId: 'c', smiles: 'CC(=O)Nc1ccc(O)cc1' },
      { mode: 'dl', models: ['gnn'], featureSet: 'graph' },
      { experimentId: 'test' },
    );
    expect(result.predictions).toHaveLength(12);
    expect(result.featureSet).toBe('graph');
    expect(result.predictions.every((p) => p.status === 'ok' && p.score! > 0 && p.score! < 1)).toBe(true);
  }, 60000);

  it('reports every model as available, the GCN on the graph', async () => {
    const { LocalModelService } = await import('./localModelService');
    const models = await new LocalModelService().listModels();
    expect(models.map((m) => m.modelId)).toEqual(['logreg', 'rf', 'xgboost', 'gnn']);
    expect(models.every((m) => m.available)).toBe(true);
    const gcn = models.find((m) => m.modelId === 'gnn')!;
    expect(gcn.featureSets).toEqual([{ id: 'graph', available: true }]);
    expect(gcn.evaluation!.length).toBe(24);              // validation and test, 12 assays each
  }, 60000);
});
