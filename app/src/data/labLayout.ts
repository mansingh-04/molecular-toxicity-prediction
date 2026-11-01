import type { ZoneId } from '@/types/game';

/**
 * Single source of truth for the laboratory layout. Both the rendered geometry and the
 * collision world are built from these definitions so they can never drift apart.
 * Units are metres. +x = east, -z = north, y = up.
 */

export const WALL_HEIGHT = 3.4;
export const WALL_THICKNESS = 0.2;
// Start inside the main lab, looking towards the Chemical Storage doorway (forward = (-sin yaw, -cos yaw)).
export const PLAYER_START = { x: -4.4, z: 4.4, yaw: 0.3 };

export interface Box2 {
  id: string;
  /** centre */
  x: number;
  z: number;
  /** full extents */
  w: number;
  d: number;
  /** vertical extent of the collider (for camera rays) */
  y0?: number;
  y1?: number;
}

export interface WallDef extends Box2 {
  material: 'wall' | 'glass';
}

const T = WALL_THICKNESS;
const H = WALL_HEIGHT;

/** Builds a wall segment from two points along x or z. */
function wallX(id: string, z: number, x0: number, x1: number, material: WallDef['material'] = 'wall'): WallDef {
  return { id, x: (x0 + x1) / 2, z, w: Math.abs(x1 - x0), d: T, y0: 0, y1: H, material };
}
function wallZ(id: string, x: number, z0: number, z1: number, material: WallDef['material'] = 'wall'): WallDef {
  return { id, x, z: (z0 + z1) / 2, w: T, d: Math.abs(z1 - z0), y0: 0, y1: H, material };
}

export const DOOR = { id: 'door-main', x: 0, z: 8, width: 2 };

export const WALLS: WallDef[] = [
  wallX('n', -8, -12.1, 12.1),
  wallZ('w', -12, -8, 8),
  wallZ('e', 12, -8, 8),
  wallX('s-w', 8, -12.1, -1),
  wallX('s-e', 8, 1, 12.1),
  // vestibule
  wallZ('v-w', -3, 8, 13),
  wallZ('v-e', 3, 8, 13),
  wallX('v-s', 13, -3.1, 3.1),
  // storage partition (open doorway between z -1.2 .. 1.2)
  wallZ('p-storage-n', -6, -8, -1.2),
  wallZ('p-storage-s', -6, 1.2, 8),
  // analysis suite glass partition (doorway z -1.4 .. 1.4)
  wallZ('p-suite-n', 6, -8, -1.4, 'glass'),
  wallZ('p-suite-s', 6, 1.4, 8, 'glass'),
];

export interface ZoneDef {
  id: ZoneId;
  label: string;
  x0: number;
  x1: number;
  z0: number;
  z1: number;
}

export const ZONES: ZoneDef[] = [
  { id: 'vestibule', label: 'Entrance', x0: -3, x1: 3, z0: 8, z1: 13 },
  { id: 'storage', label: 'Chemical Storage', x0: -12, x1: -6, z0: -8, z1: 8 },
  { id: 'analysis_suite', label: 'Analysis Suite', x0: 6, x1: 12, z0: -8, z1: 8 },
  { id: 'main_lab', label: 'Main Laboratory', x0: -6, x1: 6, z0: -8, z1: 8 },
];

export function zoneAt(x: number, z: number): ZoneDef | undefined {
  return ZONES.find((zn) => x >= zn.x0 && x <= zn.x1 && z >= zn.z0 && z <= zn.z1);
}

/** Furniture footprints (collision + placement). rot is the Y rotation in radians. */
export interface FurnitureDef extends Box2 {
  rot: number;
}

const furniture = (id: string, x: number, z: number, w: number, d: number, y1: number, rot = 0): FurnitureDef => {
  // rotated by +-90deg swaps the footprint
  const swap = Math.abs(Math.sin(rot)) > 0.5;
  return { id, x, z, w: swap ? d : w, d: swap ? w : d, y0: 0, y1, rot };
};

