/** 'home' = the results dashboard (landing page); 'lab' = the 3D lab simulation. */
export type Screen = 'home' | 'lab';
export type CameraMode = 'first' | 'third';

/** Overlays that can open inside the lab. */
export type PanelId = 'inspect' | 'analyzer' | 'results';

export type ZoneId = 'vestibule' | 'main_lab' | 'storage' | 'analysis_suite';

export type InspectTarget =
  | { kind: 'vial'; slotId: string }
  | { kind: 'equipment'; equipmentId: string };

export interface Toast {
  id: string;
  kind: 'info' | 'success' | 'warn' | 'error';
  title: string;
  body?: string;
}

export interface Settings {
  mouseSensitivity: number;
  invertY: boolean;
  showControlsHint: boolean;
  reducedMotion: boolean;
  /** 'performance' = no shadows, 1x pixel ratio; 'quality' = shadows, reflections, HiDPI. */
  graphics: 'performance' | 'quality';
}
