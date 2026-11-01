import { useGame } from '@/store/gameStore';
import { Panel } from '@/components/ui/Panel';
import { AnalyzerBody } from '@/components/instruments/AnalyzerPanel';
import { ResultsView } from '@/components/results/ResultsView';
import { InspectBody } from './InspectPanel';
import { EQUIPMENT } from '@/data/equipment';

/** Maps the open panel id to its in-world overlay. */
export function LabPanels() {
  const panel = useGame((s) => s.panel);
  const close = useGame((s) => s.closePanel);
  const inspect = useGame((s) => s.inspect);
  const result = useGame((s) => (s.analysis.resultId ? s.results[s.analysis.resultId] : undefined));
  if (!panel) return null;

  switch (panel) {
    case 'analyzer':
      return <Panel title="Computational Toxicity Analyzer" subtitle="Runs the trained models on the loaded sample" icon="cpu" onClose={close}><AnalyzerBody /></Panel>;
    case 'results':
      return (
        <Panel title="Analysis Report" subtitle="12 Tox21 assays" icon="book" onClose={close} width="max-w-5xl">
          {result ? <ResultsView result={result} /> : <p className="text-sm text-lab-300">No report yet. Run an analysis at the analyzer first.</p>}
        </Panel>
      );
    case 'inspect': {
      const title = inspect?.kind === 'equipment' ? EQUIPMENT[inspect.equipmentId]?.name ?? 'Equipment' : 'Sample vial';
      return <Panel title={title} icon={inspect?.kind === 'equipment' ? 'info' : 'vial'} onClose={close} width="max-w-2xl"><InspectBody /></Panel>;
    }
  }
}
