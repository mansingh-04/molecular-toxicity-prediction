import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { FURNITURE } from '@/data/labLayout';
import { useGame } from '@/store/gameStore';
import { useInteractable } from '@/components/game/interactables';
import { parseSmiles } from '@/services/chemistry/smilesParser';
import { elementColor, layoutGraph } from '@/services/chemistry/graphLayout';
import { M, liquidFor } from './materials';
import { CanvasPlane } from './CanvasLabel';
import { FocusGlow } from './FocusGlow';
import { VialMesh } from './Shelf';

const screenDrawer = (lines: { text: string; color?: string; size?: number }[], header: string) =>
  (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#0a1a24');
    g.addColorStop(1, '#06101a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#18b8b3';
    ctx.fillRect(0, 0, w, h * 0.12);
    ctx.fillStyle = '#05080d';
    ctx.font = `600 ${Math.round(h * 0.075)}px Geist, system-ui, sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.fillText(header, w * 0.04, h * 0.06);
    let y = h * 0.24;
    for (const l of lines) {
      const size = l.size ?? 0.085;
      ctx.fillStyle = l.color ?? '#e7edf3';
      ctx.font = `500 ${Math.round(h * size)}px Geist, system-ui, sans-serif`;
      ctx.fillText(l.text, w * 0.04, y, w * 0.92);
      y += h * (size + 0.05);
    }
  };

/* ---------------- Computational Toxicity Analyzer ---------------- */

export function Analyzer() {
  const f = FURNITURE.analyzer;
  const openPanel = useGame((s) => s.openPanel);
  const compound = useGame((s) => s.heldCompound());
  const analysis = useGame((s) => s.analysis.state);
  const models = useGame((s) => s.modelStatus.state);
  useInteractable({
    id: 'station-analyzer',
    position: [f.x, 1.2, f.z + 0.6],
    radius: 1.3,
    prompt: () => ({ label: 'Computational Toxicity Analyzer', verb: compound ? `Analyse ${compound.name}` : 'Operate' }),
    onInteract: () => openPanel('analyzer'),
  });

  const loaded = !!compound;
  const running = analysis === 'running';
  const lines = [
    { text: models === 'ready' ? 'TRAINED MODELS: READY' : models === 'error' ? 'TRAINED MODELS: NOT LOADED' : 'TRAINED MODELS: LOADING', color: models === 'ready' ? '#6fd39a' : '#f07a7a', size: 0.07 },
    { text: compound ? compound.name : 'Idle — bring a sample vial' },
    { text: compound ? 'LR · RF · XGBoost on Morgan fingerprints' : '', color: '#9fb0c2', size: 0.07 },
    { text: running ? 'Analysis running…' : analysis === 'done' ? 'Report ready' : analysis === 'error' ? 'Analysis failed' : compound ? 'Press E to analyse' : '', color: '#7fe6e0', size: 0.07 },
  ];

  const ring = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (ring.current) ring.current.rotation.z += dt * (running ? 2.4 : 0.3);
  });

  return (
    <group position={[f.x, 0, f.z]}>
      <mesh position={[0, 0.5, 0]} material={M.instrument} castShadow receiveShadow><boxGeometry args={[f.w, 1.0, f.d]} /></mesh>
      <mesh position={[0, 1.02, 0.05]} material={M.instrumentDark}><boxGeometry args={[f.w - 0.1, 0.04, f.d - 0.1]} /></mesh>
      {/* tower */}
      <mesh position={[-0.9, 1.5, -0.4]} material={M.instrument} castShadow><boxGeometry args={[1.0, 1.0, 0.8]} /></mesh>
      <mesh position={[-0.9, 1.5, 0.005]} material={M.glass}><planeGeometry args={[0.8, 0.8]} /></mesh>
      {/* sample port */}
      <mesh position={[0.9, 1.08, 0.3]} material={M.darkSteel}><cylinderGeometry args={[0.16, 0.18, 0.08, 24]} /></mesh>
      <mesh ref={ring} position={[0.9, 1.13, 0.3]} rotation-x={-Math.PI / 2} material={loaded ? M.accent : M.darkSteel}><ringGeometry args={[0.12, 0.15, 24, 1, 0, Math.PI * 1.5]} /></mesh>
      {loaded && <VialMesh position={[0.9, 1.2, 0.3]} color={liquidFor(compound?.category)} />}
      {/* display */}
      <group position={[0.35, 1.7, -0.5]}>
        <mesh material={M.screenOff}><boxGeometry args={[1.5, 0.85, 0.04]} /></mesh>
        <CanvasPlane width={1.44} height={0.79} position={[0, 0, 0.022]} draw={screenDrawer(lines, 'CTA-1 · TOX21 ANALYZER')} deps={[JSON.stringify(lines)]} />
      </group>
      <mesh position={[0, 0.02, f.d / 2 + 0.3]} rotation-x={-Math.PI / 2} material={M.accentSoft}><planeGeometry args={[f.w, 0.04]} /></mesh>
      {loaded && compound && <MoleculeHologram smiles={compound.canonicalSmiles ?? compound.smiles} running={running} position={[0.9, 1.75, 0.3]} />}
      <FocusGlow id="station-analyzer" size={[f.w + 0.1, 2.0, f.d + 0.1]} position={[0, 1.0, 0]} />
    </group>
  );
}

const atomGeo = new THREE.SphereGeometry(1, 14, 10);
const bondGeo = new THREE.CylinderGeometry(1, 1, 1, 6);

/** Schematic 3D layout of a compound (not a computed conformer). */
export function MoleculeHologram({ smiles, running = false, position, size = 0.32, base = true }: { smiles: string; running?: boolean; position: [number, number, number]; size?: number; base?: boolean }) {
  const group = useRef<THREE.Group>(null);
  const data = useMemo(() => {
    const g = parseSmiles(smiles).graph;
    if (!g) return null;
    const pos = layoutGraph(g, 3, 300);
    const span = Math.max(1, ...pos.map((p) => Math.hypot(p[0], p[1], p[2])));
    const s = size / span;
    const atoms = g.atoms.map((a) => ({ p: new THREE.Vector3(pos[a.index][0] * s, pos[a.index][1] * s, pos[a.index][2] * s), color: elementColor(a.element) }));
    const bonds = g.bonds.map((b) => {
      const p1 = atoms[b.a].p, p2 = atoms[b.b].p;
      const mid = p1.clone().add(p2).multiplyScalar(0.5);
      const dir = p2.clone().sub(p1);
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
      return { mid, q, len: dir.length() };
    });
    return { atoms, bonds, scale: s };
  }, [smiles, size]);
  const mats = useMemo(() => new Map<string, THREE.MeshStandardMaterial>(), []);
  const mat = (c: string) => {
    let m = mats.get(c);
    if (!m) {
      m = new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 1.4, transparent: true, opacity: 0.9, toneMapped: false });
      mats.set(c, m);
    }
    return m;
  };
  useFrame((_, dt) => {
    if (group.current) group.current.rotation.y += dt * (running ? 1.2 : 0.35);
  });
  if (!data) return null;
  return (
    <group position={position}>
      {base && <mesh position={[0, -0.45, 0]} material={M.holo}><cylinderGeometry args={[0.02, 0.18, 0.5, 16, 1, true]} /></mesh>}
      <group ref={group}>
        {data.atoms.map((a, i) => (
          <mesh key={i} geometry={atomGeo} material={mat(a.color)} position={a.p} scale={Math.max(0.018, data.scale * 0.32)} />
        ))}
        {data.bonds.map((b, i) => (
          <mesh key={i} geometry={bondGeo} material={M.accent} position={b.mid} quaternion={b.q} scale={[size * 0.016, b.len, size * 0.016]} />
        ))}
      </group>
    </group>
  );
}
