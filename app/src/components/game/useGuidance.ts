import { useGame } from '@/store/gameStore';
import { nextStep, type Guidance } from '@/services/lab/guidance';

/** Current "what to do next" for the HUD, minimap and 3D beacon. */
export function useGuidance(): Guidance {
  const heldName = useGame((s) => s.heldCompound()?.name);
  const analysis = useGame((s) => s.analysis.state);
  const custom = useGame((s) => !!s.customSample);
  return nextStep(heldName, analysis, custom);
}
