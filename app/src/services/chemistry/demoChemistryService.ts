import type { CompoundInput, ValidationResult } from '@/types/compound';
import type { ChemistryService } from './types';
import { formulaFromGraph, heavyAtomCount, molecularWeightFromGraph, parseSmiles } from './smilesParser';

/**
 * DEMO validator. Uses the built-in SMILES parser for syntax, ring/branch and valence checks.
 * Successful results are marked 'unverified' because no sanitisation, aromaticity perception
 * or canonicalisation is performed.
 */
export class DemoChemistryService implements ChemistryService {
  async status() {
    return { engine: 'demo-parser' as const, ready: true, message: 'Demo SMILES parser (syntax and basic valence checks only; no canonicalisation).' };
  }

  async validateCompound(input: CompoundInput): Promise<ValidationResult> {
    const smiles = input.smiles.trim();
    const parsed = parseSmiles(smiles);
    if (!parsed.graph) {
      return { status: 'invalid', engine: 'demo-parser', input: smiles, errors: parsed.errors, warnings: parsed.warnings };
    }
    const g = parsed.graph;
    return {
      status: 'unverified',
      engine: 'demo-parser',
      input: smiles,
      formula: formulaFromGraph(g),
      molecularWeight: molecularWeightFromGraph(g),
      descriptors: { NumHeavyAtoms: heavyAtomCount(g), NumRings: g.rings, NumFragments: g.components },
      errors: [],
      warnings: [
        ...parsed.warnings,
        'Validated by the demo parser only. Canonical SMILES and chemical sanitisation require RDKit.',
      ],
    };
  }

  async depictSvg() {
    return null;
  }

  async morganFingerprint() {
    return null;
  }
}
