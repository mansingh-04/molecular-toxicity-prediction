import { useGame } from '@/store/gameStore';
import { highlightMaterial } from './materials';

/** Translucent highlight box shown around the interactable the player is focusing. */
export function FocusGlow({ id, size, position = [0, 0, 0] }: { id: string; size: [number, number, number]; position?: [number, number, number] }) {
  const on = useGame((s) => s.focused?.id === id);
  if (!on) return null;
  return (
    <mesh position={position} material={highlightMaterial} renderOrder={10}>
      <boxGeometry args={size} />
    </mesh>
  );
}
