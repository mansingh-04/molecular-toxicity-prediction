import type { MorganFingerprint } from '@/types/chemistry';
import type { CompoundInput, ValidationEngine, ValidationResult } from '@/types/compound';

export interface ChemistryEngineStatus {
  engine: ValidationEngine;
  ready: boolean;
  version?: string;
  message: string;
}

/**
 * Chemistry service contract. The UI depends only on this interface; implementations may be
 * in-browser RDKit.js, a server-side RDKit API, or the demo parser.
 */
export interface ChemistryService {
  status(): Promise<ChemistryEngineStatus>;
  validateCompound(input: CompoundInput): Promise<ValidationResult>;
  /** Returns an SVG depiction, or null if this engine cannot depict. */
  depictSvg(smiles: string, width: number, height: number): Promise<string | null>;
  /** Returns a Morgan fingerprint, or null if this engine cannot compute one. */
  morganFingerprint(smiles: string, radius: number, nBits: number): Promise<MorganFingerprint | null>;
}
