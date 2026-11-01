/** Validation state of a compound structure. */
export type ValidationStatus =
  /** Parsed and sanitized by RDKit (in-browser WASM or server). */
  | 'validated'
  /** Passed the demo parser's syntax/valence checks only — not chemically verified. */
  | 'unverified'
  /** Rejected by the validator. */
  | 'invalid'
  /** Not yet checked. */
  | 'pending';

export type CompoundOrigin = 'builtin' | 'custom' | 'dataset';

export type ValidationEngine = 'rdkit-wasm' | 'rdkit-remote' | 'demo-parser';

export interface CompoundDescriptors {
  [key: string]: number;
}

export interface Compound {
  id: string;
  name: string;
  smiles: string;
  canonicalSmiles?: string;
  formula?: string;
  molecularWeight?: number;
  source: string;
  sourceId?: string;
  category: string;
  tags: string[];
  origin: CompoundOrigin;
  validation: ValidationStatus;
  validationEngine?: ValidationEngine;
  descriptors?: CompoundDescriptors;
  createdAt?: string;
}

/** Input to the chemistry validation service. */
export interface CompoundInput {
  smiles: string;
  name?: string;
}

export interface ValidationResult {
  status: Exclude<ValidationStatus, 'pending'>;
  engine: ValidationEngine;
  input: string;
  canonicalSmiles?: string;
  formula?: string;
  molecularWeight?: number;
  descriptors?: CompoundDescriptors;
  errors: string[];
  warnings: string[];
}
