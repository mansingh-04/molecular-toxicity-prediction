import type { MolGraph } from './graphFeaturize';

/**
 * The trained graph convolutional network from notebook 04, running in the browser.
 *
 * Weights are exported by backend/export_gcn_for_browser.py as one float32 blob (gcn.bin) plus a
 * small JSON describing the shapes (gcn.json). The network is tiny — 3 layers of 128 units and a
 * 2-layer head, about 80k parameters — so the forward pass is written out here in the same spirit
 * as treeModel.ts, rather than pulling in a tensor runtime.
 *
 * One layer, exactly as in the notebook:
 *     Z = A_hat (X W^T + b)      A_hat = D^-1/2 (A + I) D^-1/2
 *     X = relu(batchnorm(Z))     (dropout is identity at evaluation time)
 * then mean and max over the atoms are concatenated and passed through the head.
 */

export interface GcnLayerShapes {
  inDim: number;
  outDim: number;
}
export interface GcnSpec {
  endpoints: string[];
  hidden: number;
  layers: GcnLayerShapes[];
  headHidden: number;
  nFeatures: number;
  /** BatchNorm epsilon used by PyTorch when the model was trained. */
  eps: number;
}

interface Layer {
  weight: Float32Array;   // outDim x inDim, row-major (PyTorch Linear layout)
  bias: Float32Array;
  gamma: Float32Array;
  beta: Float32Array;
  mean: Float32Array;
  variance: Float32Array;
  inDim: number;
  outDim: number;
}

export interface GcnWeights {
  spec: GcnSpec;
  layers: Layer[];
  head1: { weight: Float32Array; bias: Float32Array; inDim: number; outDim: number };
  head2: { weight: Float32Array; bias: Float32Array; inDim: number; outDim: number };
}

/** Reads the float32 blob in the order the exporter documents. */
export function parseGcn(buffer: ArrayBuffer, spec: GcnSpec): GcnWeights {
  let offset = 0;
  const take = (n: number) => {
    const view = new Float32Array(buffer, offset, n);
    offset += n * 4;
    return view;
  };
  const layers = spec.layers.map(({ inDim, outDim }) => ({
    weight: take(outDim * inDim),
    bias: take(outDim),
    gamma: take(outDim),
    beta: take(outDim),
    mean: take(outDim),
    variance: take(outDim),
    inDim,
    outDim,
  }));
  const head1 = { inDim: 2 * spec.hidden, outDim: spec.headHidden, weight: take(spec.headHidden * 2 * spec.hidden), bias: take(spec.headHidden) };
  const head2 = { inDim: spec.headHidden, outDim: spec.endpoints.length, weight: take(spec.endpoints.length * spec.headHidden), bias: take(spec.endpoints.length) };
  if (offset !== buffer.byteLength) {
    throw new Error(`gcn.bin is ${buffer.byteLength} bytes but the shapes in gcn.json account for ${offset}`);
  }
  return { spec, layers, head1, head2 };
}

/** y = x W^T + b for one row. */
function linear(x: Float64Array, xOffset: number, weight: Float32Array, bias: Float32Array,
                inDim: number, outDim: number, out: Float64Array, outOffset: number): void {
  for (let j = 0; j < outDim; j++) {
    let sum = bias[j];
    const row = j * inDim;
    for (let i = 0; i < inDim; i++) sum += x[xOffset + i] * weight[row + i];
    out[outOffset + j] = sum;
  }
}

/**
 * The 12 activity probabilities for one molecule.
 * Every step mirrors GCN.forward in notebook 04, in the same order.
 */
export function gcnProbabilities(model: GcnWeights, graph: MolGraph): Float64Array {
  const { nAtoms, neighbours, invSqrtDegree } = graph;
  let activations = graph.x;
  let width = graph.nFeatures;

  for (const layer of model.layers) {
    // 1. the linear part, per atom
    const transformed = new Float64Array(nAtoms * layer.outDim);
    for (let i = 0; i < nAtoms; i++) {
      linear(activations, i * width, layer.weight, layer.bias, layer.inDim, layer.outDim, transformed, i * layer.outDim);
    }
    // 2. A_hat Z: each atom averages itself and its neighbours, normalised by both degrees
    const aggregated = new Float64Array(nAtoms * layer.outDim);
    for (let i = 0; i < nAtoms; i++) {
      const scaleSelf = invSqrtDegree[i] * invSqrtDegree[i];
      for (let c = 0; c < layer.outDim; c++) aggregated[i * layer.outDim + c] = scaleSelf * transformed[i * layer.outDim + c];
      for (const j of neighbours[i]) {
        const scale = invSqrtDegree[i] * invSqrtDegree[j];
        for (let c = 0; c < layer.outDim; c++) aggregated[i * layer.outDim + c] += scale * transformed[j * layer.outDim + c];
      }
    }
    // 3. batch normalisation in evaluation mode, then ReLU (dropout is identity here)
    for (let c = 0; c < layer.outDim; c++) {
      const scale = layer.gamma[c] / Math.sqrt(layer.variance[c] + model.spec.eps);
      const shift = layer.beta[c] - layer.mean[c] * scale;
      for (let i = 0; i < nAtoms; i++) {
        const k = i * layer.outDim + c;
        const value = aggregated[k] * scale + shift;
        aggregated[k] = value > 0 ? value : 0;
      }
    }
    activations = aggregated;
    width = layer.outDim;
  }

  // readout: mean and max over the atoms, concatenated
  const pooled = new Float64Array(2 * width);
  for (let c = 0; c < width; c++) {
    let sum = 0;
    let max = -Infinity;
    for (let i = 0; i < nAtoms; i++) {
      const value = activations[i * width + c];
      sum += value;
      if (value > max) max = value;
    }
    pooled[c] = sum / nAtoms;
    pooled[width + c] = max;
  }

  const hidden = new Float64Array(model.head1.outDim);
  linear(pooled, 0, model.head1.weight, model.head1.bias, model.head1.inDim, model.head1.outDim, hidden, 0);
  for (let i = 0; i < hidden.length; i++) if (hidden[i] < 0) hidden[i] = 0;   // ReLU

  const logits = new Float64Array(model.head2.outDim);
  linear(hidden, 0, model.head2.weight, model.head2.bias, model.head2.inDim, model.head2.outDim, logits, 0);
  const probabilities = new Float64Array(logits.length);
  for (let i = 0; i < logits.length; i++) probabilities[i] = 1 / (1 + Math.exp(-logits[i]));
  return probabilities;
}
