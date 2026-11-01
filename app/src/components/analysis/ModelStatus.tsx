import { useGame } from '@/store/gameStore';
import { Icon } from '@/components/ui/Icon';

/** Shows whether the trained models have loaded in this browser. */
export function ModelStatusBanner() {
  const modelStatus = useGame((s) => s.modelStatus);
  const refresh = useGame((s) => s.refreshModels);

  if (modelStatus.state === 'loading') {
    return <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-lab-300">Loading the trained models…</div>;
  }
  if (modelStatus.state === 'error') {
    return (
      <div className="flex items-center justify-between gap-2 rounded-lg border border-danger-500/30 bg-danger-500/10 px-3 py-2 text-xs text-danger-400">
        <span><b>The models could not be loaded.</b> {modelStatus.error}</span>
        <button className="btn-ghost px-2 py-0.5 text-xs" onClick={() => void refresh()}>Retry</button>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 rounded-lg border border-ok-500/30 bg-ok-500/10 px-3 py-2 text-xs text-ok-400">
      <Icon name="check" className="h-3.5 w-3.5" />
      <span>Trained models ready · running in your browser (Morgan fingerprints)</span>
    </div>
  );
}
