import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Mesh } from 'three';
import { FURNITURE, type FurnitureDef } from '@/data/labLayout';
import { EQUIPMENT } from '@/data/equipment';
import { useGame } from '@/store/gameStore';
import { useInteractable } from '@/components/game/interactables';
import { M } from './materials';
import { FocusGlow } from './FocusGlow';

/** Makes any equipment inspectable: opens an info card. */
export function useInspectable(equipmentId: string, position: [number, number, number], radius: number) {
  const openPanel = useGame((s) => s.openPanel);
  useInteractable({
    id: `eq-${equipmentId}`,
    position,
    radius,
    prompt: () => ({ label: EQUIPMENT[equipmentId]?.name ?? equipmentId, verb: 'Inspect' }),
    onInteract: () => {
      openPanel('inspect', { kind: 'equipment', equipmentId });
    },
  });
}

const at = (f: FurnitureDef) => ({ position: [f.x, 0, f.z] as [number, number, number], 'rotation-y': f.rot });

export function Bench({ which }: { which: 'benchA' | 'benchB' }) {
  const f = FURNITURE[which];
  const W = f.w, L = f.d;
  return (
    <group position={[f.x, 0, f.z]}>
      <mesh position={[0, 0.92, 0]} material={M.benchTop} castShadow receiveShadow><boxGeometry args={[W, 0.06, L]} /></mesh>
      <mesh position={[0, 0.45, 0]} material={M.cabinet} castShadow><boxGeometry args={[W - 0.1, 0.86, L - 0.1]} /></mesh>
      <mesh position={[0, 0.03, 0]} material={M.rubber}><boxGeometry args={[W - 0.16, 0.06, L - 0.16]} /></mesh>
      {/* reagent shelf */}
      <mesh position={[0, 1.45, 0]} material={M.steel}><boxGeometry args={[0.3, 0.03, L - 0.4]} /></mesh>
      {[-L / 2 + 0.25, L / 2 - 0.25].map((z) => (
        <mesh key={z} position={[0, 1.2, z]} material={M.darkSteel}><boxGeometry args={[0.04, 0.55, 0.04]} /></mesh>
      ))}
      {[-1.6, -1.2, 0.4, 1.0, 1.5].map((z, i) => (
        <mesh key={z} position={[0, 1.53, z]} material={i % 2 ? M.vialGlass : M.cabinet}><cylinderGeometry args={[0.05, 0.05, 0.14, 12]} /></mesh>
      ))}
      {/* beakers */}
      {[-0.8, -0.5].map((z) => (
        <mesh key={z} position={[which === 'benchA' ? 0.35 : -0.35, 1.02, z]} material={M.vialGlass}><cylinderGeometry args={[0.06, 0.055, 0.14, 16, 1, true]} /></mesh>
      ))}
      {which === 'benchA' ? <Microscope /> : <Centrifuge />}
    </group>
  );
}

function Microscope() {
  const f = FURNITURE.benchA;
  useInspectable('microscope', [f.x + 0.3, 1.15, f.z + 1.4], 0.3);
  return (
    <group position={[0.3, 0.95, 1.4]} rotation-y={Math.PI / 2}>
      <mesh position={[0, 0.03, 0]} material={M.instrumentDark}><boxGeometry args={[0.22, 0.05, 0.28]} /></mesh>
      <mesh position={[0, 0.2, -0.08]} material={M.instrument}><boxGeometry args={[0.07, 0.34, 0.07]} /></mesh>
      <mesh position={[0, 0.32, 0.0]} rotation-x={0.6} material={M.instrumentDark}><cylinderGeometry args={[0.025, 0.03, 0.22, 12]} /></mesh>
      <mesh position={[0, 0.14, 0.03]} material={M.steel}><boxGeometry args={[0.16, 0.015, 0.12]} /></mesh>
      <FocusGlow id="eq-microscope" size={[0.3, 0.5, 0.36]} position={[0, 0.22, 0]} />
    </group>
  );
}

