import { useEffect, useRef } from 'react';
import type { FocusInfo } from '@/store/gameStore';

export interface Interactable {
  id: string;
  position: [number, number, number];
  radius: number;
  prompt: () => Omit<FocusInfo, 'id'> | null;
  onInteract: () => void;
}

/** Registry of everything the player can interact with. Read by the player controller each frame. */
export const interactables = new Map<string, Interactable>();

/** Registers an interactable for the lifetime of the component. prompt/onInteract may change freely. */
export function useInteractable(def: Interactable | null) {
  const ref = useRef(def);
  ref.current = def;
  const id = def?.id;
  const [x, y, z] = def?.position ?? [0, 0, 0];
  const radius = def?.radius ?? 0;
  useEffect(() => {
    if (!id) return;
    interactables.set(id, {
      id,
      position: [x, y, z],
      radius,
      prompt: () => ref.current?.prompt() ?? null,
      onInteract: () => ref.current?.onInteract(),
    });
    return () => {
      interactables.delete(id);
    };
  }, [id, x, y, z, radius]);
}
