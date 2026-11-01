import { formulaFromGraph, molecularWeightFromGraph, parseSmiles, heavyAtomCount } from './smilesParser';
import { DemoChemistryService } from './demoChemistryService';

const f = (s: string) => {
  const r = parseSmiles(s);
  if (!r.graph) throw new Error(r.errors.join('; '));
  return { formula: formulaFromGraph(r.graph), mw: molecularWeightFromGraph(r.graph), g: r.graph };
};

describe('SMILES parser (demo)', () => {
  it.each([
    ['CCO', 'C2H6O', 46.07],
    ['CC(=O)O', 'C2H4O2', 60.05],
    ['c1ccccc1', 'C6H6', 78.11],
    ['CC(=O)Oc1ccccc1C(=O)O', 'C9H8O4', 180.16],
    ['Cn1c(=O)c2c(ncn2C)n(C)c1=O', 'C8H10N4O2', 194.19],
    ['CC(C)Cc1ccc(cc1)C(C)C(=O)O', 'C13H18O2', 206.28],
    ['CN1CCC[C@H]1c1cccnc1', 'C10H14N2', 162.24],
    ['ClC(Cl)Cl', 'CHCl3', 119.37],
    ['[Na+].[Cl-]', 'ClNa', 58.44],
  ])('%s -> %s', (smiles, formula, mw) => {
    const r = f(smiles);
    expect(r.formula).toBe(formula);
    expect(r.mw).toBeCloseTo(mw, 1);
  });

  it('counts rings and heavy atoms', () => {
    const { g } = f('CC(C)(c1ccc(O)cc1)c1ccc(O)cc1');
    expect(g.rings).toBe(2);
    expect(heavyAtomCount(g)).toBe(17);
  });

  it.each([
    ['', 'empty'],
    ['C1CC', 'Unclosed ring'],
    ['C(C', 'unclosed branch'],
    ['CC)', "Unmatched ')'"],
    ['C(C)(C)(C)(C)C', 'Valence'],
    ['CC=', 'dangling'],
    ['c1cccc', 'Unclosed ring'],
    ['CXC', 'Unexpected character'],
    ['C C', 'whitespace'],
    ['[Xx]', 'not supported'],
    ['[C@@@H]', 'Cannot parse bracket atom'],
    ['cC', 'aromatic ring'],
  ])('rejects %j', (smiles, msg) => {
    const r = parseSmiles(smiles);
    expect(r.graph).toBeUndefined();
    expect(r.errors.join(' ').toLowerCase()).toContain(msg.toLowerCase());
  });

  it('demo service marks valid structures as unverified, never validated', async () => {
    const svc = new DemoChemistryService();
    const ok = await svc.validateCompound({ smiles: 'CCO' });
    expect(ok.status).toBe('unverified');
    expect(ok.canonicalSmiles).toBeUndefined();
    const bad = await svc.validateCompound({ smiles: 'not a smiles' });
    expect(bad.status).toBe('invalid');
  });
});

import { STARTER_COMPOUNDS } from '@/data/starterCompounds';

describe('starter catalogue structures', () => {
  it.each(STARTER_COMPOUNDS.map((c) => [c.name, c.smiles]))('%s parses', (_name, smiles) => {
    const r = parseSmiles(smiles);
    expect(r.errors).toEqual([]);
  });

  it.each([
    ['C[C@]12CC[C@H]3[C@@H](CCc4cc(O)ccc34)[C@@H]1CC[C@@H]2O', 'C18H24O2'],
    ['C[C@]12CC[C@H]3[C@@H](CCC4=CC(=O)CC[C@]34C)[C@@H]1CC[C@@H]2O', 'C19H28O2'],
    ['C1=CC=C2C3=C4C(=CC2=C1)C=CC5=C4C(=CC=C5)C=C3', 'C20H12'],
    ['OC(=O)C(F)(F)C(F)(F)C(F)(F)C(F)(F)C(F)(F)C(F)(F)C(F)(F)F', 'C8HF15O2'],
    ['ClC(Cl)(Cl)C(c1ccc(Cl)cc1)c1ccc(Cl)cc1', 'C14H9Cl5'],
    ['OC(=O)CNCP(=O)(O)O', 'C3H8NO5P'],
    ['CC/C(=C(\\c1ccccc1)c1ccc(OCCN(C)C)cc1)c1ccccc1', 'C26H29NO'],
  ])('%s -> %s', (smiles, formula) => {
    expect(f(smiles).formula).toBe(formula);
  });
});
