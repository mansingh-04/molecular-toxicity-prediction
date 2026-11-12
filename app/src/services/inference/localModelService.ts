import type { RDKitModule } from '@rdkit/rdkit';
import type { AnalysisConfiguration, AnalysisInput, AnalysisResult, EndpointPrediction, EvaluationRow, ModelId, ModelMetadata, PipelineLogEntry } from '@/types/analysis';
import type { AnalysisService, RunOptions } from '@/services/analysis/types';
import { AnalysisError } from '@/services/analysis/types';
import { loadRDKit } from '@/services/chemistry/rdkitLoader';
import { uid } from '@/services/util/random';
import { featurize, InvalidSmilesError } from './featurize';
import { boostedProbability, forestProbability, logisticProbability, parseTrees, type TreeEnsemble } from './treeModel';
import { graphFromSmiles, type AtomFeatureSpec } from './graphFeaturize';
import { gcnProbabilities, parseGcn, type GcnSpec, type GcnWeights } from './gcnModel';

/**
 * Runs the team's trained models inside the browser. Nothing is sent to a server:
 * RDKit.js computes the fingerprint and the exported models (public/models/) compute the probabilities.
 * Files are downloaded only when first needed and then kept in memory.
 */
const BASE = import.meta.env.BASE_URL ?? '/';

interface Manifest {
  endpoints: string[];
  baseRate: Record<string, Record<string, number>>;
  xgboostBaseMargin: Record<string, number>;
}
interface MetricsFile {
  rows: { model: ModelId; featureSet: string; split: string; endpoint: string; rocAuc: number | null; prAuc: number | null; nObserved: number; nPositive: number; nNegative: number }[];
}
export interface KnownFile {
  endpoints: string[];
  molecules: Record<string, { id: string; split: 'train' | 'val' | 'test'; labels: (0 | 1 | null)[] }>;
}

/** The GCN's own exported description: shapes, atom-feature vocabulary and training base rates. */
interface GcnFile extends GcnSpec {
  atomFeatures: AtomFeatureSpec;
  baseRate: Record<string, number>;
}

export const SERVED_MODELS: { id: ModelId; name: string }[] = [
  { id: 'logreg', name: 'Logistic Regression' },
  { id: 'rf', name: 'Random Forest' },
  { id: 'xgboost', name: 'XGBoost' },
  { id: 'gnn', name: 'Graph Neural Network' },
];
/** The three that read Morgan fingerprints; the GCN reads the molecular graph instead. */
const FINGERPRINT_MODELS = ['logreg', 'rf', 'xgboost'] as const;
type FingerprintModel = (typeof FINGERPRINT_MODELS)[number];

const cache = new Map<string, Promise<unknown>>();
function once<T>(key: string, load: () => Promise<T>): Promise<T> {
  if (!cache.has(key)) cache.set(key, load().catch((e) => { cache.delete(key); throw e; }));
  return cache.get(key) as Promise<T>;
}
async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new AnalysisError(`Could not load ${path} (HTTP ${res.status}).`);
  return (await res.json()) as T;
}
async function getTrees(path: string): Promise<TreeEnsemble> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new AnalysisError(`Could not load ${path} (HTTP ${res.status}).`);
  return parseTrees(await res.arrayBuffer());
}

export const loadManifest = () => once('manifest', () => getJson<Manifest>('models/manifest.json'));
export const loadMetrics = () => once('metrics', () => getJson<MetricsFile>('data/metrics.json'));
export const loadKnown = () => once('known', () => getJson<KnownFile>('data/known.json'));
const loadLogReg = () => once('logreg', () => getJson<Record<string, { intercept: number; weights: number[] }>>('models/logreg.json'));
const loadForest = (kind: 'rf' | 'xgboost', ep: string) => once(`${kind}_${ep}`, () => getTrees(`models/${kind}_${ep}.bin`));
/** The GCN: one small JSON of shapes plus one float32 blob of weights (~0.3 MB together). */
const loadGcn = () => once('gcn', async (): Promise<{ spec: GcnFile; weights: GcnWeights }> => {
  const spec = await getJson<GcnFile>('models/gcn.json');
  const res = await fetch(`${BASE}models/gcn.bin`);
  if (!res.ok) throw new AnalysisError(`Could not load models/gcn.bin (HTTP ${res.status}).`);
  return { spec, weights: parseGcn(await res.arrayBuffer(), spec) };
});
const rdkitOrFail = async (): Promise<RDKitModule> => {
  const r = await loadRDKit();
  if (!r) throw new AnalysisError('The chemistry engine (RDKit.js) could not be loaded in this browser.');
  return r;
};

export class LocalModelService implements AnalysisService {
  info() {
    return { name: 'In-browser models', description: 'Logistic Regression, Random Forest and XGBoost on Morgan fingerprints, and the GCN on the molecular graph, running in your browser', baseUrl: BASE };
  }

  async health() {
    await loadManifest();
    return {
      status: 'ok', rdkitVersion: 'RDKit.js', metricsLoaded: true, threshold: null,
      loadedModels: Object.fromEntries(SERVED_MODELS.map((m) => [m.id, m.id === 'gnn' ? ['graph'] : ['morgan']])),
    };
  }

