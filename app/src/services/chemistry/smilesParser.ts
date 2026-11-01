import type { BondOrder, GraphAtom, GraphBond, MolecularGraph } from '@/types/chemistry';

/**
 * Minimal SMILES parser (OpenSMILES subset).
 *
 * Purpose: build a molecular graph for schematic depiction and the graph view, and act as a
 * clearly-labelled DEMO validator when RDKit is unavailable. It checks syntax, ring closures,
 * branch balance, supported elements and organic-subset valences. It does NOT perform
 * aromaticity perception, kekulisation, stereo validation or canonicalisation — those need RDKit.
 */

export const ATOMIC_MASS: Record<string, number> = {
  H: 1.008, He: 4.0026, Li: 6.94, Be: 9.0122, B: 10.81, C: 12.011, N: 14.007, O: 15.999, F: 18.998,
  Na: 22.99, Mg: 24.305, Al: 26.982, Si: 28.085, P: 30.974, S: 32.06, Cl: 35.45, K: 39.098, Ca: 40.078,
  Fe: 55.845, Co: 58.933, Ni: 58.693, Cu: 63.546, Zn: 65.38, As: 74.922, Se: 78.971, Br: 79.904,
  Ag: 107.87, Sn: 118.71, I: 126.9, Pt: 195.08, Au: 196.97, Hg: 200.59, Pb: 207.2,
};

const ORGANIC = ['Cl', 'Br', 'B', 'C', 'N', 'O', 'P', 'S', 'F', 'I'];
const AROMATIC_ORGANIC = ['b', 'c', 'n', 'o', 'p', 's'];
const DEFAULT_VALENCE: Record<string, number[]> = {
  B: [3], C: [4], N: [3, 5], O: [2], P: [3, 5], S: [2, 4, 6], F: [1], Cl: [1], Br: [1], I: [1],
};

export class SmilesParseError extends Error {
  constructor(message: string, public position: number) {
    super(message);
  }
}

export interface ParseResult {
  graph?: MolecularGraph;
  errors: string[];
  warnings: string[];
}

interface PendingRing {
  atom: number;
  order?: BondOrder;
  pos: number;
}

