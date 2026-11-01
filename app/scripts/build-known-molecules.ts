/**
 * Builds public/data/known.json: every Tox21 molecule keyed by the canonical SMILES that the
 * website's own RDKit.js produces, with its split and measured labels. The website uses it to
 * flag molecules the models were trained or evaluated on.
 *   Run: npx vite-node scripts/build-known-molecules.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import initRDKitModule from '@rdkit/rdkit/dist/RDKit_minimal.js';
import type { RDKitModule } from '@rdkit/rdkit';
import { featurize } from '../src/services/inference/featurize';

const rdkit = (await (initRDKitModule as unknown as () => Promise<RDKitModule>)()) as RDKitModule;
const [head, ...lines] = readFileSync('backend/artifacts/data/tox21_clean.csv', 'utf8').trim().split('\n');
const cols = head.split(',');
const endpoints = cols.slice(5);
const known: Record<string, { id: string; split: string; labels: (0 | 1 | null)[] }> = {};
for (const line of lines) {
  const v = line.split(',');
  const { canonicalSmiles } = featurize(rdkit, v[cols.indexOf('smiles_original')]);
  known[canonicalSmiles] = {
    id: v[0].split(';')[0],
    split: v[cols.indexOf('split')],
    labels: endpoints.map((_, i) => (v[5 + i] === '' ? null : (Number(v[5 + i]) as 0 | 1))),
  };
}
writeFileSync('public/data/known.json', JSON.stringify({ endpoints, molecules: known }));
console.log(`known.json: ${Object.keys(known).length} molecules`);