  async listModels(): Promise<ModelMetadata[]> {
    const metrics = await loadMetrics();
    const evaluation = (id: ModelId): EvaluationRow[] =>
      metrics.rows.filter((r) => r.model === id && r.split !== 'train').map((r) => ({ ...r, endpointId: r.endpoint, featureSet: r.featureSet as EvaluationRow['featureSet'] }));
    return [
      ...FINGERPRINT_MODELS.map((id) => ({
        modelId: id as ModelId, name: SERVED_MODELS.find((m) => m.id === id)!.name, family: 'aml' as const,
        version: 'seed 42 · tuned on validation ROC-AUC', available: true,
        featureSets: [{ id: 'morgan' as const, available: true }, { id: 'descriptors' as const, available: false, message: 'Not served in the browser (Morgan models only).' }, { id: 'morgan+descriptors' as const, available: false, message: 'Not served in the browser (Morgan models only).' }],
        evaluation: evaluation(id),
      })),
      // The GCN runs here too: its weights are small enough to download, and the atom features are
      // computed from RDKit's JSON so the browser reproduces the notebook exactly (gcnParity.test.ts).
      { modelId: 'gnn' as ModelId, name: 'Graph Neural Network', family: 'dl' as const,
        version: 'multi-task GCN · seed 42 · tuned on validation ROC-AUC', available: true,
        featureSets: [{ id: 'graph' as const, available: true }],
        evaluation: evaluation('gnn') },
    ];
  }

  async runAnalysis(input: AnalysisInput, config: AnalysisConfiguration, opts: RunOptions): Promise<AnalysisResult> {
    const models = config.models.filter((m): m is FingerprintModel => (FINGERPRINT_MODELS as readonly ModelId[]).includes(m));
    const wantsGcn = config.models.includes('gnn');
    if (!models.length && !wantsGcn) throw new AnalysisError('Select at least one trained model.');
    const startedAt = new Date().toISOString();
    const log: PipelineLogEntry[] = [];
    const step = (fraction: number, message: string) => {
      const entry = { at: Date.now(), message, kind: 'real' as const };
      log.push(entry);
      opts.onProgress?.({ fraction, message, entry });
    };

    const [rdkit, manifest] = await Promise.all([rdkitOrFail(), loadManifest()]);
    let features;
    try {
      features = featurize(rdkit, input.smiles);
    } catch (e) {
      throw new AnalysisError(e instanceof InvalidSmilesError ? e.message : `Could not process the structure: ${(e as Error).message}`);
    }
    step(0.2, `Structure cleaned with RDKit.js: ${features.canonicalSmiles}`);
    if (models.length) {
      step(0.3, `Morgan fingerprint computed (radius 2, 2048 bits): ${features.bits.reduce((a, b) => a + b, 0)} bits set.`);
    }

    const predictions: EndpointPrediction[] = [];
    for (const [k, model] of models.entries()) {
      if (opts.signal?.aborted) throw new AnalysisError('Analysis cancelled.');
      const lr = model === 'logreg' ? await loadLogReg() : undefined;
      for (const ep of manifest.endpoints) {
        let score: number;
        if (lr) score = logisticProbability(lr[ep], features.bits);
        else if (model === 'rf') score = forestProbability(await loadForest('rf', ep), features.bits);
        else score = boostedProbability(await loadForest('xgboost', ep), features.bits, manifest.xgboostBaseMargin[ep]);
        predictions.push({ endpointId: ep, modelId: model, featureSet: 'morgan', status: 'ok', score, baseRate: manifest.baseRate[model][ep] });
      }
      step(0.3 + (0.45 * (k + 1)) / models.length, `${SERVED_MODELS.find((m) => m.id === model)!.name}: 12 assay models evaluated.`);
    }
    if (wantsGcn) {
      if (opts.signal?.aborted) throw new AnalysisError('Analysis cancelled.');
      const { spec, weights } = await loadGcn();
      // The GCN reads the same standardised structure the fingerprint models saw.
      const graph = graphFromSmiles(rdkit, features.canonicalSmiles, spec.atomFeatures);
      step(0.8, `Molecular graph built for the GCN: ${graph.nAtoms} atoms, ${graph.neighbours.reduce((n, l) => n + l.length, 0) / 2} bonds.`);
      const scores = gcnProbabilities(weights, graph);
      spec.endpoints.forEach((ep, j) => predictions.push({
        endpointId: ep, modelId: 'gnn', featureSet: 'graph', status: 'ok', score: scores[j], baseRate: spec.baseRate[ep],
      }));
      step(0.9, 'Graph Neural Network: one network, all 12 assays at once.');
    }

    const known = (await loadKnown().catch(() => undefined))?.molecules[features.canonicalSmiles];
    if (known) step(0.95, `This molecule is in the Tox21 dataset (${known.id}, ${known.split} set).`);
    const allModels = await this.listModels();
    step(1, 'Done.');

    return {
      id: uid('res'),
      experimentId: opts.experimentId,
      compoundId: input.compoundId,
      smiles: input.smiles,
      canonicalSmiles: features.canonicalSmiles,
      inputNotes: features.notes,
      knownRecord: known ? { molId: known.id, split: known.split, labels: Object.fromEntries(manifest.endpoints.map((ep, i) => [ep, known.labels[i]])) } : null,
      mode: config.mode,
      models: [...config.models],
      // What the run as a whole read. Each prediction also carries its own feature set, because a
      // run can mix the two: fingerprints for the AML models, the graph for the GCN.
      featureSet: models.length ? 'morgan' : 'graph',
      predictions,
      provenance: {
        kind: 'model',
        serviceName: 'in-browser models',
        disclaimer: 'Predicted probabilities of activity in Tox21 in-vitro assays from models trained on Tox21 data. They are research predictions, not experimental measurements or a human-toxicity verdict.',
        modelMetadata: allModels.filter((m) => config.models.includes(m.modelId)),
      },
      log,
      startedAt,
      completedAt: new Date().toISOString(),
    };
  }
}
