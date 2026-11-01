import { useMemo } from 'react';
import { FURNITURE, SHELF_LEVEL_Y, vialWorldPosition, type ShelfKey, type VialSlot } from '@/data/labLayout';
import { useGame } from '@/store/gameStore';
import { useInteractable } from '@/components/game/interactables';
import { M, liquidFor, liquidMaterial } from './materials';
import { CanvasPlane, type DrawFn } from './CanvasLabel';

const W = 2.6;
const D = 0.5;
const HT = 2.3;

/** Storage shelving unit. Every compound in the library has a labelled vial position (local +z = front). */
export function Shelf({ shelf }: { shelf: ShelfKey }) {
  const f = FURNITURE[shelf];
  const allSlots = useGame((s) => s.vialSlots());
  const held = useGame((s) => s.heldSlotId);
  const collected = useMemo(() => (held ? [held] : []), [held]);
  const getCompound = useGame((s) => s.getCompound);
  const slots = useMemo(() => allSlots.filter((v) => v.shelf === shelf), [allSlots, shelf]);
  const levels = [...new Set(slots.map((s) => s.level))];

  const labelFor = (level: number): DrawFn => (ctx, w, h) => {
    ctx.fillStyle = '#0d141d';
    ctx.fillRect(0, 0, w, h);
    for (const s of slots.filter((x) => x.level === level)) {
      const c = getCompound(s.compoundId);
      const cx = ((s.lx + W / 2) / W) * w;
      const taken = collected.includes(s.id);
      ctx.fillStyle = liquidFor(c?.category);
      ctx.fillRect(cx - w * 0.07, 0, w * 0.14, h * 0.12);
      ctx.fillStyle = taken ? '#7489a0' : '#e7edf3';
      ctx.font = `600 ${Math.round(h * 0.42)}px Geist, system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(c?.name ?? s.compoundId, cx, h * 0.5, w * 0.14);
      ctx.fillStyle = '#7fe6e0';
      ctx.font = `500 ${Math.round(h * 0.24)}px "Geist Mono", monospace`;
      ctx.fillText(taken ? 'IN HAND' : s.code, cx, h * 0.84, w * 0.14);
    }
  };

  const categories = [...new Set(slots.map((s) => getCompound(s.compoundId)?.category).filter(Boolean))] as string[];
  const header: DrawFn = (ctx, w, h) => {
    ctx.fillStyle = '#0b1219';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#18b8b3';
    ctx.fillRect(0, h - 4, w, 4);
    ctx.fillStyle = '#e7edf3';
    ctx.font = `600 ${Math.round(h * 0.36)}px Geist, system-ui, sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.fillText(`Rack ${shelf.replace('shelf', '')}`, h * 0.3, h * 0.36);
    ctx.fillStyle = '#9fb0c2';
    ctx.font = `400 ${Math.round(h * 0.22)}px Geist, system-ui, sans-serif`;
    ctx.fillText(categories.length ? categories.join(' · ') : 'Empty — add compounds to the library', h * 0.3, h * 0.72, w - h * 0.6);
  };

  const labelKey = slots.map((s) => `${s.id}:${collected.includes(s.id) ? 1 : 0}:${getCompound(s.compoundId)?.name}`).join('|');

  return (
    <>
      <group position={[f.x, 0, f.z]} rotation-y={f.rot}>
        {[-W / 2, W / 2].map((x) => (
          <mesh key={x} position={[x, HT / 2, 0]} material={M.darkSteel} castShadow><boxGeometry args={[0.05, HT, D]} /></mesh>
        ))}
        <mesh position={[0, HT / 2, -D / 2 + 0.01]} material={M.instrumentDark}><boxGeometry args={[W, HT, 0.02]} /></mesh>
        <mesh position={[0, HT / 2, -D / 2 + 0.025]} material={M.lightStrip}><boxGeometry args={[0.02, HT - 0.2, 0.005]} /></mesh>
        {SHELF_LEVEL_Y.map((y, i) => (
          <group key={y} position={[0, y, 0]}>
            <mesh material={M.steel} receiveShadow castShadow><boxGeometry args={[W, 0.03, D]} /></mesh>
            {i > 0 && <mesh position={[0, -0.022, D / 2 - 0.04]} material={M.lightStrip}><boxGeometry args={[W - 0.1, 0.008, 0.02]} /></mesh>}
          </group>
        ))}
        <mesh position={[0, HT, 0]} material={M.darkSteel}><boxGeometry args={[W + 0.06, 0.05, D]} /></mesh>
        <CanvasPlane width={W} height={0.3} position={[0, HT + 0.2, D / 2 - 0.05]} draw={header} deps={[categories.join(',')]} px={96} emissive={0.8} />
        {levels.map((lv) => (
          <CanvasPlane key={lv} width={W} height={0.065} position={[0, SHELF_LEVEL_Y[lv] - 0.05, D / 2 + 0.003]} draw={labelFor(lv)} deps={[labelKey]} px={64} emissive={0.7} />
        ))}
        {/* bulk stock bottles on the bottom level */}
        {[-1.05, -0.7, 0.6, 0.95].map((x, i) => (
          <mesh key={i} position={[x, SHELF_LEVEL_Y[0] + 0.15, -0.08]} material={i % 2 ? M.cabinet : M.cap} castShadow>
            <cylinderGeometry args={[0.08, 0.08, 0.28, 16]} />
          </mesh>
        ))}
      </group>
      {slots.filter((v) => !collected.includes(v.id)).map((v) => (
        <Vial key={v.id} slot={v} />
      ))}
    </>
  );
}

function Vial({ slot }: { slot: VialSlot }) {
  const pos = vialWorldPosition(slot);
  const compound = useGame((s) => s.getCompound(slot.compoundId));
  const focused = useGame((s) => s.focused?.id === `vial-${slot.id}`);
  const openPanel = useGame((s) => s.openPanel);
  useInteractable({
    id: `vial-${slot.id}`,
    position: [pos.x, pos.y, pos.z],
    radius: 0.17,
    prompt: () => ({ label: `${compound?.name ?? 'Sample'} · vial ${slot.code}`, verb: 'Look at vial' }),
    onInteract: () => openPanel('inspect', { kind: 'vial', slotId: slot.id }),
  });
  return (
    <group position={[pos.x, pos.y, pos.z]} scale={1.35}>
      <VialMesh color={liquidFor(compound?.category)} glow={focused} />
    </group>
  );
}

export function VialMesh({ color, glow, ...props }: { color: string; glow?: boolean } & JSX.IntrinsicElements['group']) {
  return (
    <group {...props}>
      <group scale={glow ? 1.15 : 1}>
        <mesh material={M.vialGlass}><cylinderGeometry args={[0.035, 0.035, 0.16, 18]} /></mesh>
        <mesh position={[0, -0.025, 0]} material={liquidMaterial(color)}><cylinderGeometry args={[0.03, 0.03, 0.1, 18]} /></mesh>
        <mesh position={[0, 0.095, 0]} material={glow ? M.accent : M.cap}><cylinderGeometry args={[0.038, 0.038, 0.03, 18]} /></mesh>
        <mesh position={[0, -0.01, 0.036]} material={M.cabinet}><planeGeometry args={[0.05, 0.05]} /></mesh>
      </group>
    </group>
  );
}
