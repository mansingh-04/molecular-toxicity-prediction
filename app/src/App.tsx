import { lazy, Suspense, useEffect } from 'react';
import { useGame } from '@/store/gameStore';
import { HomePage } from '@/pages/HomePage';
import { ToastStack } from '@/components/ui/ToastStack';

// The 3D lab is loaded only when it is opened, so the dashboard stays small and fast.
const LabPage = lazy(() => import('@/pages/LabPage').then((m) => ({ default: m.LabPage })));

export default function App() {
  const screen = useGame((s) => s.screen);
  const init = useGame((s) => s.init);
  useEffect(() => {
    init();
  }, [init]);

  return (
    <div className="h-full w-full">
      {screen === 'home' && <HomePage />}
      {screen === 'lab' && (
        <Suspense fallback={<div className="grid h-full place-items-center text-sm text-lab-300">Loading the 3D lab…</div>}>
          <LabPage />
        </Suspense>
      )}
      <ToastStack />
    </div>
  );
}
