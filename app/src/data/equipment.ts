/** Inspectable equipment descriptions. Educational context, kept factual and general. */
export interface EquipmentInfo {
  id: string;
  name: string;
  zone: string;
  description: string;
  role: string;
}

export const EQUIPMENT: Record<string, EquipmentInfo> = {
  'fume-hood': {
    id: 'fume-hood', name: 'Fume Hood', zone: 'Main Laboratory',
    description: 'A ventilated enclosure that draws vapours away from the user. Volatile or hazardous chemicals are handled inside it.',
    role: 'In ToxiLab this is a set piece: no wet chemistry is simulated.',
  },
  centrifuge: {
    id: 'centrifuge', name: 'Benchtop Centrifuge', zone: 'Main Laboratory',
    description: 'Spins samples at high speed to separate components by density.',
    role: 'Set piece. ToxiLab predictions are computational and do not depend on physical sample handling.',
  },
  microscope: {
    id: 'microscope', name: 'Microscope', zone: 'Main Laboratory',
    description: 'Used to inspect cells, e.g. in cell-based assays such as those run in the Tox21 programme.',
    role: 'Set piece. The Tox21 endpoints come from high-throughput cell-based screening assays.',
  },
  'safety-station': {
    id: 'safety-station', name: 'Eyewash & Safety Shower', zone: 'Main Laboratory',
    description: 'Emergency equipment for flushing chemicals from eyes or skin.',
    role: 'Set piece. Know where it is in any real lab.',
  },
  'notice-board': {
    id: 'notice-board', name: 'Lab Notice Board', zone: 'Entrance',
    description: 'ToxiLab ground rules: every structure is validated before analysis; predictions are probabilities of in-vitro assay activity, never a human-toxicity verdict; model performance (ROC-AUC, PR-AUC) is only meaningful on labelled held-out data.',
    role: 'Read this before you start.',
  },
  'server-rack-1': {
    id: 'server-rack-1', name: 'Model Rack', zone: 'Analysis Suite',
    description: 'Stands for the trained models. In this app they actually run in your browser: RDKit.js cleans the structure and computes the Morgan fingerprint, then Logistic Regression, Random Forest and XGBoost each predict the 12 assays. The GNN joins once it is trained.',
    role: 'The analyzer screen shows whether the models are ready.',
  },
  'server-rack-2': {
    id: 'server-rack-2', name: 'Feature Store Rack', zone: 'Analysis Suite',
    description: 'Stands for the Tox21 data: 7,708 cleaned molecules, split by scaffold into training, validation and test sets.',
    role: 'Set piece.',
  },
  'flammables-cabinet': {
    id: 'flammables-cabinet', name: 'Flammables Cabinet', zone: 'Chemical Storage',
    description: 'Fire-resistant storage for flammable liquids such as ethanol or toluene.',
    role: 'Set piece.',
  },
  'cold-storage': {
    id: 'cold-storage', name: 'Cold Storage', zone: 'Chemical Storage',
    description: 'Refrigerated storage for temperature-sensitive samples and reagents.',
    role: 'Set piece.',
  },
};
