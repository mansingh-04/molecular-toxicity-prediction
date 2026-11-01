import type { MolecularGraph } from '@/types/chemistry';
import { mulberry32 } from '@/services/util/random';

/**
 * Deterministic schematic layout of a molecular graph using distance-target relaxation
 * (bonded pairs ≈ 1 bond length, 1-3 pairs ≈ ideal angle). This is a depiction aid only;
 * it is NOT a computed conformer and carries no geometric meaning.
 */
export type Vec = [number, number, number];

export function layoutGraph(g: MolecularGraph, dims: 2 | 3, iterations = 400): Vec[] {
  const n = g.atoms.length;
  if (n === 0) return [];
  const rand = mulberry32(n * 7919 + g.bonds.length * 104729 + dims);
  const adj: number[][] = Array.from({ length: n }, () => []);
  for (const b of g.bonds) {
    adj[b.a].push(b.b);
    adj[b.b].push(b.a);
  }
  // target distances
  const target = new Map<number, number>();
  const key = (i: number, j: number) => (i < j ? i * n + j : j * n + i);
  const d13 = dims === 2 ? Math.sqrt(3) : 1.633;
  for (let i = 0; i < n; i++) {
    for (const j of adj[i]) target.set(key(i, j), 1);
  }
  for (let i = 0; i < n; i++) {
    for (const j of adj[i]) for (const k of adj[j]) if (k !== i && !target.has(key(i, k))) target.set(key(i, k), d13);
  }

  // initial positions: BFS spiral, deterministic
  const pos: Vec[] = new Array(n);
  const seen = new Array(n).fill(false);
  let placed = 0;
  for (let start = 0; start < n; start++) {
    if (seen[start]) continue;
    const queue = [start];
    seen[start] = true;
    while (queue.length) {
      const v = queue.shift()!;
      const r = Math.sqrt(placed + 1) * 0.9;
      const t = placed * 2.4;
      pos[v] = [r * Math.cos(t) + (rand() - 0.5) * 0.1, r * Math.sin(t) + (rand() - 0.5) * 0.1, dims === 3 ? (rand() - 0.5) * 0.8 : 0];
      placed++;
      for (const w of adj[v]) if (!seen[w]) { seen[w] = true; queue.push(w); }
    }
  }

  for (let it = 0; it < iterations; it++) {
    const step = 0.12 * (1 - it / iterations) + 0.01;
    const disp: Vec[] = Array.from({ length: n }, () => [0, 0, 0]);
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const dx = pos[j][0] - pos[i][0];
        const dy = pos[j][1] - pos[i][1];
        const dz = pos[j][2] - pos[i][2];
        const dist = Math.max(1e-3, Math.hypot(dx, dy, dz));
        const t = target.get(key(i, j));
        let f = 0;
        if (t !== undefined) f = (dist - t) * 0.5;
        else if (dist < 2.2) f = (dist - 2.2) * 0.25;
        const fx = (dx / dist) * f, fy = (dy / dist) * f, fz = (dz / dist) * f;
        disp[i][0] += fx; disp[i][1] += fy; disp[i][2] += fz;
        disp[j][0] -= fx; disp[j][1] -= fy; disp[j][2] -= fz;
      }
    }
    for (let i = 0; i < n; i++) {
      pos[i][0] += disp[i][0] * step * 4;
      pos[i][1] += disp[i][1] * step * 4;
      if (dims === 3) pos[i][2] += disp[i][2] * step * 4;
    }
  }
  // centre
  const c: Vec = [0, 0, 0];
  for (const p of pos) { c[0] += p[0]; c[1] += p[1]; c[2] += p[2]; }
  c[0] /= n; c[1] /= n; c[2] /= n;
  return pos.map((p) => [p[0] - c[0], p[1] - c[1], p[2] - c[2]]);
}

/** CPK-style element colours used by the schematic renderers. */
export const ELEMENT_COLOR: Record<string, string> = {
  C: '#9aa7b4', N: '#4f7bff', O: '#ff5a52', S: '#e6c84a', P: '#ff9a3c', F: '#7ee08a', Cl: '#45d06a',
  Br: '#b4553c', I: '#9b59d0', H: '#f2f4f7', B: '#ffb4a8', Na: '#ab5cf2', K: '#8f40d4',
};
export const elementColor = (el: string) => ELEMENT_COLOR[el] ?? '#d27bd2';