export const FURNITURE = {
  benchA: furniture('bench-a', -2.6, 0.8, 1.4, 5.2, 0.95),
  benchB: furniture('bench-b', 2.6, 0.8, 1.4, 5.2, 0.95),
  fumeHood: furniture('fume-hood', 0, -7.35, 2.2, 1.1, 2.5),
  safetyStation: furniture('safety-station', -5.35, 6.6, 0.9, 0.9, 2.2),
  analyzer: furniture('analyzer', 9, -6.6, 3.0, 1.7, 2.0),
  serverRack1: furniture('server-rack-1', 11.4, 3.2, 0.9, 1.1, 2.2),
  serverRack2: furniture('server-rack-2', 11.4, 4.6, 0.9, 1.1, 2.2),
  suiteDesk: furniture('suite-desk', 9, 5.2, 2.4, 1.0, 0.8),
  shelfW1: furniture('shelf-w1', -11.6, -5.5, 2.6, 0.55, 2.3, Math.PI / 2),
  shelfW2: furniture('shelf-w2', -11.6, -2.7, 2.6, 0.55, 2.3, Math.PI / 2),
  shelfW3: furniture('shelf-w3', -11.6, 0.1, 2.6, 0.55, 2.3, Math.PI / 2),
  shelfW4: furniture('shelf-w4', -11.6, 2.9, 2.6, 0.55, 2.3, Math.PI / 2),
  shelfN: furniture('shelf-n', -9.4, -7.6, 2.6, 0.55, 2.3, 0),
  flammables: furniture('flammables-cabinet', -6.85, -7.45, 1.2, 0.7, 1.8, 0),
  fridge: furniture('cold-storage', -11.5, 5.6, 1.0, 0.8, 1.9, Math.PI / 2),
  noticeBoard: furniture('notice-board', -2.88, 10.5, 0.08, 1.6, 0, Math.PI / 2),
} satisfies Record<string, FurnitureDef>;

export const SHELF_KEYS = ['shelfW1', 'shelfW2', 'shelfW3', 'shelfW4', 'shelfN'] as const;
export type ShelfKey = (typeof SHELF_KEYS)[number];

export interface VialSlot {
  id: string;
  shelf: ShelfKey;
  /** local x along the shelf (-1.2..1.2) */
  lx: number;
  /** shelf level 0..3 */
  level: number;
  compoundId: string;
  code: string;
}

export const SHELF_LEVEL_Y = [0.12, 0.66, 1.2, 1.74];
const SLOT_LEVELS = [1, 2, 3];
const SLOT_X = [-0.95, -0.57, -0.19, 0.19, 0.57, 0.95];
export const SHELF_CAPACITY = SHELF_KEYS.length * SLOT_LEVELS.length * SLOT_X.length;

interface SlotCompound {
  id: string;
  category: string;
  name: string;
  origin: string;
  createdAt?: string;
}

/**
 * Assigns every compound in the library a vial position in Chemical Storage.
 * Built-in compounds come first (grouped by category), then custom compounds in creation order,
 * so existing positions stay stable when compounds are added. Slot ids derive from compound ids.
 */
export function computeVialSlots(compounds: SlotCompound[]): VialSlot[] {
  const rank = (c: SlotCompound) => (c.origin === 'builtin' ? 0 : c.origin === 'dataset' ? 1 : 2);
  const sorted = [...compounds].sort((a, b) =>
    rank(a) - rank(b) ||
    (rank(a) === 2 ? (a.createdAt ?? '').localeCompare(b.createdAt ?? '') : a.category.localeCompare(b.category) || a.name.localeCompare(b.name)),
  );
  const list = sorted.slice(0, SHELF_CAPACITY);
  // Spread evenly over the racks (category groups stay together on consecutive racks).
  const perShelf = Math.max(1, Math.ceil(list.length / SHELF_KEYS.length));
  return list.map((c, i) => {
    const shelf = SHELF_KEYS[Math.floor(i / perShelf)];
    const within = i % perShelf;
    return {
      id: `v-${c.id}`,
      shelf,
      level: SLOT_LEVELS[Math.floor(within / SLOT_X.length)],
      lx: SLOT_X[within % SLOT_X.length],
      compoundId: c.id,
      code: `TX-${String(i + 1).padStart(4, '0')}`,
    };
  });
}

/** Converts a shelf-local position into world coordinates. Local +z is the shelf front. */
export function shelfLocalToWorld(shelf: ShelfKey, lx: number, ly: number, lz: number) {
  const f = FURNITURE[shelf];
  const c = Math.cos(f.rot);
  const s = Math.sin(f.rot);
  return { x: f.x + lx * c + lz * s, y: ly, z: f.z - lx * s + lz * c };
}

export function vialWorldPosition(slot: VialSlot) {
  return shelfLocalToWorld(slot.shelf, slot.lx, SHELF_LEVEL_Y[slot.level] + 0.125, 0.06);
}

/** Floor-marked work areas in front of each station (shown with labels in the world and on the minimap). */
export interface WorkArea {
  id: 'storage' | 'analyzer';
  label: string;
  how: string[];
  x: number;
  z: number;
  w: number;
  d: number;
  /** where the guidance beacon points */
  beacon: [number, number, number];
}

export const WORK_AREAS: WorkArea[] = [
  {
    id: 'storage', label: 'Chemical Storage', x: -10.55, z: -1.3, w: 1.3, d: 11.2, beacon: [-10.6, 2.6, -1.3],
    how: ['Every compound has a labelled vial here', 'Look at a vial and press E', 'Choose “Pick up” to carry it'],
  },
  {
    id: 'analyzer', label: 'Toxicity Analyzer', x: 9, z: -5.0, w: 3.0, d: 1.4, beacon: [9, 2.9, -6.6],
    how: ['Carry your vial here', 'Press E, choose the models and press Run', 'Open the report when the run completes'],
  },
];