function Centrifuge() {
  const f = FURNITURE.benchB;
  const lid = useRef<Mesh>(null);
  useInspectable('centrifuge', [f.x - 0.3, 1.1, f.z + 1.3], 0.32);
  useFrame((_, dt) => {
    if (lid.current) lid.current.rotation.y += dt * 0.6;
  });
  return (
    <group position={[-0.3, 0.95, 1.3]}>
      <mesh position={[0, 0.12, 0]} material={M.instrument} castShadow><cylinderGeometry args={[0.2, 0.22, 0.24, 24]} /></mesh>
      <mesh ref={lid} position={[0, 0.25, 0]} material={M.instrumentDark}><cylinderGeometry args={[0.19, 0.19, 0.03, 24]} /></mesh>
      <mesh position={[0, 0.12, 0.215]} material={M.accent}><boxGeometry args={[0.1, 0.03, 0.01]} /></mesh>
      <FocusGlow id="eq-centrifuge" size={[0.5, 0.34, 0.5]} position={[0, 0.14, 0]} />
    </group>
  );
}

export function FumeHood() {
  const f = FURNITURE.fumeHood;
  useInspectable('fume-hood', [f.x, 1.3, f.z + 0.5], 0.8);
  return (
    <group {...at(f)}>
      <mesh position={[0, 0.45, 0]} material={M.cabinet} castShadow><boxGeometry args={[f.w, 0.9, f.d]} /></mesh>
      <mesh position={[0, 0.93, 0.02]} material={M.benchTop}><boxGeometry args={[f.w, 0.06, f.d]} /></mesh>
      <mesh position={[-f.w / 2 + 0.05, 1.7, 0]} material={M.cabinet}><boxGeometry args={[0.1, 1.6, f.d]} /></mesh>
      <mesh position={[f.w / 2 - 0.05, 1.7, 0]} material={M.cabinet}><boxGeometry args={[0.1, 1.6, f.d]} /></mesh>
      <mesh position={[0, 2.35, 0]} material={M.cabinet}><boxGeometry args={[f.w, 0.3, f.d]} /></mesh>
      <mesh position={[0, 1.55, f.d / 2 - 0.05]} material={M.glass}><boxGeometry args={[f.w - 0.2, 0.9, 0.02]} /></mesh>
      <mesh position={[0, 1.1, f.d / 2 - 0.04]} material={M.steel}><boxGeometry args={[f.w - 0.2, 0.03, 0.04]} /></mesh>
      <mesh position={[0.7, 2.25, f.d / 2 + 0.005]} material={M.accent}><planeGeometry args={[0.18, 0.05]} /></mesh>
      <FocusGlow id="eq-fume-hood" size={[f.w + 0.1, 2.5, f.d + 0.1]} position={[0, 1.25, 0]} />
    </group>
  );
}

export function SafetyStation() {
  const f = FURNITURE.safetyStation;
  useInspectable('safety-station', [f.x, 1.3, f.z], 0.6);
  return (
    <group {...at(f)}>
      <mesh position={[0, 1.1, 0]} material={M.green}><cylinderGeometry args={[0.04, 0.04, 2.2, 10]} /></mesh>
      <mesh position={[0, 2.15, 0.15]} rotation-x={Math.PI} material={M.green}><coneGeometry args={[0.18, 0.12, 16, 1, true]} /></mesh>
      <mesh position={[0.2, 1.0, 0]} material={M.green}><cylinderGeometry args={[0.12, 0.08, 0.1, 16]} /></mesh>
      <mesh position={[0, 0.01, 0]} rotation-x={-Math.PI / 2} material={M.yellow}><ringGeometry args={[0.35, 0.42, 32]} /></mesh>
      <FocusGlow id="eq-safety-station" size={[0.7, 2.2, 0.7]} position={[0, 1.1, 0]} />
    </group>
  );
}

