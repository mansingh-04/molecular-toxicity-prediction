import { useCallback, useEffect, useRef, useState } from 'react';
import { useGame } from '@/store/gameStore';
import { LabScene } from '@/components/game/LabScene';
import { HUD } from '@/components/game/HUD';
import { PauseMenu } from '@/components/game/PauseMenu';
import { LabPanels } from '@/components/game/LabPanels';
import { installInput, isTyping, keys, look, uninstallInput } from '@/components/game/input';
import { interactables } from '@/components/game/interactables';

/**
 * The 3D lab simulation: pick a vial in Chemical Storage, carry it to the analyzer,
 * run the trained models and read the report. Keys: E interact, V camera, H controls, Esc pause.
 */
export function LabPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [locked, setLocked] = useState(false);

  const requestLock = useCallback(() => {
    const c = canvasRef.current;
    if (!c || document.pointerLockElement === c) return;
    try {
      const p = c.requestPointerLock() as unknown as Promise<void> | undefined;
      p?.catch?.(() => undefined);
    } catch {
      /* pointer lock unavailable: drag-to-look still works */
    }
  }, []);

  useEffect(() => {
    installInput();
    const onLockChange = () => {
      const isLocked = document.pointerLockElement === canvasRef.current;
      setLocked(isLocked);
      const st = useGame.getState();
      if (!isLocked && !st.panel && st.screen === 'lab') st.setPaused(true);
    };
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target) || e.defaultPrevented || e.repeat) return;
      const st = useGame.getState();
      if (e.code === 'Escape') {
        if (st.panel) return; // the open panel handles its own Escape
        st.setPaused(!st.paused);
        return;
      }
      if (st.paused || st.panel) return;
      if (e.code === 'KeyE' && st.focused) interactables.get(st.focused.id)?.onInteract();
      else if (e.code === 'KeyV') st.toggleCamera();
      else if (e.code === 'KeyH') st.setShowHelp(!st.showHelp);
    };
    document.addEventListener('pointerlockchange', onLockChange);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerlockchange', onLockChange);
      window.removeEventListener('keydown', onKey);
      if (document.pointerLockElement) document.exitPointerLock();
      uninstallInput();
    };
  }, []);

  // When a panel opens, movement keys must not stay "held"; re-capture the mouse when it closes.
  const panel = useGame((s) => s.panel);
  const paused = useGame((s) => s.paused);
  const prevPanel = useRef(panel);
  useEffect(() => {
    if (panel || paused) keys.clear();
    if (prevPanel.current && !panel && !paused) requestLock();
    prevPanel.current = panel;
  }, [panel, paused, requestLock]);

  const resume = () => {
    useGame.getState().setPaused(false);
    requestLock();
  };

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div
        className="absolute inset-0"
        onMouseDown={(e) => {
          const st = useGame.getState();
          if (e.button !== 0 || st.panel || st.paused) return;
          look.dragging = true;
          requestLock();
        }}
      >
        <LabScene onCanvas={(c) => (canvasRef.current = c)} suspended={!!panel || paused} />
      </div>
      <HUD locked={locked} />
      <LabPanels />
      <PauseMenu onResume={resume} />
    </div>
  );
}