export function parseSmiles(input: string): ParseResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const s = input.trim();
  if (!s) return { errors: ['SMILES is empty.'], warnings };
  if (/\s/.test(s)) return { errors: ['SMILES must not contain whitespace.'], warnings };

  const atoms: GraphAtom[] = [];
  const bonds: GraphBond[] = [];
  const stack: number[] = [];
  const rings = new Map<number, PendingRing>();
  let prev = -1;
  let pendingBond: BondOrder | undefined;
  let pendingDot = false;
  let i = 0;

  const addAtom = (atom: Omit<GraphAtom, 'index'>, pos: number) => {
    const index = atoms.length;
    atoms.push({ ...atom, index });
    if (prev >= 0 && !pendingDot) {
      const order = pendingBond ?? (atom.aromatic && atoms[prev].aromatic ? 1.5 : 1);
      bonds.push({ a: prev, b: index, order });
    } else if (pendingBond !== undefined) {
      throw new SmilesParseError(`Bond symbol without a preceding atom at position ${pos + 1}.`, pos);
    }
    pendingBond = undefined;
    pendingDot = false;
    prev = index;
  };

  try {
    while (i < s.length) {
      const ch = s[i];
      // bonds
      if ('-=#$:/\\'.includes(ch)) {
        if (prev < 0) throw new SmilesParseError(`Bond '${ch}' at position ${i + 1} has no preceding atom.`, i);
        if (pendingBond !== undefined) throw new SmilesParseError(`Two consecutive bond symbols at position ${i + 1}.`, i);
        pendingBond = ch === '=' ? 2 : ch === '#' ? 3 : ch === '$' ? 3 : ch === ':' ? 1.5 : 1;
        if (ch === '$') warnings.push('Quadruple bond ($) approximated as triple in the demo parser.');
        i++;
        continue;
      }
      if (ch === '.') {
        if (prev < 0 || pendingBond !== undefined) throw new SmilesParseError(`Unexpected '.' at position ${i + 1}.`, i);
        pendingDot = true;
        i++;
        continue;
      }
      if (ch === '(') {
        if (prev < 0) throw new SmilesParseError(`Branch opened before any atom at position ${i + 1}.`, i);
        stack.push(prev);
        i++;
        continue;
      }
      if (ch === ')') {
        if (!stack.length) throw new SmilesParseError(`Unmatched ')' at position ${i + 1}.`, i);
        if (pendingBond !== undefined) throw new SmilesParseError(`Bond symbol before ')' at position ${i + 1}.`, i);
        prev = stack.pop()!;
        i++;
        continue;
      }
      // ring closures
      if (/[0-9%]/.test(ch)) {
        if (prev < 0) throw new SmilesParseError(`Ring-closure digit before any atom at position ${i + 1}.`, i);
        let num: number;
        const start = i;
        if (ch === '%') {
          const m = /^%(\d\d)/.exec(s.slice(i));
          if (!m) throw new SmilesParseError(`'%' must be followed by two digits at position ${i + 1}.`, i);
          num = parseInt(m[1], 10);
          i += 3;
        } else {
          num = parseInt(ch, 10);
          i++;
        }
        const open = rings.get(num);
        if (open) {
          if (open.atom === prev) throw new SmilesParseError(`Ring closure ${num} bonds an atom to itself.`, start);
          if (bonds.some((b) => (b.a === open.atom && b.b === prev) || (b.b === open.atom && b.a === prev)))
            throw new SmilesParseError(`Ring closure ${num} duplicates an existing bond.`, start);
          if (open.order !== undefined && pendingBond !== undefined && open.order !== pendingBond)
            throw new SmilesParseError(`Ring closure ${num} has conflicting bond orders.`, start);
          const order = pendingBond ?? open.order ?? (atoms[prev].aromatic && atoms[open.atom].aromatic ? 1.5 : 1);
          bonds.push({ a: open.atom, b: prev, order });
          rings.delete(num);
        } else {
          rings.set(num, { atom: prev, order: pendingBond, pos: start });
        }
        pendingBond = undefined;
        continue;
      }
      // bracket atom
      if (ch === '[') {
        const end = s.indexOf(']', i);
        if (end < 0) throw new SmilesParseError(`Unclosed '[' at position ${i + 1}.`, i);
        const body = s.slice(i + 1, end);
        const m = /^(\d+)?(Cl|Br|[A-Z][a-z]?|se|as|[bcnops])(@{1,2}(?:TH[12]|AL[12]|SP[123]|TB\d{1,2}|OH\d{1,2})?)?(H\d?)?([+-]{1,2}\d*)?(:\d+)?$/.exec(body);
        if (!m) throw new SmilesParseError(`Cannot parse bracket atom '[${body}]' at position ${i + 1}.`, i);
        const [, iso, sym, , hpart, chg] = m;
        const aromatic = sym === sym.toLowerCase();
        const element = aromatic ? sym[0].toUpperCase() + sym.slice(1) : sym;
        if (!(element in ATOMIC_MASS)) throw new SmilesParseError(`Element '${element}' is not supported by the demo validator.`, i);
        let charge = 0;
        if (chg) {
          const sign = chg[0] === '+' ? 1 : -1;
          const digits = chg.replace(/[+-]/g, '');
          charge = digits ? sign * parseInt(digits, 10) : sign * chg.length;
        }
        const hydrogens = hpart ? (hpart.length > 1 ? parseInt(hpart.slice(1), 10) : 1) : 0;
        addAtom({ element, aromatic, charge, hydrogens, isotope: iso ? parseInt(iso, 10) : undefined, bracket: true }, i);
        i = end + 1;
        continue;
      }
      // organic subset
      const two = s.slice(i, i + 2);
      if (two === 'Cl' || two === 'Br') {
        addAtom({ element: two, aromatic: false, charge: 0, hydrogens: 0, bracket: false }, i);
        i += 2;
        continue;
      }
      if (ORGANIC.includes(ch)) {
        addAtom({ element: ch, aromatic: false, charge: 0, hydrogens: 0, bracket: false }, i);
        i++;
        continue;
      }
      if (AROMATIC_ORGANIC.includes(ch)) {
        addAtom({ element: ch.toUpperCase(), aromatic: true, charge: 0, hydrogens: 0, bracket: false }, i);
        i++;
        continue;
      }
      if (ch === '*') {
        throw new SmilesParseError(`Wildcard atom '*' at position ${i + 1} is not allowed for analysis.`, i);
      }
      throw new SmilesParseError(`Unexpected character '${ch}' at position ${i + 1}.`, i);
    }
    if (pendingBond !== undefined) throw new SmilesParseError('SMILES ends with a dangling bond.', s.length - 1);
    if (pendingDot) throw new SmilesParseError("SMILES ends with '.'.", s.length - 1);
    if (stack.length) throw new SmilesParseError(`${stack.length} unclosed branch(es) '('.`, s.length - 1);
    if (rings.size) {
      const nums = [...rings.keys()].join(', ');
      throw new SmilesParseError(`Unclosed ring bond(s): ${nums}.`, [...rings.values()][0].pos);
    }
  } catch (e) {
    if (e instanceof SmilesParseError) return { errors: [e.message], warnings };
    throw e;
  }

  // valence / implicit hydrogens
  const bondSum = new Array(atoms.length).fill(0);
  const aromaticBonds = new Array(atoms.length).fill(0);
  for (const b of bonds) {
    const contrib = b.order === 1.5 ? 1 : b.order;
    bondSum[b.a] += contrib;
    bondSum[b.b] += contrib;
    if (b.order === 1.5) {
      aromaticBonds[b.a]++;
      aromaticBonds[b.b]++;
    }
  }
  for (const a of atoms) {
    if (a.aromatic && aromaticBonds[a.index] < 2) {
      errors.push(`Aromatic atom ${a.element.toLowerCase()} (#${a.index + 1}) is not part of an aromatic ring.`);
    }
    if (a.bracket) continue;
    const vals = DEFAULT_VALENCE[a.element];
    if (a.aromatic) {
      // Aromatic organic atoms: one valence unit is taken by the delocalised system.
      if (bondSum[a.index] > vals[vals.length - 1]) {
        errors.push(`Valence violation: aromatic ${a.element.toLowerCase()} (#${a.index + 1}) has too many bonds.`);
        continue;
      }
      a.hydrogens = Math.max(0, vals[0] - (bondSum[a.index] + 1));
      continue;
    }
    const used = bondSum[a.index];
    const target = vals.find((v) => v >= used);
    if (target === undefined) {
      errors.push(`Valence violation: ${a.element} (#${a.index + 1}) has ${bondSum[a.index]} bond(s); allowed valence ${vals.join('/')}.`);
      continue;
    }
    a.hydrogens = target - used;
  }

  const components = countComponents(atoms.length, bonds);
  const ringCount = bonds.length - atoms.length + components;
  if (components > 1) warnings.push(`Structure has ${components} disconnected fragments (e.g. a salt or mixture).`);
  if (s.includes('@')) warnings.push('Stereochemistry is read but not validated by the demo parser.');

  if (errors.length) return { errors, warnings };
  return { graph: { atoms, bonds, components, rings: ringCount }, errors, warnings };
}

