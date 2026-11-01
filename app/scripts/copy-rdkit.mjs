// Copies the RDKit MinimalLib (WASM) runtime into public/ so Vite serves it as a static asset.
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'node_modules', '@rdkit', 'rdkit', 'dist');
const dest = join(root, 'public', 'rdkit');
if (!existsSync(src)) {
  console.warn('[copy-rdkit] @rdkit/rdkit not installed; skipping (demo validator will be used).');
  process.exit(0);
}
mkdirSync(dest, { recursive: true });
for (const f of ['RDKit_minimal.js', 'RDKit_minimal.wasm']) copyFileSync(join(src, f), join(dest, f));
console.log('[copy-rdkit] copied RDKit MinimalLib to public/rdkit');
