import { DOOR, FURNITURE, WALLS, WALL_HEIGHT, type Box2 } from '@/data/labLayout';

/**
 * Static collision world built from the layout data. The lab is static, so a set of AABBs with
 * circle-vs-box resolution is more predictable (and far lighter) than a full physics engine.
 */
export interface Collider {
  id: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  minY: number;
  maxY: number;
  enabled: boolean;
  /** blocks the third-person camera ray */
  blocksCamera: boolean;
}

const fromBox = (b: Box2, blocksCamera: boolean): Collider => ({
  id: b.id,
  minX: b.x - b.w / 2,
  maxX: b.x + b.w / 2,
  minZ: b.z - b.d / 2,
  maxZ: b.z + b.d / 2,
  minY: b.y0 ?? 0,
  maxY: b.y1 ?? WALL_HEIGHT,
  enabled: true,
  blocksCamera,
});

export const colliders: Collider[] = [
  ...WALLS.map((w) => fromBox(w, true)),
  ...Object.values(FURNITURE).filter((f) => (f.y1 ?? 0) > 0).map((f) => fromBox(f, (f.y1 ?? 0) > 1.6)),
  fromBox({ id: DOOR.id, x: DOOR.x, z: DOOR.z, w: DOOR.width, d: 0.2, y0: 0, y1: WALL_HEIGHT }, true),
];

export function setColliderEnabled(id: string, enabled: boolean) {
  const c = colliders.find((x) => x.id === id);
  if (c) c.enabled = enabled;
}

/** Pushes a circle (player footprint) out of every enabled collider. Mutates and returns pos. */
export function resolveCircle(pos: { x: number; z: number }, r: number) {
  for (let iter = 0; iter < 3; iter++) {
    let moved = false;
    for (const c of colliders) {
      if (!c.enabled) continue;
      const cx = Math.max(c.minX, Math.min(pos.x, c.maxX));
      const cz = Math.max(c.minZ, Math.min(pos.z, c.maxZ));
      const dx = pos.x - cx;
      const dz = pos.z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 >= r * r) continue;
      if (d2 > 1e-9) {
        const d = Math.sqrt(d2);
        pos.x += (dx / d) * (r - d);
        pos.z += (dz / d) * (r - d);
      } else {
        // centre inside the box: push out along the axis of least penetration
        const pen = [pos.x - c.minX + r, c.maxX - pos.x + r, pos.z - c.minZ + r, c.maxZ - pos.z + r];
        const i = pen.indexOf(Math.min(...pen));
        if (i === 0) pos.x = c.minX - r;
        else if (i === 1) pos.x = c.maxX + r;
        else if (i === 2) pos.z = c.minZ - r;
        else pos.z = c.maxZ + r;
      }
      moved = true;
    }
    if (!moved) break;
  }
  return pos;
}

/** Ray vs AABB (slab method). Returns the entry distance t in [0, maxT] or Infinity. */
function rayBox(o: number[], d: number[], c: Collider, maxT: number) {
  let t0 = 0;
  let t1 = maxT;
  const mins = [c.minX, c.minY, c.minZ];
  const maxs = [c.maxX, c.maxY, c.maxZ];
  for (let a = 0; a < 3; a++) {
    if (Math.abs(d[a]) < 1e-9) {
      if (o[a] < mins[a] || o[a] > maxs[a]) return Infinity;
      continue;
    }
    let ta = (mins[a] - o[a]) / d[a];
    let tb = (maxs[a] - o[a]) / d[a];
    if (ta > tb) [ta, tb] = [tb, ta];
    t0 = Math.max(t0, ta);
    t1 = Math.min(t1, tb);
    if (t0 > t1) return Infinity;
  }
  return t0;
}

/** Nearest hit distance along a normalised ray, or Infinity. */
export function raycast(o: number[], d: number[], maxT: number, filter: (c: Collider) => boolean = (c) => c.blocksCamera) {
  let best = Infinity;
  for (const c of colliders) {
    if (!c.enabled || !filter(c)) continue;
    const t = rayBox(o, d, c, maxT);
    if (t < best) best = t;
  }
  return best;
}

export const isWall = (c: Collider) => WALLS.some((w) => w.id === c.id) || c.id === DOOR.id;
