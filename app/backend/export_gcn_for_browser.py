"""Convert the trained GCN (notebook 04) into two small files the website runs in the browser.

Run from the app folder:
    .venv/bin/python backend/export_gcn_for_browser.py

Reads  artifacts/models/gnn/graph/gcn.pt   (the notebook's checkpoint)
Writes public/models/gcn.json              shapes, the atom-feature vocabulary and the endpoint order
       public/models/gcn.bin               every weight as float32, little-endian, in this order:

    for each graph-convolution layer:
        conv.weight   (outDim x inDim, row-major, PyTorch Linear layout: y = x W^T + b)
        conv.bias     (outDim)
        bn.weight     (outDim)   gamma
        bn.bias       (outDim)   beta
        bn.running_mean (outDim)
        bn.running_var  (outDim)
    head linear 1: weight (headHidden x 2*hidden), bias (headHidden)
    head linear 2: weight (nEndpoints x headHidden), bias (nEndpoints)

src/services/inference/gcnModel.ts reads exactly this order, and gcnParity.test.ts checks that the
browser reproduces the notebook's probabilities for every validation and test molecule.
"""

import json
import struct
from pathlib import Path

import torch
from rdkit import Chem

ROOT = Path(__file__).resolve().parents[1]
CHECKPOINT = ROOT / "backend" / "artifacts" / "models" / "gnn" / "graph" / "gcn.pt"
MANIFEST = ROOT / "backend" / "artifacts" / "results" / "gnn" / "manifest.json"
OUT = ROOT / "public" / "models"

BN_EPS = 1e-5          # PyTorch BatchNorm1d default, and what notebook 04 trained with


def main() -> None:
    if not CHECKPOINT.is_file():
        raise SystemExit(f"{CHECKPOINT.relative_to(ROOT)} not found. Copy the notebook's gcn.pt there first.")
    payload = torch.load(CHECKPOINT, map_location="cpu", weights_only=False)
    state = payload["state_dict"]
    params = payload["params"]
    manifest = json.loads(MANIFEST.read_text())
    options = manifest["graph"]["atom_feature_options"]

    n_layers = params["layers"]
    tensors, layers = [], []
    for i in range(n_layers):
        weight = state[f"convs.{i}.weight"]
        layers.append({"inDim": int(weight.shape[1]), "outDim": int(weight.shape[0])})
        tensors += [weight, state[f"convs.{i}.bias"], state[f"norms.{i}.weight"], state[f"norms.{i}.bias"],
                    state[f"norms.{i}.running_mean"], state[f"norms.{i}.running_var"]]
    tensors += [state["head.0.weight"], state["head.0.bias"], state["head.3.weight"], state["head.3.bias"]]

    blob = bytearray()
    for tensor in tensors:
        values = tensor.detach().to(torch.float32).flatten().tolist()
        blob += struct.pack(f"<{len(values)}f", *values)

    periodic = Chem.GetPeriodicTable()
    spec = {
        "endpoints": payload["tasks"],
        "nFeatures": int(layers[0]["inDim"]),
        "hidden": int(params["hidden"]),
        "headHidden": int(state["head.0.weight"].shape[0]),
        "layers": layers,
        "eps": BN_EPS,
        "atomFeatures": {
            "elementsZ": [periodic.GetAtomicNumber(s) for s in options["elements"]],
            "elements": options["elements"],
            "degrees": options["degrees"],
            "charges": options["charges"],
            "numHs": options["num_hs"],
            "piBonds": options["pi_bonds"],
            "valences": options["valences"],
            "nFeatures": int(layers[0]["inDim"]),
        },
        # Share of actives among each endpoint's observed TRAINING labels, so the site can show a
        # predicted probability against the rate the model saw while training.
        "baseRate": {ep: round(manifest["n_train_positive"][ep] / manifest["n_train_observed"][ep], 6)
                     for ep in payload["tasks"]},
        "note": "Atom features follow notebook 04. Hybridisation is deliberately not used: RDKit's "
                "JSON export, which the browser reads, does not carry it.",
        "nParameters": int(sum(t.numel() for t in state.values() if t.dtype.is_floating_point)),
    }

    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "gcn.json").write_text(json.dumps(spec, separators=(",", ":")))
    (OUT / "gcn.bin").write_bytes(bytes(blob))
    print(f"Wrote public/models/gcn.json and gcn.bin ({len(blob) / 1e3:.0f} kB, "
          f"{len(blob) // 4:,} float32 values, {len(layers)} graph layers of {params['hidden']} units)")


if __name__ == "__main__":
    main()
