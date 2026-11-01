/** Lightweight molecular graph used for schematic depiction and the graph view. */
export interface GraphAtom {
  index: number;
  element: string;
  aromatic: boolean;
  charge: number;
  hydrogens: number;
  isotope?: number;
  bracket: boolean;
}

export type BondOrder = 1 | 2 | 3 | 1.5;

export interface GraphBond {
  a: number;
  b: number;
  order: BondOrder;
}

export interface MolecularGraph {
  atoms: GraphAtom[];
  bonds: GraphBond[];
  components: number;
  rings: number;
}

export interface MorganFingerprint {
  radius: number;
  nBits: number;
  onBits: number[];
}
