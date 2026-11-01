import type { CompoundInput, ValidationResult } from '@/types/compound';
import type { ChemistryEngineStatus, ChemistryService } from './types';
import { DemoChemistryService } from './demoChemistryService';
import { RDKitChemistryService } from './rdkitChemistryService';
import { RemoteChemistryService } from './remoteChemistryService';
import { SERVICE_CONFIG } from '@/services/config';

/**
 * Chooses the best available engine: remote RDKit API (if configured and reachable) ->
 * in-browser RDKit.js -> demo parser. Each result records which engine produced it.
 */
class CompositeChemistryService implements ChemistryService {
  private chain: ChemistryService[];
  private resolved?: Promise<{ svc: ChemistryService; status: ChemistryEngineStatus }>;

  constructor(chain: ChemistryService[]) {
    this.chain = chain;
  }

  private active() {
    if (!this.resolved) {
      this.resolved = (async () => {
        for (const svc of this.chain) {
          const st = await svc.status();
          if (st.ready) return { svc, status: st };
        }
        const demo = new DemoChemistryService();
        return { svc: demo, status: await demo.status() };
      })();
    }
    return this.resolved;
  }

  async status() {
    return (await this.active()).status;
  }

  async validateCompound(input: CompoundInput): Promise<ValidationResult> {
    const { svc } = await this.active();
    return svc.validateCompound(input);
  }

  async depictSvg(smiles: string, w: number, h: number) {
    return (await this.active()).svc.depictSvg(smiles, w, h);
  }

  async morganFingerprint(smiles: string, radius: number, nBits: number) {
    return (await this.active()).svc.morganFingerprint(smiles, radius, nBits);
  }
}

const chain: ChemistryService[] = [];
if (SERVICE_CONFIG.chemistryApiUrl) chain.push(new RemoteChemistryService(SERVICE_CONFIG.chemistryApiUrl));
chain.push(new RDKitChemistryService());
chain.push(new DemoChemistryService());

export const chemistryService: ChemistryService = new CompositeChemistryService(chain);
export type { ChemistryService, ChemistryEngineStatus };