function countComponents(n: number, bonds: GraphBond[]) {
  const parent = Array.from({ length: n }, (_, i) => i);
  const find = (x: number): number => (parent[x] === x ? x : (parent[x] = find(parent[x])));
  for (const b of bonds) parent[find(b.a)] = find(b.b);
  return new Set(parent.map((_, i) => find(i))).size;
}

/** Hill-system molecular formula from a parsed graph (implicit + explicit hydrogens). */
export function formulaFromGraph(g: MolecularGraph): string {
  const counts: Record<string, number> = {};
  let charge = 0;
  for (const a of g.atoms) {
    counts[a.element] = (counts[a.element] ?? 0) + 1;
    if (a.hydrogens) counts.H = (counts.H ?? 0) + a.hydrogens;
    charge += a.charge;
  }
  const keys = Object.keys(counts);
  const order = counts.C
    ? ['C', ...(counts.H ? ['H'] : []), ...keys.filter((k) => k !== 'C' && k !== 'H').sort()]
    : keys.sort();
  const f = order.map((k) => (counts[k] === 1 ? k : `${k}${counts[k]}`)).join('');
  if (!charge) return f;
  const mag = Math.abs(charge);
  return `${f}${mag === 1 ? '' : mag}${charge > 0 ? '+' : '-'}`;
}

/** Average molecular weight (g/mol) from standard atomic weights. */
export function molecularWeightFromGraph(g: MolecularGraph): number {
  let mw = 0;
  for (const a of g.atoms) {
    mw += ATOMIC_MASS[a.element] + a.hydrogens * ATOMIC_MASS.H;
  }
  return Math.round(mw * 1000) / 1000;
}

export function heavyAtomCount(g: MolecularGraph) {
  return g.atoms.filter((a) => a.element !== 'H').length;
}
