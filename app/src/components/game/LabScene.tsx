import { SHELF_KEYS } from '@/data/labLayout';
import { useGame } from '@/store/gameStore';
import { Room, Lighting } from '@/components/lab/Room';
import { Door } from '@/components/lab/Door';
import { Shelf } from '@/components/lab/Shelf';
import { Bench, FumeHood, NoticeBoard, SafetyStation, ServerRacks, StorageExtras, SuiteDesk } from '@/components/lab/Equipment';
import { Analyzer } from '@/components/lab/Stations';
import { WorkAreas } from '@/components/lab/WorkAreas';
import { PlayerController } from './PlayerController';
import { SceneCanvas } from './SceneCanvas';

/** All lab content: storage shelves with vials, decorative benches, and the analyzer. */
export function LabWorld() {
  const quality = useGame((s) => s.settings.graphics) === 'quality';
  return (
    <>
      <Lighting quality={quality} />
      <Room detail={quality} />
      <Door />
      {SHELF_KEYS.map((k) => <Shelf key={k} shelf={k} />)}
      <StorageExtras />
      <Bench which="benchA" />
      <Bench which="benchB" />
      <FumeHood />
      <SafetyStation />
      <NoticeBoard />
      <Analyzer />
      <ServerRacks />
      <SuiteDesk />
    </>
  );
}

/** The playable 3D laboratory. Rendering only — game state lives in the store. */
export function LabScene({ onCanvas, suspended }: { onCanvas?: (c: HTMLCanvasElement) => void; suspended: boolean }) {
  return (
    <SceneCanvas onCanvas={onCanvas} suspended={suspended}>
      <LabWorld />
      <WorkAreas />
      <PlayerController />
    </SceneCanvas>
  );
}
