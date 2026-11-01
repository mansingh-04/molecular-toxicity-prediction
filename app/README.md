# ToxiLab

Website for the project **"Molecular Toxicity Prediction via Fingerprints and Molecular Graph Networks"** (Tox21, 12 assay endpoints).

- **Landing page:** the dataset (Member 1) and an endpoint-wise comparison of every trained model on the same scaffold split. The GNN slot (Member 4) is shown as pending until its results are added.
- **Lab simulation:** a small 3D lab where molecules are tested. Pick a sample vial from the shelf and carry it to the analyzer, or type any SMILES at the analyzer ("Use a custom molecule"). Then run Logistic Regression, Random Forest and XGBoost and read the 12-assay report.

Everything runs **in the visitor's browser**. There is no server, so the site can be hosted for free as plain files.

---

## How predictions work

```
SMILES ─▶ RDKit.js cleaning ─▶ Morgan fingerprint ─▶ LR / RF / XGBoost ─▶ 12 probabilities
          largest fragment,     radius 2, 2048 bits     exported copies of the
          canonical SMILES                              team's trained models
```

1. **Cleaning** follows Member 1's rule: keep the fragment with the most heavy atoms, then write canonical SMILES (`src/services/inference/featurize.ts`).
2. **Fingerprint:** Morgan, radius 2, 2048 bits, computed by RDKit.js. It is bit-identical to Python RDKit for all 7,708 Tox21 molecules.
3. **Models** (`src/services/inference/treeModel.ts`):
   - Logistic Regression: `sigmoid(intercept + sum of the weights of the bits that are 1)`
   - Random Forest: the average of the 300 trees' leaf probabilities
   - XGBoost: `sigmoid(base margin + sum of the trees' leaf values)`
4. The trees are stored in a compact format: 6 bytes per node, with the left child always the next node. All three models together take 13.4 MB (5.5 MB compressed), down from 150 MB of pickled Python files. They are downloaded only when someone first predicts.

**Proof that it matches the Python models:** `src/services/inference/parity.test.ts` runs every validation and test molecule from its raw SMILES through the browser code and compares with the notebooks' saved predictions. That is 55,512 predictions; the largest difference is 4×10⁻⁷, which comes from storing tree leaves as 32-bit floats.

**Molecules already in Tox21** are flagged with their split and measured labels, so a remembered training label is never mistaken for a fair prediction.

Only the **Morgan-fingerprint** models run in the browser, since that is the main setting for the AML vs GNN comparison. The descriptor and combined-feature results appear in the comparison tables.

---

## Run it on your computer

Requires Node 18+.

```bash
npm install
```
```bash
npm run dev
```

Open http://localhost:5173. `npm install` also copies the RDKit.js WebAssembly files into `public/rdkit/`.

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm test` | All frontend tests, including the browser-vs-Python parity test |
| `npm run build` | Production site in `dist/` |
| `npm run site:zip` | Build and pack `dist/` into `toxilab-site.zip` for uploading |
| `npm run typecheck` / `npm run lint` | TypeScript / ESLint |
| `npm run python:setup` | Python environment for the model tools (`.venv`) |
| `npm run python:test` | Python checks: cleaning matches Member 1, models reproduce the notebooks |
| `npm run models:verify` | Reload the saved Python models and compare with the notebooks' test predictions |
| `npm run models:export` | Re-export the models, dataset statistics and metrics for the website (after retraining) |

---

## Host it for free (Cloudflare Pages, no server)

The site is a folder of static files (`dist/`, 35 files, the largest 6.6 MB), so any static host works. Cloudflare Pages is free, does not put the site to sleep, and needs no command line:

1. Run `npm run site:zip`, or use the ready-made `toxilab-site.zip` in this folder.
2. Sign in at dash.cloudflare.com (a free account is enough).
3. Go to **Workers & Pages → Create → Pages → Upload assets**.
4. Name the project (e.g. `toxilab`) and drag in `toxilab-site.zip`, or the **contents** of `dist/`.
5. Click **Deploy**. The site is live at `https://<project-name>.pages.dev`.

To update the site: rebuild, then open the project → **Create deployment** → upload again.

Other free static hosts also work: GitHub Pages, or Vercel/Netlify with `npm run build` as the build command and `dist` as the output folder.

---

## Project structure

```
src/
  pages/HomePage.tsx            landing page (overview, approach, dataset, model comparison, lab link)
  pages/dashboard/              DatasetSection, ComparisonSection (dot chart + tables), motion helpers
  pages/LabPage.tsx             3D lab simulation (loaded only when opened)
  components/game, lab/         3D scene, player controller, shelves, analyzer, HUD, panels
  services/inference/           featurize.ts (RDKit.js), treeModel.ts (LR/RF/XGB), localModelService.ts
  store/gameStore.ts            shared state: predictions and the lab flow (vial -> analyzer -> report)
public/
  models/                       exported models (logreg.json, rf_*.bin, xgboost_*.bin, manifest.json)
  data/                         dataset.json, metrics.json, known.json (Tox21 molecules + labels)
backend/                        Python: reference model loading, verification and export
  artifacts/models, results     the notebooks' trained models and metrics
  artifacts/data                Member 1's cleaned data and preprocessing report
  export_for_browser.py         writes public/models and public/data
  verify_models.py              saved models vs notebook predictions
scripts/build-known-molecules.ts   writes public/data/known.json with RDKit.js keys
```

The trained models in `backend/artifacts/models` came from running Member 2's and Member 3's notebooks unchanged on Member 1's split. Logistic Regression reproduced Member 2's Colab results exactly. Random Forest and XGBoost differ slightly from the Colab run (mean ROC-AUC within 0.007) because tree training depends on the CPU and library build. The website uses these models and their own metrics consistently.

---

## Adding the GNN (Member 4)

- **Comparison:** add the GCN's validation/test rows to `public/data/metrics.json`, with `"model": "gnn"` and the same fields as the other rows. The dashboard then shows it in every chart and table automatically, and the "Pending" card disappears.
- **Live predictions (optional):** export the trained GCN to ONNX, run it with `onnxruntime-web`, and compute the same atom and bond features in JavaScript with RDKit.js. Then check it against Python predictions the same way `parity.test.ts` does for the AML models.

---

## Limitations

- One scaffold split and one seed, with no confidence intervals. Small differences between models may not be meaningful.
- Validation and test contain only ring-containing molecules, because all acyclic molecules share an empty scaffold and sit in training.
- NR-AR and NR-AR-LBD have only 14 and 12 test actives, so their test scores are noisy.
- Predictions are probabilities of activity in in-vitro assays, not measurements or a human-toxicity verdict.
- The 3D lab needs a keyboard and mouse and a reasonably recent GPU. The dashboard works on phones.
