import type { Compound } from '@/types/compound';

/**
 * Starter catalogue of well-known example compounds.
 * These are well-known reference/teaching examples (several are classic ligands for Tox21
 * nuclear-receptor assays), NOT the processed Tox21 dataset and carry no assay labels.
 * Formula, molecular weight and canonical SMILES are intentionally omitted here:
 * they are computed at runtime by the chemistry validation service.
 * Source identifiers are PubChem CIDs.
 */
type Seed = Pick<Compound, 'id' | 'name' | 'smiles' | 'category' | 'tags' | 'sourceId'>;

const seeds: Seed[] = [
  { id: 'cmp-ethanol', name: 'Ethanol', smiles: 'CCO', category: 'Alcohol', tags: ['solvent', 'aliphatic'], sourceId: 'CID 702' },
  { id: 'cmp-acetic-acid', name: 'Acetic acid', smiles: 'CC(=O)O', category: 'Carboxylic acid', tags: ['acid', 'aliphatic'], sourceId: 'CID 176' },
  { id: 'cmp-benzene', name: 'Benzene', smiles: 'c1ccccc1', category: 'Aromatic hydrocarbon', tags: ['aromatic', 'solvent'], sourceId: 'CID 241' },
  { id: 'cmp-aspirin', name: 'Aspirin', smiles: 'CC(=O)Oc1ccccc1C(=O)O', category: 'Pharmaceutical', tags: ['aromatic', 'ester', 'acid', 'drug'], sourceId: 'CID 2244' },
  { id: 'cmp-caffeine', name: 'Caffeine', smiles: 'Cn1c(=O)c2c(ncn2C)n(C)c1=O', category: 'Alkaloid', tags: ['heteroaromatic', 'drug'], sourceId: 'CID 2519' },
  { id: 'cmp-phenol', name: 'Phenol', smiles: 'Oc1ccccc1', category: 'Phenol', tags: ['aromatic', 'industrial'], sourceId: 'CID 996' },
  { id: 'cmp-toluene', name: 'Toluene', smiles: 'Cc1ccccc1', category: 'Aromatic hydrocarbon', tags: ['aromatic', 'solvent'], sourceId: 'CID 1140' },
  { id: 'cmp-paracetamol', name: 'Paracetamol', smiles: 'CC(=O)Nc1ccc(O)cc1', category: 'Pharmaceutical', tags: ['aromatic', 'amide', 'drug'], sourceId: 'CID 1983' },
  { id: 'cmp-ibuprofen', name: 'Ibuprofen', smiles: 'CC(C)Cc1ccc(cc1)C(C)C(=O)O', category: 'Pharmaceutical', tags: ['aromatic', 'acid', 'drug'], sourceId: 'CID 3672' },
  { id: 'cmp-bisphenol-a', name: 'Bisphenol A', smiles: 'CC(C)(c1ccc(O)cc1)c1ccc(O)cc1', category: 'Industrial chemical', tags: ['aromatic', 'phenol', 'industrial'], sourceId: 'CID 6623' },
  { id: 'cmp-nicotine', name: 'Nicotine', smiles: 'CN1CCC[C@H]1c1cccnc1', category: 'Alkaloid', tags: ['heteroaromatic', 'stereocentre'], sourceId: 'CID 89594' },
  { id: 'cmp-chloroform', name: 'Chloroform', smiles: 'ClC(Cl)Cl', category: 'Halogenated solvent', tags: ['solvent', 'halogenated'], sourceId: 'CID 6212' },
  // Solvents & simple reagents
  { id: 'cmp-methanol', name: 'Methanol', smiles: 'CO', category: 'Alcohol', tags: ['solvent', 'aliphatic'], sourceId: 'CID 887' },
  { id: 'cmp-acetone', name: 'Acetone', smiles: 'CC(C)=O', category: 'Ketone', tags: ['solvent'], sourceId: 'CID 180' },
  { id: 'cmp-dmso', name: 'Dimethyl sulfoxide', smiles: 'CS(C)=O', category: 'Solvent', tags: ['solvent', 'sulfur'], sourceId: 'CID 679' },
  { id: 'cmp-formaldehyde', name: 'Formaldehyde', smiles: 'C=O', category: 'Aldehyde', tags: ['reactive', 'industrial'], sourceId: 'CID 712' },
  { id: 'cmp-urea', name: 'Urea', smiles: 'NC(N)=O', category: 'Amide', tags: ['metabolite'], sourceId: 'CID 1176' },
  { id: 'cmp-glucose', name: 'D-Glucose', smiles: 'OC[C@H]1OC(O)[C@H](O)[C@@H](O)[C@@H]1O', category: 'Carbohydrate', tags: ['metabolite', 'stereocentre'], sourceId: 'CID 5793' },
  { id: 'cmp-nacl', name: 'Sodium chloride', smiles: '[Na+].[Cl-]', category: 'Inorganic salt', tags: ['salt', 'multi-fragment'], sourceId: 'CID 5234' },
  // Aromatics & industrial chemicals
  { id: 'cmp-styrene', name: 'Styrene', smiles: 'C=Cc1ccccc1', category: 'Aromatic hydrocarbon', tags: ['aromatic', 'monomer'], sourceId: 'CID 7501' },
  { id: 'cmp-naphthalene', name: 'Naphthalene', smiles: 'c1ccc2ccccc2c1', category: 'Polycyclic aromatic hydrocarbon', tags: ['aromatic', 'PAH'], sourceId: 'CID 931' },
  { id: 'cmp-benzo-a-pyrene', name: 'Benzo[a]pyrene', smiles: 'C1=CC=C2C3=C4C(=CC2=C1)C=CC5=C4C(=CC=C5)C=C3', category: 'Polycyclic aromatic hydrocarbon', tags: ['aromatic', 'PAH', 'AhR'], sourceId: 'CID 2336' },
  { id: 'cmp-aniline', name: 'Aniline', smiles: 'Nc1ccccc1', category: 'Aromatic amine', tags: ['aromatic', 'industrial'], sourceId: 'CID 6115' },
  { id: 'cmp-nitrobenzene', name: 'Nitrobenzene', smiles: 'O=[N+]([O-])c1ccccc1', category: 'Nitroaromatic', tags: ['aromatic', 'nitro'], sourceId: 'CID 7416' },
  { id: 'cmp-hydroquinone', name: 'Hydroquinone', smiles: 'Oc1ccc(O)cc1', category: 'Phenol', tags: ['aromatic', 'phenol'], sourceId: 'CID 785' },
  { id: 'cmp-nonylphenol', name: '4-Nonylphenol', smiles: 'CCCCCCCCCc1ccc(O)cc1', category: 'Industrial chemical', tags: ['phenol', 'surfactant'], sourceId: 'CID 1752' },
  { id: 'cmp-dbp', name: 'Dibutyl phthalate', smiles: 'CCCCOC(=O)c1ccccc1C(=O)OCCCC', category: 'Plasticiser', tags: ['phthalate', 'ester'], sourceId: 'CID 3026' },
  { id: 'cmp-pfoa', name: 'Perfluorooctanoic acid', smiles: 'OC(=O)C(F)(F)C(F)(F)C(F)(F)C(F)(F)C(F)(F)C(F)(F)C(F)(F)F', category: 'PFAS', tags: ['fluorinated', 'acid'], sourceId: 'CID 9554' },
  { id: 'cmp-methylparaben', name: 'Methylparaben', smiles: 'COC(=O)c1ccc(O)cc1', category: 'Preservative', tags: ['paraben', 'ester'], sourceId: 'CID 7456' },
  { id: 'cmp-triclosan', name: 'Triclosan', smiles: 'Oc1cc(Cl)ccc1Oc1ccc(Cl)cc1Cl', category: 'Antimicrobial', tags: ['halogenated', 'phenol'], sourceId: 'CID 5564' },
  // Pesticides
  { id: 'cmp-ddt', name: 'DDT', smiles: 'ClC(Cl)(Cl)C(c1ccc(Cl)cc1)c1ccc(Cl)cc1', category: 'Pesticide', tags: ['organochlorine'], sourceId: 'CID 3036' },
  { id: 'cmp-lindane', name: 'Lindane', smiles: 'ClC1C(Cl)C(Cl)C(Cl)C(Cl)C1Cl', category: 'Pesticide', tags: ['organochlorine'], sourceId: 'CID 727' },
  { id: 'cmp-atrazine', name: 'Atrazine', smiles: 'CCNc1nc(Cl)nc(NC(C)C)n1', category: 'Pesticide', tags: ['triazine', 'herbicide'], sourceId: 'CID 2256' },
  { id: 'cmp-chlorpyrifos', name: 'Chlorpyrifos', smiles: 'CCOP(=S)(OCC)Oc1nc(Cl)c(Cl)cc1Cl', category: 'Pesticide', tags: ['organophosphate'], sourceId: 'CID 2730' },
  { id: 'cmp-glyphosate', name: 'Glyphosate', smiles: 'OC(=O)CNCP(=O)(O)O', category: 'Pesticide', tags: ['herbicide', 'phosphonate'], sourceId: 'CID 3496' },
  // Hormones & receptor reference ligands
  { id: 'cmp-estradiol', name: 'Estradiol', smiles: 'C[C@]12CC[C@H]3[C@@H](CCc4cc(O)ccc34)[C@@H]1CC[C@@H]2O', category: 'Steroid hormone', tags: ['estrogen', 'NR-ER'], sourceId: 'CID 5757' },
  { id: 'cmp-ethinylestradiol', name: 'Ethinylestradiol', smiles: 'C#C[C@]1(O)CC[C@H]2[C@@H]3CCc4cc(O)ccc4[C@H]3CC[C@@]21C', category: 'Steroid hormone', tags: ['estrogen', 'NR-ER'], sourceId: 'CID 5991' },
  { id: 'cmp-testosterone', name: 'Testosterone', smiles: 'C[C@]12CC[C@H]3[C@@H](CCC4=CC(=O)CC[C@]34C)[C@@H]1CC[C@@H]2O', category: 'Steroid hormone', tags: ['androgen', 'NR-AR'], sourceId: 'CID 6013' },
  { id: 'cmp-progesterone', name: 'Progesterone', smiles: 'CC(=O)[C@H]1CC[C@H]2[C@@H]3CCC4=CC(=O)CC[C@]4(C)[C@H]3CC[C@]12C', category: 'Steroid hormone', tags: ['progestogen'], sourceId: 'CID 5994' },
  { id: 'cmp-des', name: 'Diethylstilbestrol', smiles: 'CC/C(=C(/CC)c1ccc(O)cc1)c1ccc(O)cc1', category: 'Synthetic estrogen', tags: ['estrogen', 'NR-ER'], sourceId: 'CID 448537' },
  { id: 'cmp-tamoxifen', name: 'Tamoxifen', smiles: 'CC/C(=C(\\c1ccccc1)c1ccc(OCCN(C)C)cc1)c1ccccc1', category: 'Pharmaceutical', tags: ['SERM', 'NR-ER'], sourceId: 'CID 2733526' },
  { id: 'cmp-flutamide', name: 'Flutamide', smiles: 'CC(C)C(=O)Nc1ccc([N+](=O)[O-])c(C(F)(F)F)c1', category: 'Pharmaceutical', tags: ['antiandrogen', 'NR-AR'], sourceId: 'CID 3397' },
  { id: 'cmp-letrozole', name: 'Letrozole', smiles: 'N#Cc1ccc(C(c2ccc(C#N)cc2)n2cncn2)cc1', category: 'Pharmaceutical', tags: ['aromatase inhibitor', 'NR-Aromatase'], sourceId: 'CID 3902' },
  { id: 'cmp-rosiglitazone', name: 'Rosiglitazone', smiles: 'CN(CCOc1ccc(CC2SC(=O)NC2=O)cc1)c1ccccn1', category: 'Pharmaceutical', tags: ['PPAR-gamma agonist'], sourceId: 'CID 77999' },
  // Drugs
  { id: 'cmp-salicylic-acid', name: 'Salicylic acid', smiles: 'OC(=O)c1ccccc1O', category: 'Carboxylic acid', tags: ['aromatic', 'acid'], sourceId: 'CID 338' },
  { id: 'cmp-diclofenac', name: 'Diclofenac', smiles: 'OC(=O)Cc1ccccc1Nc1c(Cl)cccc1Cl', category: 'Pharmaceutical', tags: ['NSAID'], sourceId: 'CID 3033' },
  { id: 'cmp-warfarin', name: 'Warfarin', smiles: 'CC(=O)CC(c1ccccc1)c1c(O)c2ccccc2oc1=O', category: 'Pharmaceutical', tags: ['anticoagulant'], sourceId: 'CID 54678486' },
  // Natural products
  { id: 'cmp-genistein', name: 'Genistein', smiles: 'O=c1c(-c2ccc(O)cc2)coc2cc(O)cc(O)c12', category: 'Flavonoid', tags: ['phytoestrogen', 'NR-ER'], sourceId: 'CID 5280961' },
  { id: 'cmp-quercetin', name: 'Quercetin', smiles: 'O=c1c(O)c(-c2ccc(O)c(O)c2)oc2cc(O)cc(O)c12', category: 'Flavonoid', tags: ['polyphenol'], sourceId: 'CID 5280343' },
  { id: 'cmp-resveratrol', name: 'Resveratrol', smiles: 'Oc1ccc(/C=C/c2cc(O)cc(O)c2)cc1', category: 'Stilbenoid', tags: ['polyphenol'], sourceId: 'CID 445154' },
  { id: 'cmp-capsaicin', name: 'Capsaicin', smiles: 'COc1cc(CNC(=O)CCCC/C=C/C(C)C)ccc1O', category: 'Natural product', tags: ['amide', 'phenol'], sourceId: 'CID 1548943' },
  { id: 'cmp-vanillin', name: 'Vanillin', smiles: 'COc1cc(C=O)ccc1O', category: 'Natural product', tags: ['aldehyde', 'phenol'], sourceId: 'CID 1183' },
];

export const STARTER_COMPOUNDS: Compound[] = seeds.map((s) => ({
  ...s,
  source: 'ToxiLab starter set (PubChem reference)',
  origin: 'builtin',
  validation: 'pending',
}));
