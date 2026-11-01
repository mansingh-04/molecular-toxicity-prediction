import type { Compound, ValidationResult } from '@/types/compound';
import { STARTER_COMPOUNDS } from '@/data/starterCompounds';
import { SERVICE_CONFIG, fetchJson } from '@/services/config';
import { chemistryService } from '@/services/chemistry';

/**
 * Catalogue source contract. The starter set is used by default; set VITE_COMPOUND_LIBRARY_URL
 * to load a processed Tox21 library (JSON array of { id, name, smiles, ... }).
 */
export interface CompoundCatalogService {
  readonly sourceLabel: string;
  listCompounds(): Promise<Compound[]>;
}

class StarterCatalog implements CompoundCatalogService {
  readonly sourceLabel = 'Starter examples (not the Tox21 dataset)';
  async listCompounds() {
    return STARTER_COMPOUNDS.map((c) => ({ ...c, tags: [...c.tags] }));
  }
}

interface RemoteCompoundRow {
  id: string;
  name?: string;
  smiles: string;
  source?: string;
  sourceId?: string;
  category?: string;
  tags?: string[];
}

class RemoteCatalog implements CompoundCatalogService {
  readonly sourceLabel: string;
  constructor(private url: string) {
    this.sourceLabel = `Dataset: ${url}`;
  }
  async listCompounds(): Promise<Compound[]> {
    const rows = await fetchJson<RemoteCompoundRow[]>(this.url);
    if (!Array.isArray(rows)) throw new Error('Compound library must be a JSON array.');
    return rows
      .filter((r) => r && typeof r.smiles === 'string' && typeof r.id === 'string')
      .map((r) => ({
        id: `ds-${r.id}`,
        name: r.name || r.id,
        smiles: r.smiles,
        source: r.source ?? 'Processed dataset',
        sourceId: r.sourceId ?? r.id,
        category: r.category ?? 'Dataset compound',
        tags: r.tags ?? [],
        origin: 'dataset' as const,
        validation: 'pending' as const,
      }));
  }
}

export const compoundCatalog: CompoundCatalogService = SERVICE_CONFIG.compoundLibraryUrl
  ? new RemoteCatalog(SERVICE_CONFIG.compoundLibraryUrl)
  : new StarterCatalog();

/** Merges a validation result into a compound record. Never invents properties. */
export function applyValidation(c: Compound, v: ValidationResult): Compound {
  return {
    ...c,
    validation: v.status,
    validationEngine: v.engine,
    canonicalSmiles: v.canonicalSmiles,
    formula: v.formula,
    molecularWeight: v.molecularWeight,
    descriptors: v.descriptors,
  };
}

export async function validateCompound(smiles: string, name?: string): Promise<ValidationResult> {
  return chemistryService.validateCompound({ smiles, name });
}

/** Validates catalogue entries so formula/MW/canonical SMILES come from the chemistry engine. */
export async function enrichCompounds(list: Compound[]): Promise<Compound[]> {
  const out: Compound[] = [];
  for (const c of list) {
    try {
      out.push(applyValidation(c, await validateCompound(c.smiles, c.name)));
    } catch {
      out.push({ ...c, validation: 'pending' });
    }
  }
  return out;
}

export function getCompoundDetails(compoundId: string, all: Compound[]): Compound | undefined {
  return all.find((c) => c.id === compoundId);
}

export function searchCompounds(list: Compound[], query: string, filter: 'all' | 'builtin' | 'custom' | 'dataset' = 'all', category?: string) {
  const q = query.trim().toLowerCase();
  return list.filter((c) => {
    if (filter !== 'all' && c.origin !== filter) return false;
    if (category && c.category !== category) return false;
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      c.smiles.toLowerCase().includes(q) ||
      (c.canonicalSmiles ?? '').toLowerCase().includes(q) ||
      c.tags.some((t) => t.toLowerCase().includes(q)) ||
      (c.formula ?? '').toLowerCase() === q
    );
  });
}
