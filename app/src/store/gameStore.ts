import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Compound } from '@/types/compound';
import type { AnalysisResult, ModelId, ModelMetadata, PipelineLogEntry } from '@/types/analysis';
import type { CameraMode, InspectTarget, PanelId, Screen, Settings, Toast, ZoneId } from '@/types/game';
import { computeVialSlots, type VialSlot } from '@/data/labLayout';
import { compoundCatalog, enrichCompounds, validateCompound } from '@/services/compounds/compoundService';
import { analysisService } from '@/services/analysis';
import { persistenceAdapter, STORAGE_KEY, STORAGE_VERSION } from '@/services/persistence/storage';
import { uid } from '@/services/util/random';

/**
 * The single shared state of the app: the dashboard's predictions and the lab simulation.
 * Lab flow: pick up one vial from a shelf (or type a custom SMILES at the analyzer) -> run the models -> read the report.
 */

/** Whether the trained models have loaded in the browser (refreshed on start-up and on demand). */
export interface ModelStatus {
  state: 'loading' | 'ready' | 'error';
  models: ModelMetadata[];
  error?: string;
}

export interface FocusInfo {
  id: string;
  label: string;
  verb: string;
  locked?: string;
}

export interface LabAnalysis {
  state: 'idle' | 'running' | 'done' | 'error';
  resultId?: string;
  error?: string;
  log: PipelineLogEntry[];
}

type ActionResult = { ok: true } | { ok: false; error: string };

export interface GameState {
  // app
  screen: Screen;
  settings: Settings;
  toasts: Toast[];
  builtinCompounds: Compound[];
  modelStatus: ModelStatus;
  results: Record<string, AnalysisResult>;

  // lab
  panel: PanelId | null;
  inspect?: InspectTarget;
  paused: boolean;
  cameraMode: CameraMode;
  focused?: FocusInfo;
  currentZone?: ZoneId;
  showHelp: boolean;
  doorOpen: boolean;
  /** The vial in the player's hand (one at a time). */
  heldSlotId?: string;
  /** A molecule typed in at the analyzer instead of a shelf vial. */
  customSample?: Compound;
  analysis: LabAnalysis;

  init(): Promise<void>;
  refreshModels(): Promise<void>;
  goto(screen: Screen): void;
  enterLab(): void;
  exitLab(): void;
  openPanel(panel: PanelId, inspect?: InspectTarget): void;
  closePanel(): void;
  setPaused(p: boolean): void;
  setShowHelp(v: boolean): void;
  setFocused(f: FocusInfo | undefined): void;
  setZone(z: ZoneId): void;
  toggleCamera(): void;
  toggleDoor(): void;
  pushToast(t: Omit<Toast, 'id'>): void;
  dismissToast(id: string): void;
  updateSettings(p: Partial<Settings>): void;

  vialSlots(): VialSlot[];
  getCompound(id: string | undefined): Compound | undefined;
  heldCompound(): Compound | undefined;
  pickUpVial(slotId: string): ActionResult;
  returnVial(): void;
  loadCustomMolecule(name: string, smiles: string): Promise<ActionResult>;
  analyzeHeldVial(models: ModelId[]): Promise<ActionResult>;
}

const defaultSettings: Settings = { mouseSensitivity: 1, invertY: false, showControlsHint: true, reducedMotion: false, graphics: 'quality' };
const idleAnalysis: LabAnalysis = { state: 'idle', log: [] };
let slotCache: { compounds?: Compound[]; slots: VialSlot[] } = { slots: [] };

