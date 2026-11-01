import type { CompoundInput, ValidationResult } from '@/types/compound';
import type { MorganFingerprint } from '@/types/chemistry';
import type { ChemistryService } from './types';
import { fetchJson } from '@/services/config';

/**
 * Server-side RDKit API client. Expected endpoints (see README "Backend contract"):
 *   GET  {base}/health                      -> { rdkitVersion: string }
 *   POST {base}/validate   { smiles }       -> ValidationResult-like JSON
 *   POST {base}/depict     { smiles, width, height } -> { svg: string }
 *   POST {base}/fingerprint { smiles, radius, nBits } -> { onBits: number[] }
 */
export class RemoteChemistryService implements ChemistryService {
  constructor(private base: string) {}

  async status() {
    try {
      const h = await fetchJson<{ rdkitVersion?: string }>(`${this.base}/health`, undefined, 5000);
      return { engine: 'rdkit-remote' as const, ready: true, version: h.rdkitVersion, message: `Remote RDKit service ${h.rdkitVersion ?? ''}`.trim() };
    } catch (e) {
      return { engine: 'rdkit-remote' as const, ready: false, message: `Remote chemistry API unreachable: ${(e as Error).message}` };
    }
  }

  async validateCompound(input: CompoundInput): Promise<ValidationResult> {
    const r = await fetchJson<Partial<ValidationResult> & { valid?: boolean }>(`${this.base}/validate`, {
      method: 'POST',
      body: JSON.stringify({ smiles: input.smiles.trim() }),
    });
    const ok = r.status ? r.status === 'validated' : !!r.valid;
    return {
      status: ok ? 'validated' : 'invalid',
      engine: 'rdkit-remote',
      input: input.smiles.trim(),
      canonicalSmiles: r.canonicalSmiles,
      formula: r.formula,
      molecularWeight: r.molecularWeight,
      descriptors: r.descriptors,
      errors: r.errors ?? (ok ? [] : ['Rejected by remote RDKit service.']),
      warnings: r.warnings ?? [],
    };
  }

  async depictSvg(smiles: string, width: number, height: number) {
    try {
      const r = await fetchJson<{ svg: string }>(`${this.base}/depict`, { method: 'POST', body: JSON.stringify({ smiles, width, height }) });
      return r.svg ?? null;
    } catch {
      return null;
    }
  }

  async morganFingerprint(smiles: string, radius: number, nBits: number): Promise<MorganFingerprint | null> {
    try {
      const r = await fetchJson<{ onBits: number[] }>(`${this.base}/fingerprint`, { method: 'POST', body: JSON.stringify({ smiles, radius, nBits }) });
      return { radius, nBits, onBits: r.onBits };
    } catch {
      return null;
    }
  }
}
