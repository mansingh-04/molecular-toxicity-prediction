import type { RDKitModule, JSMol } from '@rdkit/rdkit';

export class InvalidSmilesError extends Error {}

export interface Featurized {
  canonicalSmiles: string;
  /** 2048 Morgan fingerprint bits (radius 2), 0 or 1. */
  bits: Uint8Array;
  notes: string[];
}

/** RDKit.js functions that exist at runtime but are missing from its type definitions. */
interface JSMolList {
  size(): number;
  at(i: number): JSMol;
  delete(): void;
}
type FullJSMol = JSMol & { get_num_atoms(): number; get_frags(): { molList: JSMolList } };

const heavyAtoms = (m: JSMol) => (JSON.parse(m.get_descriptors()) as { NumHeavyAtoms: number }).NumHeavyAtoms;

/**
 * Same steps as Member 1's cleaning and Member 2's features, done with RDKit.js:
 * parse -> keep the fragment with the most heavy atoms -> canonical SMILES -> Morgan fingerprint
 * (radius 2, 2048 bits). Checked to give bit-identical fingerprints to Python RDKit on all 7,708
 * Tox21 molecules (src/services/inference/parity.test.ts).
 */
export function featurize(rdkit: RDKitModule, smiles: string, radius = 2, nBits = 2048): Featurized {
  const input = smiles.trim();
  if (!input) throw new InvalidSmilesError('The SMILES string is empty.');
  const mol = rdkit.get_mol(input) as FullJSMol | null;
  if (!mol || !mol.is_valid() || mol.get_num_atoms() === 0) {
    mol?.delete();
    throw new InvalidSmilesError(`RDKit could not read the SMILES '${input}'. Check brackets, ring numbers and atom symbols.`);
  }
  const notes: string[] = [];
  const toDelete: JSMol[] = [mol];
  let chosen: JSMol = mol;
  const { molList } = mol.get_frags();
  if (molList.size() > 1) {
    let most = -1;
    for (let i = 0; i < molList.size(); i++) {
      const frag = molList.at(i);
      toDelete.push(frag);
      const n = heavyAtoms(frag);
      if (n > most) {
        most = n;
        chosen = frag;
      }
    }
    notes.push('Input had several fragments; only the largest fragment was kept (salt stripping).');
  }
  molList.delete();
  const canonicalSmiles = chosen.get_smiles();
  toDelete.forEach((m) => m.delete());

  // Member 2 computed fingerprints from the canonical SMILES string, so re-read it the same way.
  const clean = rdkit.get_mol(canonicalSmiles)!;
  const text = clean.get_morgan_fp(JSON.stringify({ radius, nBits }));
  clean.delete();
  const bits = new Uint8Array(nBits);
  for (let i = 0; i < nBits; i++) bits[i] = text.charCodeAt(i) === 49 ? 1 : 0; // '1'
  return { canonicalSmiles, bits, notes };
}
