// @vitest-environment node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import initRDKitModule from '@rdkit/rdkit/dist/RDKit_minimal.js';
import type { RDKitModule } from '@rdkit/rdkit';
import { featurize } from './featurize';
import { graphFromSmiles, type AtomFeatureSpec } from './graphFeaturize';
import { gcnProbabilities, parseGcn, type GcnSpec } from './gcnModel';

/**
 * Proves the browser's GCN gives the same numbers as the trained PyTorch model: every validation
 * and test molecule goes through the browser path (RDKit.js cleaning -> molecular graph -> the
 * forward pass in gcnModel.ts), starting from the RAW SMILES, and is compared with notebook 04's
 * saved probabilities.
 *
 * This is the GCN's counterpart to parity.test.ts, and the reason the model avoids any atom feature
 * that RDKit.js cannot reproduce exactly.
 */
const ROOT = join(__dirname, '..', '..', '..');
const MODELS = join(ROOT, 'public', 'models');
const RESULTS = join(ROOT, 'backend', 'artifacts', 'results', 'gnn');

function readCsv(path: string): Record<string, string>[] {
  const [head, ...lines] = readFileSync(path, 'utf8').trim().split('\n');
  const cols = head.split(',');
  return lines.map((l) => Object.fromEntries(l.split(',').map((v, i) => [cols[i], v])));
}

function savedPredictions(split: string) {
  const map = new Map<string, number>();
  for (const r of readCsv(join(RESULTS, 'predictions', `gnn_graph_${split}.csv`))) {
    if (r.y_prob !== '') map.set(`${r.mol_id}|${r.endpoint}`, Number(r.y_prob));
  }
  return map;
}

let rdkit: RDKitModule;
beforeAll(async () => {
  rdkit = (await (initRDKitModule as unknown as () => Promise<RDKitModule>)()) as RDKitModule;
});

describe('the browser GCN reproduces the PyTorch model', () => {
  const spec = JSON.parse(readFileSync(join(MODELS, 'gcn.json'), 'utf8')) as GcnSpec & {
    atomFeatures: AtomFeatureSpec;
    baseRate: Record<string, number>;
  };
  const bin = readFileSync(join(MODELS, 'gcn.bin'));
  const weights = parseGcn(bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength), spec);

  for (const split of ['val', 'test'] as const) {
    it(`matches every ${split} prediction from the raw SMILES`, () => {
      const molecules = readCsv(join(ROOT, 'backend', 'artifacts', 'data', 'tox21_clean.csv')).filter((r) => r.split === split);
      const saved = savedPredictions(split);
      let worst = 0;
      let compared = 0;
      for (const m of molecules) {
        // the same two steps the lab performs: clean the structure, then build the graph from it
        const { canonicalSmiles } = featurize(rdkit, m.smiles_original);
        const graph = graphFromSmiles(rdkit, canonicalSmiles, spec.atomFeatures);
        const probabilities = gcnProbabilities(weights, graph);
        spec.endpoints.forEach((endpoint, j) => {
          const want = saved.get(`${m.mol_id}|${endpoint}`)!;
          worst = Math.max(worst, Math.abs(probabilities[j] - want));
          compared++;
        });
      }
      console.info(`${split}: ${compared} GCN predictions compared, largest difference ${worst.toExponential(1)}`);
      expect(compared).toBe(molecules.length * spec.endpoints.length);
      // float32 weights accumulated in float64 give differences around 1e-7
      expect(worst).toBeLessThan(1e-5);
    }, 120000);
  }

  it('builds the graph RDKit describes, including rings and aromaticity', () => {
    const graph = graphFromSmiles(rdkit, 'c1ccccc1', spec.atomFeatures);
    expect(graph.nAtoms).toBe(6);
    expect(graph.neighbours.every((n) => n.length === 2)).toBe(true);
    // every benzene atom: aromatic and in a ring, so the last two features are both 1
    for (let i = 0; i < graph.nAtoms; i++) {
      expect(graph.x[i * graph.nFeatures + graph.nFeatures - 2]).toBe(1);
      expect(graph.x[i * graph.nFeatures + graph.nFeatures - 1]).toBe(1);
    }
    // one-hot blocks: exactly one 1 per block, so a benzene carbon has 8 features set
    const firstAtom = Array.from(graph.x.slice(0, graph.nFeatures));
    expect(firstAtom.reduce((a, b) => a + b, 0)).toBe(8);
  });

  it('gives a probability for all 12 assays and treats atom order as irrelevant', () => {
    const a = gcnProbabilities(weights, graphFromSmiles(rdkit, 'CC(=O)Nc1ccc(O)cc1', spec.atomFeatures));
    expect(a).toHaveLength(12);
    expect(Array.from(a).every((p) => p > 0 && p < 1)).toBe(true);
    // the same molecule written from the other end must give the same answer
    const b = gcnProbabilities(weights, graphFromSmiles(rdkit, 'Oc1ccc(NC(C)=O)cc1', spec.atomFeatures));
    for (let i = 0; i < a.length; i++) expect(Math.abs(a[i] - b[i])).toBeLessThan(1e-6);
  });
});
