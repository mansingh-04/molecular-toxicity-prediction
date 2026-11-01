import { useGame } from '@/store/gameStore';
import { ZONES } from '@/data/labLayout';
import { Icon } from '@/components/ui/Icon';
import { liquidFor } from '@/components/lab/materials';
import { GuideBar, Minimap } from './Guidance';

export function HUD({ locked }: { locked: boolean }) {
  const focused = useGame((s) => s.focused);
  const panel = useGame((s) => s.panel);
  const cameraMode = useGame((s) => s.cameraMode);
  const zone = useGame((s) => s.currentZone);
  const held = useGame((s) => s.heldCompound());
  const hasReport = useGame((s) => s.analysis.state === 'done');
  const openPanel = useGame((s) => s.openPanel);
  const setPaused = useGame((s) => s.setPaused);
  const exitLab = useGame((s) => s.exitLab);
  const showHelp = useGame((s) => s.showHelp);
  const zoneLabel = ZONES.find((z) => z.id === zone)?.label;

  return (
    <div className="pointer-events-none absolute inset-0 z-20 select-none">
      {/* top-left: what you are carrying */}
      <div className="pointer-events-auto absolute left-3 top-3 sm:left-4 sm:top-4">
        <div className="glass w-72 rounded-xl px-3.5 py-2.5">
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-accent-400">Lab simulation</div>
          {held?.origin === 'custom' ? (
            <div className="mt-1 min-w-0"><div className="truncate text-sm text-white">{held.name} loaded in the analyzer</div><div className="text-[11px] text-lab-400">Custom molecule · press E at the analyzer to run it</div></div>
          ) : held ? (
            <div className="mt-1 flex items-center gap-2">
              <span className="h-5 w-2 rounded-b-sm rounded-t-[1px] border border-white/40" style={{ background: `linear-gradient(to top, ${liquidFor(held.category)} 65%, transparent 65%)` }} />
              <div className="min-w-0"><div className="truncate text-sm text-white">Holding {held.name}</div><div className="text-[11px] text-lab-400">Take it to the Toxicity Analyzer</div></div>
            </div>
          ) : (
            <div className="mt-1 text-sm text-white">Hands empty · pick a vial in Chemical Storage, or type a SMILES at the analyzer</div>
          )}
          {hasReport && <button className="btn-secondary mt-2 w-full py-1 text-xs" onClick={() => openPanel('results')}>Open the last report</button>}
        </div>
      </div>

      {/* top-right */}
      <div className="pointer-events-auto absolute right-3 top-3 flex gap-2 sm:right-4 sm:top-4">
        <button className="glass rounded-xl px-3 py-2 text-xs text-lab-100 hover:bg-white/10" onClick={exitLab}>← Dashboard</button>
        <button className="glass rounded-xl px-2.5 py-2 text-lab-100 hover:bg-white/10" onClick={() => setPaused(true)} aria-label="Pause"><Icon name="pause" /></button>
      </div>

      {/* next-step guidance */}
      {!panel && (
        <div className="absolute left-1/2 top-4 hidden -translate-x-1/2 lg:block">
          <GuideBar />
        </div>
      )}

      {/* centre */}
      {!panel && cameraMode === 'first' && (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className={`h-1.5 w-1.5 rounded-full ${focused ? 'bg-accent-300 ring-4 ring-accent-400/25' : 'bg-white/70'}`} />
        </div>
      )}
      {!panel && focused && (
        <div className="absolute left-1/2 top-[60%] -translate-x-1/2 animate-fadeIn">
          <div className="glass flex items-center gap-3 rounded-xl px-4 py-2.5">
            <span className="kbd text-sm">E</span>
            <div>
              <div className="text-sm font-semibold text-white">{focused.verb}</div>
              <div className="text-xs text-lab-300">{focused.label}</div>
            </div>
          </div>
        </div>
      )}
      {!panel && !locked && (
        <div className="absolute left-1/2 top-[44%] -translate-x-1/2 rounded-lg bg-ink-950/70 px-3 py-1.5 text-xs text-lab-200">
          Click the view to capture the mouse (or drag to look)
        </div>
      )}

      {/* bottom */}
      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2">
        {!panel && <div className="lg:hidden"><GuideBar /></div>}
        {zoneLabel && <div className="rounded-md bg-ink-950/60 px-2.5 py-0.5 text-[11px] uppercase tracking-[0.14em] text-lab-300">{zoneLabel}</div>}
      </div>
      <div className="absolute bottom-4 left-4 hidden text-[11px] text-lab-400 lg:block">
        <span className="kbd">V</span> {cameraMode === 'first' ? 'First-person' : 'Third-person'} · <span className="kbd">H</span> Controls · <span className="kbd">Esc</span> Pause
      </div>
      {!panel && (
        <div className="absolute bottom-4 right-4 hidden sm:block">
          <Minimap />
        </div>
      )}
      {showHelp && !panel && <ControlsCard />}
    </div>
  );
}

export function ControlsList() {
  const rows: [string, string][] = [
    ['W A S D / Arrows', 'Move'],
    ['Shift', 'Walk faster'],
    ['Mouse', 'Look (click view to capture, or drag)'],
    ['E', 'Interact with highlighted object'],
    ['V', 'Toggle first / third person'],
    ['H', 'Show / hide controls'],
    ['Esc', 'Close panel / pause'],
  ];
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-xs">
      {rows.map(([k, v]) => (
        <div key={k} className="contents"><dt><span className="kbd">{k}</span></dt><dd className="text-lab-200">{v}</dd></div>
      ))}
    </dl>
  );
}

function ControlsCard() {
  const setShowHelp = useGame((s) => s.setShowHelp);
  return (
    <div className="pointer-events-auto glass absolute bottom-48 right-4 hidden w-64 animate-fadeIn rounded-xl p-4 md:block [@media(max-height:820px)]:hidden">
      <div className="mb-2 flex items-center justify-between">
        <span className="h-section">Controls</span>
        <button className="text-lab-400 hover:text-white" onClick={() => setShowHelp(false)} aria-label="Hide controls"><Icon name="close" className="h-3.5 w-3.5" /></button>
      </div>
      <ControlsList />
    </div>
  );
}