export function StorageExtras() {
  const fl = FURNITURE.flammables;
  const fr = FURNITURE.fridge;
  useInspectable('flammables-cabinet', [fl.x, 1.0, fl.z], 0.6);
  useInspectable('cold-storage', [fr.x, 1.0, fr.z], 0.6);
  return (
    <>
      <group {...at(fl)}>
        <mesh position={[0, 0.9, 0]} material={M.yellow} castShadow><boxGeometry args={[1.2, 1.8, 0.7]} /></mesh>
        <mesh position={[0, 0.9, 0.351]} material={M.darkSteel}><planeGeometry args={[0.02, 1.6]} /></mesh>
        <mesh position={[0, 1.3, 0.352]} material={M.red}><planeGeometry args={[0.5, 0.18]} /></mesh>
        <FocusGlow id="eq-flammables-cabinet" size={[1.3, 1.9, 0.8]} position={[0, 0.9, 0]} />
      </group>
      <group {...at(fr)}>
        <mesh position={[0, 0.95, 0]} material={M.instrument} castShadow><boxGeometry args={[1.0, 1.9, 0.8]} /></mesh>
        <mesh position={[0, 1.1, 0.401]} material={M.glass}><planeGeometry args={[0.8, 1.3]} /></mesh>
        <mesh position={[0.38, 1.1, 0.41]} material={M.steel}><boxGeometry args={[0.03, 0.5, 0.03]} /></mesh>
        <mesh position={[0, 1.85, 0.402]} material={M.accent}><planeGeometry args={[0.3, 0.05]} /></mesh>
        <FocusGlow id="eq-cold-storage" size={[1.1, 2.0, 0.9]} position={[0, 0.95, 0]} />
      </group>
    </>
  );
}

export function NoticeBoard() {
  const f = FURNITURE.noticeBoard;
  useInspectable('notice-board', [f.x + 0.1, 1.5, f.z], 0.8);
  return (
    <group {...at(f)}>
      <mesh position={[0, 1.5, 0]} material={M.frame}><boxGeometry args={[1.6, 1.0, 0.04]} /></mesh>
      <mesh position={[0, 1.5, 0.025]} material={M.cabinet}><planeGeometry args={[1.5, 0.9]} /></mesh>
      {[[-0.45, 1.7], [0.1, 1.65], [0.5, 1.35], [-0.3, 1.3]].map(([x, y], i) => (
        <mesh key={i} position={[x, y, 0.03]} material={i === 0 ? M.accentSoft : M.instrument}><planeGeometry args={[0.35, 0.28]} /></mesh>
      ))}
      <FocusGlow id="eq-notice-board" size={[1.7, 1.1, 0.15]} position={[0, 1.5, 0]} />
    </group>
  );
}

export function ServerRacks() {
  return (
    <>
      {(['serverRack1', 'serverRack2'] as const).map((k, i) => (
        <ServerRack key={k} which={k} eqId={i === 0 ? 'server-rack-1' : 'server-rack-2'} />
      ))}
    </>
  );
}

function ServerRack({ which, eqId }: { which: 'serverRack1' | 'serverRack2'; eqId: string }) {
  const f = FURNITURE[which];
  useInspectable(eqId, [f.x, 1.2, f.z], 0.6);
  const leds = useRef<Mesh[]>([]);
  useFrame(({ clock }) => {
    leds.current.forEach((m, i) => {
      if (m) m.visible = Math.sin(clock.elapsedTime * (2 + i * 0.7) + i) > -0.3;
    });
  });
  return (
    <group position={[f.x, 0, f.z]} rotation-y={-Math.PI / 2}>
      <mesh position={[0, 1.1, 0]} material={M.instrumentDark} castShadow><boxGeometry args={[1.1, 2.2, 0.9]} /></mesh>
      {Array.from({ length: 8 }, (_, i) => (
        <group key={i} position={[0, 0.35 + i * 0.22, 0.452]}>
          <mesh material={M.darkSteel}><planeGeometry args={[0.95, 0.17]} /></mesh>
          <mesh ref={(m) => { if (m) leds.current[i] = m; }} position={[0.38, 0, 0.002]} material={M.accent}><planeGeometry args={[0.04, 0.02]} /></mesh>
        </group>
      ))}
      <FocusGlow id={`eq-${eqId}`} size={[1.2, 2.3, 1.0]} position={[0, 1.1, 0]} />
    </group>
  );
}

export function SuiteDesk() {
  const f = FURNITURE.suiteDesk;
  return (
    <group {...at(f)}>
      <mesh position={[0, 0.76, 0]} material={M.benchTop} castShadow><boxGeometry args={[f.w, 0.05, f.d]} /></mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (f.w / 2 - 0.05), 0.38, 0]} material={M.darkSteel}><boxGeometry args={[0.05, 0.76, f.d - 0.1]} /></mesh>
      ))}
      <mesh position={[0, 1.1, -0.3]} material={M.screenOff}><boxGeometry args={[0.9, 0.5, 0.03]} /></mesh>
      <mesh position={[0, 1.1, -0.284]} material={M.accentSoft}><planeGeometry args={[0.84, 0.44]} /></mesh>
    </group>
  );
}
