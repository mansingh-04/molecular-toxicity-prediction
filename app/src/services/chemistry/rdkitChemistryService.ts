import type { JSMol, RDKitModule } from '@rdkit/rdkit';
import type { CompoundDescriptors, CompoundInput, ValidationResult } from '@/types/compound';
import type { MorganFingerprint } from '@/types/chemistry';
import type { ChemistryService } from './types';
import { loadRDKit, rdkitLoadError } from './rdkitLoader';
import { formulaFromGraph, parseSmiles } from './smilesParser';

/** Descriptor keys reported by RDKit MinimalLib that ToxiLab displays. */
export const DESCRIPTOR_LABELS: Record<string, string> = {
  amw: 'Average mol. weight',
  exactmw: 'Exact mass',
  NumHeavyAtoms: 'Heavy atoms',
  NumHBD: 'H-bond donors',
  NumHBA: 'H-bond acceptors',
  NumRotatableBonds: 'Rotatable bonds',
  NumRings: 'Rings',
  NumAromaticRings: 'Aromatic rings',
  NumHeteroatoms: 'Heteroatoms',
  FractionCSP3: 'Fraction sp³ C',
  tpsa: 'TPSA (Å²)',
  CrippenClogP: 'Crippen cLogP',
  CrippenMR: 'Crippen MR',
  NumFragments: 'Fragments',
};

function withMol<T>(rd: RDKitModule, smiles: string, fn: (m: JSMol) => T): T | null {
  let mol: JSMol | null = null;
  try {
    mol = rd.get_mol(smiles);
    if (!mol || !mol.is_valid()) return null;
    return fn(mol);
  } catch {
    return null;
  } finally {
    mol?.delete();
  }
}

/** In-browser RDKit (MinimalLib WASM) validation, canonicalisation, descriptors, depiction and fingerprints. */
export class RDKitChemistryService implements ChemistryService {
  private rd(): Promise<RDKitModule | null> {
    return loadRDKit();
  }

  async status() {
    const rd = await this.rd();
    if (!rd) return { engine: 'rdkit-wasm' as const, ready: false, message: rdkitLoadError() ?? 'RDKit.js unavailable.' };
    return { engine: 'rdkit-wasm' as const, ready: true, version: rd.version(), message: `RDKit.js ${rd.version()} (in-browser WASM)` };
  }

  async validateCompound(input: CompoundInput): Promise<ValidationResult> {
    const smiles = input.smiles.trim();
    const rd = await this.rd();
    if (!rd) throw new Error(rdkitLoadError() ?? 'RDKit.js unavailable');
    if (!smiles) return { status: 'invalid', engine: 'rdkit-wasm', input: smiles, errors: ['SMILES is empty.'], warnings: [] };
    if (/\s/.test(smiles)) return { status: 'invalid', engine: 'rdkit-wasm', input: smiles, errors: ['SMILES must not contain whitespace.'], warnings: [] };
    const out = withMol(rd, smiles, (mol) => {
      const canonical = mol.get_smiles();
      const raw = JSON.parse(mol.get_descriptors()) as Record<string, number>;
      const descriptors: CompoundDescriptors = {};
      for (const k of Object.keys(DESCRIPTOR_LABELS)) if (typeof raw[k] === 'number') descriptors[k] = raw[k];
      return { canonical, descriptors, amw: raw.amw };
    });
    if (!out) {
      // Use the demo parser only to give a more specific hint; RDKit's rejection is authoritative.
      const hint = parseSmiles(smiles).errors[0];
      return {
        status: 'invalid',
        engine: 'rdkit-wasm',
        input: smiles,
        errors: ['RDKit could not parse or sanitise this SMILES.', ...(hint ? [`Hint: ${hint}`] : [])],
        warnings: [],
      };
    }
    const parsed = parseSmiles(out.canonical);
    const warnings: string[] = [];
    if (parsed.graph && parsed.graph.components > 1) {
      warnings.push(`Structure has ${parsed.graph.components} disconnected fragments (salt or mixture). Standardisation (salt stripping) is not applied.`);
      out.descriptors.NumFragments = parsed.graph.components;
    }
    return {
      status: 'validated',
      engine: 'rdkit-wasm',
      input: smiles,
      canonicalSmiles: out.canonical,
      formula: parsed.graph ? formulaFromGraph(parsed.graph) : undefined,
      molecularWeight: typeof out.amw === 'number' ? Math.round(out.amw * 1000) / 1000 : undefined,
      descriptors: out.descriptors,
      errors: [],
      warnings,
    };
  }

  async depictSvg(smiles: string, width: number, height: number) {
    const rd = await this.rd();
    if (!rd) return null;
    return withMol(rd, smiles, (mol) =>
      mol.get_svg_with_highlights(JSON.stringify({ width, height, clearBackground: false, bondLineWidth: 1.6, addStereoAnnotation: true })),
    );
  }

  async morganFingerprint(smiles: string, radius: number, nBits: number): Promise<MorganFingerprint | null> {
    const rd = await this.rd();
    if (!rd) return null;
    return withMol(rd, smiles, (mol) => {
      const bits = mol.get_morgan_fp(JSON.stringify({ radius, nBits }));
      const onBits: number[] = [];
      for (let i = 0; i < bits.length; i++) if (bits[i] === '1') onBits.push(i);
      return { radius, nBits, onBits };
    });
  }
}
