import { useState } from 'react';
import { useGame } from '@/store/gameStore';
import { ControlsList } from './HUD';
import { SettingsForm } from '@/components/ui/SettingsForm';

export function PauseMenu({ onResume }: { onResume: () => void }) {
  const paused = useGame((s) => s.paused);
  const exitLab = useGame((s) => s.exitLab);
  const [tab, setTab] = useState<'main' | 'controls' | 'settings'>('main');
  if (!paused) return null;
  return (
    <div className="absolute inset-0 z-40 grid place-items-center bg-ink-950/70 p-4 backdrop-blur-sm">
      <section role="dialog" aria-modal="true" aria-label="Paused" className="glass w-full max-w-sm animate-fadeIn rounded-2xl p-6">
        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent-400">Lab simulation</div>
        <h2 className="mt-1 text-xl font-semibold text-white">Paused</h2>
        {tab === 'main' ? (
          <div className="mt-5 flex flex-col gap-2">
            <button className="btn-primary" autoFocus onClick={onResume}>Resume</button>
            <button className="btn-secondary" onClick={() => setTab('controls')}>Controls</button>
            <button className="btn-secondary" onClick={() => setTab('settings')}>Graphics & mouse</button>
            <button className="btn-ghost mt-2" onClick={exitLab}>Back to the dashboard</button>
          </div>
        ) : (
          <div className="mt-4">
            {tab === 'controls' ? <ControlsList /> : <SettingsForm />}
            <button className="btn-secondary mt-5 w-full" onClick={() => setTab('main')}>Back</button>
          </div>
        )}
      </section>
    </div>
  );
}
