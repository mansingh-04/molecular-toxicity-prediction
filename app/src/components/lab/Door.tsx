import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import { DOOR, WALL_HEIGHT } from '@/data/labLayout';
import { useGame } from '@/store/gameStore';
import { setColliderEnabled } from '@/components/game/collision';
import { useInteractable } from '@/components/game/interactables';
import { M } from './materials';
import { FocusGlow } from './FocusGlow';

/** Sliding entrance door. Its collider is disabled while open. */
export function Door() {
  const open = useGame((s) => s.doorOpen);
  const toggle = useGame((s) => s.toggleDoor);
  const left = useRef<Group>(null);
  const right = useRef<Group>(null);
  const amount = useRef(open ? 1 : 0);

  useEffect(() => {
    setColliderEnabled(DOOR.id, !open);
  }, [open]);

  useInteractable({
    id: 'door-main',
    position: [DOOR.x, 1.3, DOOR.z],
    radius: 1.0,
    prompt: () => ({ label: 'Laboratory entrance', verb: open ? 'Close door' : 'Open door' }),
    onInteract: toggle,
  });

  useFrame((_, dt) => {
    const target = open ? 1 : 0;
    amount.current += (target - amount.current) * Math.min(1, dt * 6);
    const off = amount.current * (DOOR.width / 2 - 0.05);
    if (left.current) left.current.position.x = DOOR.x - DOOR.width / 4 - off;
    if (right.current) right.current.position.x = DOOR.x + DOOR.width / 4 + off;
  });

  const h = WALL_HEIGHT - 0.6;
  const leaf = (
    <>
      <mesh position={[0, h / 2, 0]} material={M.glass}><boxGeometry args={[DOOR.width / 2 - 0.04, h, 0.06]} /></mesh>
      <mesh position={[0, h / 2, 0]} material={M.frame}><boxGeometry args={[DOOR.width / 2, 0.08, 0.08]} /></mesh>
      <mesh position={[0, h - 0.04, 0]} material={M.frame}><boxGeometry args={[DOOR.width / 2, 0.08, 0.08]} /></mesh>
      <mesh position={[0, 0.04, 0]} material={M.frame}><boxGeometry args={[DOOR.width / 2, 0.08, 0.08]} /></mesh>
    </>
  );
  return (
    <group position={[0, 0, DOOR.z]}>
      <group ref={left}>{leaf}</group>
      <group ref={right}>{leaf}</group>
      {/* header */}
      <mesh position={[DOOR.x, h + 0.3, 0]} material={M.wall}><boxGeometry args={[DOOR.width + 0.1, 0.6, 0.2]} /></mesh>
      <mesh position={[DOOR.x, h + 0.05, 0.11]} material={open ? M.accent : M.red}><boxGeometry args={[0.5, 0.04, 0.02]} /></mesh>
      <FocusGlow id="door-main" size={[DOOR.width + 0.1, h, 0.3]} position={[DOOR.x, h / 2, 0]} />
    </group>
  );
}
