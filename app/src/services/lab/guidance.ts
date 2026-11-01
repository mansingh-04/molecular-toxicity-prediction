import { WORK_AREAS } from '@/data/labLayout';

/**
 * The lab's "what to do next" rule. Pure: it depends only on whether a vial is held and on the
 * analysis state, so it is easy to test and to explain.
 */
export type GuidanceTarget = 'storage' | 'analyzer';

export interface Guidance {
  text: string;
  how: string;
  target: GuidanceTarget;
}

export const TARGET_POSITIONS: Record<GuidanceTarget, [number, number, number]> = {
  storage: WORK_AREAS.find((a) => a.id === 'storage')!.beacon,
  analyzer: WORK_AREAS.find((a) => a.id === 'analyzer')!.beacon,
};

export const TARGET_LABEL: Record<GuidanceTarget, string> = {
  storage: 'Chemical Storage',
  analyzer: 'Toxicity Analyzer',
};

export function nextStep(heldName: string | undefined, analysis: 'idle' | 'running' | 'done' | 'error', custom = false): Guidance {
  if (!heldName) return { text: 'Pick a sample vial from the shelves', how: 'Walk into Chemical Storage and press E on a vial, or type any SMILES at the analyzer', target: 'storage' };
  if (analysis === 'running') return { text: `Analysing ${heldName}…`, how: 'The trained models are running', target: 'analyzer' };
  if (analysis === 'done') return { text: `Read the report for ${heldName}`, how: 'Press E at the analyzer → View report, or pick another vial', target: 'analyzer' };
  if (custom) return { text: `${heldName} is loaded in the analyzer`, how: 'Press E at the analyzer and choose Run analysis', target: 'analyzer' };
  return { text: `Take ${heldName} to the Toxicity Analyzer`, how: 'Walk east into the Analysis Suite and press E at the analyzer', target: 'analyzer' };
}
