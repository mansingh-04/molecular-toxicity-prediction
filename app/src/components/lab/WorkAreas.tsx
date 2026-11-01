import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group, Mesh } from 'three';
import { WORK_AREAS, type WorkArea } from '@/data/labLayout';
import { useGame } from '@/store/gameStore';
import { useGuidance } from '@/components/game/useGuidance';
import { TARGET_POSITIONS } from '@/services/lab/guidance';
import { M } from './materials';
import { CanvasPlane, type DrawFn } from './CanvasLabel';

const floorLabel = (a: WorkArea): DrawFn => (ctx, w, h) => {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(63,211,204,0.9)';
  ctx.font = `700 ${Math.round(h * 0.42)}px Geist, system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${a.label.toUpperCase()} · WORK AREA`, w / 2, h * 0.5, w * 0.96);
};

const howTo = (a: WorkArea): DrawFn => (ctx, w, h) => {
  ctx.fillStyle = 'rgba(6,16,26,0.92)';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#3fd3cc';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, w - 4, h - 4);
  ctx.fillStyle = '#3fd3cc';
  ctx.font = `700 ${Math.round(h * 0.1)}px Geist, system-ui, sans-serif`;
  ctx.textBaseline = 'middle';
  ctx.fillText('HOW TO USE', w * 0.06, h * 0.14);
  ctx.fillStyle = '#e7edf3';
  ctx.font = `600 ${Math.round(h * 0.11)}px Geist, system-ui, sans-serif`;
  ctx.fillText(a.label, w * 0.06, h * 0.3, w * 0.88);
  ctx.font = `400 ${Math.round(h * 0.075)}px Geist, system-ui, sans-serif`;
  a.how.forEach((line, i) => {
    const y = h * (0.5 + i * 0.16);
    ctx.fillStyle = '#18b8b3';
    ctx.beginPath();
    ctx.arc(w * 0.09, y, h * 0.045, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#05080d';
    ctx.font = `700 ${Math.round(h * 0.06)}px Geist, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(String(i + 1), w * 0.09, y + 1);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#c9d4df';
    ctx.font = `400 ${Math.round(h * 0.07)}px Geist, system-ui, sans-serif`;
    ctx.fillText(line, w * 0.16, y, w * 0.8);
  });
};

/** Where the how-to sign stands for each work area: [x, y, z, rotationY]. */
const SIGN_POS: Record<WorkArea['id'], [number, number, number, number]> = {
  storage: [-9.6, 1.55, 4.9, Math.PI],
  analyzer: [6.25, 1.6, -4.6, Math.PI / 2],
};

function Area({ a, active, inside }: { a: WorkArea; active: boolean; inside: boolean }) {
  const mat = active || inside ? M.lightStrip : M.accentSoft;
  const t = 0.04;
  const [sx, sy, sz, sr] = SIGN_POS[a.id];
  return (
    <group>
      <group position={[a.x, 0.006, a.z]} rotation-x={-Math.PI / 2}>
        <mesh position={[0, a.d / 2, 0]} material={mat}><planeGeometry args={[a.w, t]} /></mesh>
        <mesh position={[0, -a.d / 2, 0]} material={mat}><planeGeometry args={[a.w, t]} /></mesh>
        <mesh position={[a.w / 2, 0, 0]} material={mat}><planeGeometry args={[t, a.d]} /></mesh>
        <mesh position={[-a.w / 2, 0, 0]} material={mat}><planeGeometry args={[t, a.d]} /></mesh>
        {(active || inside) && <mesh material={M.holo}><planeGeometry args={[a.w, a.d]} /></mesh>}
        {a.id !== 'storage' && (
          <CanvasPlane width={Math.min(a.w, 2.6)} height={0.22} position={[0, -a.d / 2 - 0.16, 0.001]} draw={floorLabel(a)} deps={[]} px={64} emissive={1} transparent />
        )}
      </group>
      <group position={[sx, sy, sz]} rotation-y={sr}>
        <CanvasPlane width={1.0} height={0.62} draw={howTo(a)} deps={[]} px={256} emissive={0.9} />
        <mesh position={[0, -0.95, -0.03]} material={M.darkSteel}><boxGeometry args={[0.05, 1.3, 0.05]} /></mesh>
      </group>
    </group>
  );
}

export function WorkAreas() {
  const guidance = useGuidance();
  const zone = useGame((s) => s.currentZone);
  return (
    <>
      {WORK_AREAS.map((a) => (
        <Area key={a.id} a={a} active={guidance?.target === a.id} inside={(a.id === 'storage' && zone === 'storage') || (a.id === 'analyzer' && zone === 'analysis_suite')} />
      ))}
      {guidance?.target && <Beacon position={TARGET_POSITIONS[guidance.target]} />}
    </>
  );
}

/** Floating marker and light column above the current objective target. */
function Beacon({ position }: { position: [number, number, number] }) {
  const g = useRef<Group>(null);
  const ring = useRef<Mesh>(null);
  const ringMat = useMemo(() => M.holo.clone(), []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (g.current) {
      g.current.rotation.y = t * 1.2;
      g.current.position.y = position[1] + Math.sin(t * 2) * 0.06;
    }
    if (ring.current) {
      const s = 1 + ((t * 0.8) % 1) * 0.8;
      ring.current.scale.set(s, s, s);
      ringMat.opacity = 0.4 * (1 - ((t * 0.8) % 1));
    }
  });
  return (
    <group>
      <group ref={g} position={position}>
        <mesh material={M.accent} rotation-z={Math.PI / 4}>
          <octahedronGeometry args={[0.14, 0]} />
        </mesh>
      </group>
      <mesh position={[position[0], position[1] / 2, position[2]]} material={M.holo}>
        <cylinderGeometry args={[0.03, 0.03, position[1], 8, 1, true]} />
      </mesh>
      <mesh ref={ring} position={[position[0], 0.01, position[2]]} rotation-x={-Math.PI / 2} material={ringMat}>
        <ringGeometry args={[0.35, 0.42, 40]} />
      </mesh>
    </group>
  );
}
