import type { RDKitModule } from '@rdkit/rdkit';

/**
 * Turns a standardised SMILES into the molecular graph the GCN was trained on.
 *
 * Every atom feature here is read from RDKit's own JSON export, so the browser computes exactly
 * the same numbers as Python RDKit did in notebook 04. That was checked atom by atom on all 7,708
 * Tox21 molecules (140,937 atoms), and end to end in gcnParity.test.ts.
 *
 * Note for anyone extending this: RDKit's JSON does NOT carry hybridisation, which is derived
 * internally from its conjugation perception. That is why the model uses multiple-bond count and
 * total valence instead — see notebook 04, section 4.
 */

/** The feature vocabulary, exported with the weights so the two can never drift apart. */
export interface AtomFeatureSpec {
  elementsZ: number[];
  degrees: number[];
  charges: number[];
  numHs: number[];
  piBonds: number[];
  valences: number[];
  nFeatures: number;
}

export interface MolGraph {
  /** nAtoms x nFeatures, row-major. */
  x: Float64Array;
  nAtoms: number;
  nFeatures: number;
  /** neighbours[i] lists the atoms bonded to atom i (both directions, no self-loop). */
  neighbours: number[][];
  /** 1 / sqrt(degree + 1) per atom, the symmetric normalisation D^-1/2 with the self-loop. */
  invSqrtDegree: Float64Array;
}

/** RDKit's JSON ("commonchem") shape, as far as this file uses it. */
interface RDKitJson {
  molecules: {
    atoms: { z?: number; chg?: number; impHs?: number }[];
    bonds?: { bo?: number; atoms: [number, number] }[];
    extensions?: { aromaticAtoms?: number[]; aromaticBonds?: number[]; atomRings?: number[][] }[];
  }[];
}

/** One-hot index: the matching slot, or the trailing "other" bucket. */
function slot(value: number, options: number[]): number {
  const i = options.indexOf(value);
  return i < 0 ? options.length : i;
}

export function graphFromSmiles(rdkit: RDKitModule, smiles: string, spec: AtomFeatureSpec): MolGraph {
  const mol = rdkit.get_mol(smiles);
  if (!mol || !mol.is_valid()) {
    mol?.delete();
    throw new Error(`RDKit could not read the SMILES '${smiles}'.`);
  }
  let parsed: RDKitJson;
  try {
    parsed = JSON.parse(mol.get_json()) as RDKitJson;
  } finally {
    mol.delete();
  }
  const molecule = parsed.molecules[0];
  const atoms = molecule.atoms;
  const bonds = molecule.bonds ?? [];
  const extension = molecule.extensions?.[0] ?? {};
  const aromatic = new Set(extension.aromaticAtoms ?? []);
  const inRing = new Set((extension.atomRings ?? []).flat());
  const nAtoms = atoms.length;
  if (!nAtoms) throw new Error('The molecule has no atoms.');

  const aromaticBonds = new Set(extension.aromaticBonds ?? []);
  const neighbours: number[][] = Array.from({ length: nAtoms }, () => []);
  const piBondCount = new Int32Array(nAtoms);
  const bondOrderSum = new Int32Array(nAtoms);
  bonds.forEach((bond, index) => {
    const [a, b] = bond.atoms;
    const order = bond.bo ?? 1;          // RDKit writes Kekule orders, with aromaticity flagged separately
    neighbours[a].push(b);
    neighbours[b].push(a);
    bondOrderSum[a] += order;
    bondOrderSum[b] += order;
    // Python sees an aromatic bond as order 1.5, so it is NOT a multiple bond there. The JSON gives
    // it a Kekule order of 1 or 2 instead, so aromatic bonds must be excluded here to match.
    if (order >= 2 && !aromaticBonds.has(index)) {
      piBondCount[a] += 1;
      piBondCount[b] += 1;
    }
  });

  // Block layout must match feature_names() in notebook 04, in this order.
  const blocks: { options: number[]; value: (i: number) => number }[] = [
    { options: spec.elementsZ, value: (i) => atoms[i].z ?? 6 },
    { options: spec.degrees, value: (i) => neighbours[i].length + (atoms[i].impHs ?? 0) },  // total degree, Hs included
    { options: spec.charges, value: (i) => atoms[i].chg ?? 0 },
    { options: spec.numHs, value: (i) => atoms[i].impHs ?? 0 },
    { options: spec.piBonds, value: (i) => piBondCount[i] },
    { options: spec.valences, value: (i) => bondOrderSum[i] + (atoms[i].impHs ?? 0) },      // total valence
  ];

  const x = new Float64Array(nAtoms * spec.nFeatures);
  const invSqrtDegree = new Float64Array(nAtoms);
  for (let i = 0; i < nAtoms; i++) {
    let offset = i * spec.nFeatures;
    for (const block of blocks) {
      x[offset + slot(block.value(i), block.options)] = 1;
      offset += block.options.length + 1;
    }
    x[offset] = aromatic.has(i) ? 1 : 0;
    x[offset + 1] = inRing.has(i) ? 1 : 0;
    if (offset + 2 - i * spec.nFeatures !== spec.nFeatures) {
      throw new Error(`Atom feature layout mismatch: built ${offset + 2 - i * spec.nFeatures}, expected ${spec.nFeatures}`);
    }
    invSqrtDegree[i] = 1 / Math.sqrt(neighbours[i].length + 1);   // +1 for the self-loop in A + I
  }
  return { x, nAtoms, nFeatures: spec.nFeatures, neighbours, invSqrtDegree };
}
