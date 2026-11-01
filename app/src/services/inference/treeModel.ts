/**
 * Random Forest and XGBoost trees exported by backend/export_for_browser.py.
 *
 * File format: uint32 nTrees, uint32 nNodes, int32 treeStart[nTrees], int16 feature[nNodes]
 * (padded to 4 bytes), then one 32-bit slot per node: the right-child index for an internal
 * node, or the leaf value (float32) for a leaf. The left child of node i is always i + 1.
 */
export interface TreeEnsemble {
  treeStart: Int32Array;
  feature: Int16Array;
  rightChild: Int32Array; // same bytes as leafValue, read as integers
  leafValue: Float32Array; // same bytes as rightChild, read as floats
}

export function parseTrees(buffer: ArrayBuffer): TreeEnsemble {
  const header = new Uint32Array(buffer, 0, 2);
  const nTrees = header[0];
  const nNodes = header[1];
  let offset = 8;
  const treeStart = new Int32Array(buffer, offset, nTrees);
  offset += 4 * nTrees;
  const feature = new Int16Array(buffer, offset, nNodes);
  offset += 2 * nNodes + (nNodes % 2 ? 2 : 0);
  return { treeStart, feature, rightChild: new Int32Array(buffer, offset, nNodes), leafValue: new Float32Array(buffer, offset, nNodes) };
}

/** Follow one tree from its root to a leaf: bit 0 -> left (next node), bit 1 -> right. */
function leafOf(t: TreeEnsemble, root: number, bits: Uint8Array): number {
  let i = root;
  while (t.feature[i] !== -1) i = bits[t.feature[i]] ? t.rightChild[i] : i + 1;
  return t.leafValue[i];
}

/** Random Forest: average of the trees' leaf probabilities. */
export function forestProbability(t: TreeEnsemble, bits: Uint8Array): number {
  let sum = 0;
  for (let k = 0; k < t.treeStart.length; k++) sum += leafOf(t, t.treeStart[k], bits);
  return sum / t.treeStart.length;
}

/** XGBoost: sigmoid(base margin + sum of the trees' leaf values). */
export function boostedProbability(t: TreeEnsemble, bits: Uint8Array, baseMargin: number): number {
  let margin = baseMargin;
  for (let k = 0; k < t.treeStart.length; k++) margin += leafOf(t, t.treeStart[k], bits);
  return sigmoid(margin);
}

/** Logistic Regression: sigmoid(intercept + sum of the weights of the bits that are 1). */
export function logisticProbability(model: { intercept: number; weights: number[] }, bits: Uint8Array): number {
  let z = model.intercept;
  for (let i = 0; i < bits.length; i++) if (bits[i]) z += model.weights[i];
  return sigmoid(z);
}

export const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));