export const useGame = create<GameState>()(
  persist(
    (set, get) => ({
      screen: 'home',
      settings: defaultSettings,
      toasts: [],
      builtinCompounds: [],
      modelStatus: { state: 'loading', models: [] },
      results: {},
      panel: null,
      paused: false,
      cameraMode: 'first',
      showHelp: true,
      doorOpen: true,
      analysis: idleAnalysis,

      async init() {
        void get().refreshModels();
        try {
          const list = await compoundCatalog.listCompounds();
          set({ builtinCompounds: list });
          set({ builtinCompounds: await enrichCompounds(list) });
        } catch (e) {
          get().pushToast({ kind: 'error', title: 'Could not load the compound list', body: (e as Error).message });
        }
      },

      async refreshModels() {
        set((s) => ({ modelStatus: { ...s.modelStatus, state: 'loading' } }));
        try {
          await analysisService.health();
          set({ modelStatus: { state: 'ready', models: await analysisService.listModels() } });
        } catch (e) {
          set({ modelStatus: { state: 'error', models: [], error: (e as Error).message } });
        }
      },

      goto(screen) {
        if (screen !== 'lab' && document.pointerLockElement) document.exitPointerLock();
        set({ screen, panel: null, paused: false, focused: undefined });
      },
      enterLab() {
        set({ screen: 'lab', panel: null, paused: false, focused: undefined, currentZone: undefined, showHelp: get().settings.showControlsHint });
      },
      exitLab() {
        get().goto('home');
      },
      openPanel(panel, inspect) {
        if (document.pointerLockElement) document.exitPointerLock();
        set({ panel, inspect, paused: false, focused: undefined });
      },
      closePanel() {
        set({ panel: null, inspect: undefined });
      },
      setPaused(p) {
        set({ paused: p });
      },
      setShowHelp(v) {
        set({ showHelp: v });
      },
      setFocused(f) {
        if (get().focused?.id !== f?.id || get().focused?.verb !== f?.verb || get().focused?.locked !== f?.locked) set({ focused: f });
      },
      setZone(z) {
        if (get().currentZone !== z) set({ currentZone: z });
      },
      toggleCamera() {
        set((s) => ({ cameraMode: s.cameraMode === 'first' ? 'third' : 'first' }));
      },
      toggleDoor() {
        set((s) => ({ doorOpen: !s.doorOpen }));
      },
      pushToast(t) {
        const id = uid('toast');
        set((s) => ({ toasts: [...s.toasts.slice(-3), { ...t, id }] }));
        setTimeout(() => get().dismissToast(id), 4500);
      },
      dismissToast(id) {
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
      },
      updateSettings(p) {
        set((s) => ({ settings: { ...s.settings, ...p } }));
      },

      vialSlots() {
        const compounds = get().builtinCompounds;
        if (slotCache.compounds !== compounds) slotCache = { compounds, slots: computeVialSlots(compounds) };
        return slotCache.slots;
      },
      getCompound(id) {
        return id ? get().builtinCompounds.find((c) => c.id === id) : undefined;
      },
      heldCompound() {
        if (get().customSample) return get().customSample;
        const slot = get().vialSlots().find((v) => v.id === get().heldSlotId);
        return get().getCompound(slot?.compoundId);
      },

      pickUpVial(slotId) {
        if (get().analysis.state === 'running') return { ok: false, error: 'Wait for the running analysis to finish.' };
        if (!get().vialSlots().some((v) => v.id === slotId)) return { ok: false, error: 'Unknown vial.' };
        // Picking a new vial puts the previous one back on its shelf and clears the previous report.
        set({ heldSlotId: slotId, customSample: undefined, analysis: idleAnalysis });
        return { ok: true };
      },
      returnVial() {
        if (get().analysis.state === 'running') return;
        set({ heldSlotId: undefined, customSample: undefined, analysis: idleAnalysis });
      },

      async loadCustomMolecule(name, smiles) {
        if (get().analysis.state === 'running') return { ok: false, error: 'Wait for the running analysis to finish.' };
        const input = smiles.trim();
        if (!input) return { ok: false, error: 'Enter a SMILES string.' };
        const v = await validateCompound(input, name);
        if (v.status === 'invalid') return { ok: false, error: v.errors[0] ?? 'RDKit could not read this SMILES.' };
        const compound: Compound = {
          id: uid('custom'), name: name.trim() || 'Custom molecule', smiles: input, canonicalSmiles: v.canonicalSmiles,
          formula: v.formula, molecularWeight: v.molecularWeight, source: 'Typed in the lab', category: 'Custom', tags: [],
          origin: 'custom', validation: v.status, validationEngine: v.engine,
        };
        // A custom molecule replaces whatever vial was held (the vial goes back on its shelf).
        set({ customSample: compound, heldSlotId: undefined, analysis: idleAnalysis });
        return { ok: true };
      },

      async analyzeHeldVial(models) {
        const compound = get().heldCompound();
        if (!compound) return { ok: false, error: 'You are not holding a sample. Pick a vial from Chemical Storage first.' };
        if (!models.length) return { ok: false, error: 'Select at least one model.' };
        if (get().analysis.state === 'running') return { ok: false, error: 'An analysis is already running.' };
        set({ analysis: { state: 'running', log: [] } });
        try {
          const result = await analysisService.runAnalysis(
            { compoundId: compound.id, smiles: compound.smiles },
            { mode: 'aml', models, featureSet: 'morgan' },
            {
              experimentId: uid('lab'),
              onProgress: (p) => p.entry && set((s) => ({ analysis: { ...s.analysis, log: [...s.analysis.log, p.entry!] } })),
            },
          );
          result.label = compound.name;
          set((s) => ({ results: { ...s.results, [result.id]: result }, analysis: { ...s.analysis, state: 'done', resultId: result.id } }));
          return { ok: true };
        } catch (e) {
          const error = (e as Error).message || 'Analysis failed.';
          set((s) => ({ analysis: { ...s.analysis, state: 'error', error } }));
          return { ok: false, error };
        }
      },
    }),
    {
      name: STORAGE_KEY,
      version: STORAGE_VERSION,
      storage: createJSONStorage(() => persistenceAdapter),
      // Only the player's settings are saved; older saves (career progress etc.) are ignored.
      partialize: (s) => ({ settings: s.settings }),
      migrate: (persisted) => ({ settings: { ...defaultSettings, ...((persisted as { settings?: Settings })?.settings ?? {}) } }) as GameState,
      merge: (persisted, current) => ({ ...current, settings: { ...current.settings, ...((persisted as { settings?: Settings })?.settings ?? {}) } }),
    },
  ),
);
