// @vitest-environment node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import initRDKitModule from '@rdkit/rdkit/dist/RDKit_minimal.js';
import type { RDKitModule } from '@rdkit/rdkit';
import { featurize, InvalidSmilesError } from './featurize';
import { boostedProbability, forestProbability, logisticProbability, parseTrees } from './treeModel';

/**
 * Proves the website gives the same numbers as the team's Python models: every validation and
 * test molecule goes through the browser path (RDKit.js cleaning + fingerprint + exported models),
 * starting from the RAW SMILES, and is compared with the notebooks' saved predictions.
 */
const ROOT = join(__dirname, '..', '..', '..');
const MODELS = join(ROOT, 'public', 'models');
const RESULTS = join(ROOT, 'backend', 'artifacts', 'results');

function readCsv(path: string): Record<string, string>[] {
  const [head, ...lines] = readFileSync(path, 'utf8').trim().split('\n');
  const cols = head.split(',');
  return lines.map((l) => Object.fromEntries(l.split(',').map((v, i) => [cols[i], v])));
}

function savedPredictions(file: string) {
  const map = new Map<string, number>();
  for (const r of readCsv(join(RESULTS, file))) if (r.y_prob !== '') map.set(`${r.mol_id}|${r.endpoint}`, Number(r.y_prob));
  return map;
}

let rdkit: RDKitModule;
beforeAll(async () => {
  rdkit = (await (initRDKitModule as unknown as () => Promise<RDKitModule>)()) as RDKitModule;
});

describe('browser models reproduce the Python models', () => {
  const manifest = JSON.parse(readFileSync(join(MODELS, 'manifest.json'), 'utf8'));
  const endpoints: string[] = manifest.endpoints;
  const logreg = JSON.parse(readFileSync(join(MODELS, 'logreg.json'), 'utf8'));
  const trees = (file: string) => {
    const b = readFileSync(join(MODELS, file));
    return parseTrees(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
  };
  const rf = Object.fromEntries(endpoints.map((ep) => [ep, trees(`rf_${ep}.bin`)]));
  const xgb = Object.fromEntries(endpoints.map((ep) => [ep, trees(`xgboost_${ep}.bin`)]));

  for (const split of ['val', 'test'] as const) {
    it(`matches every ${split} prediction from the raw SMILES`, () => {
      const molecules = readCsv(join(ROOT, 'backend', 'artifacts', 'data', 'tox21_clean.csv')).filter((r) => r.split === split);
      const saved = {
        logreg: savedPredictions(`logistic_regression/predictions/lr_morgan_${split}.csv`),
        rf: savedPredictions(`random_forest/predictions/rf_morgan_${split}.csv`),
        xgboost: savedPredictions(`xgboost/predictions/xgb_morgan_${split}.csv`),
      };
      let worst = 0;
      let compared = 0;
      for (const m of molecules) {
        const { bits, canonicalSmiles } = featurize(rdkit, m.smiles_original);
        expect(canonicalSmiles.length).toBeGreaterThan(0);
        for (const ep of endpoints) {
          const got = {
            logreg: logisticProbability(logreg[ep], bits),
            rf: forestProbability(rf[ep], bits),
            xgboost: boostedProbability(xgb[ep], bits, manifest.xgboostBaseMargin[ep]),
          };
          for (const model of ['logreg', 'rf', 'xgboost'] as const) {
            const want = saved[model].get(`${m.mol_id}|${ep}`)!;
            worst = Math.max(worst, Math.abs(got[model] - want));
            compared++;
          }
        }
      }
      console.info(`${split}: ${compared} predictions compared, largest difference ${worst.toExponential(1)}`);
      expect(compared).toBe(molecules.length * endpoints.length * 3);
      // float32 storage of tree leaves gives differences around 1e-7; anything above 1e-5 would be a real mismatch
      expect(worst).toBeLessThan(1e-5);
    }, 120000);
  }

  it('rejects an unreadable SMILES with a clear message', () => {
    expect(() => featurize(rdkit, 'C1CC(')).toThrow(InvalidSmilesError);
  });

  it('strips salts like Member 1 (largest fragment)', () => {
    const r = featurize(rdkit, 'CC(=O)[O-].[Na+]');
    expect(r.canonicalSmiles).toBe('CC(=O)[O-]');
    expect(r.notes).toHaveLength(1);
  });
});
