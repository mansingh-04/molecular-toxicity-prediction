import * as THREE from 'three';
import { getTextures } from './textures';

const tx = getTextures();

/** Shared materials (created once, reused by every mesh). */
export const M = {
  floor: new THREE.MeshPhysicalMaterial({ map: tx.floor.map, roughnessMap: tx.floor.roughnessMap, roughness: 0.55, metalness: 0.05, clearcoat: 0.6, clearcoatRoughness: 0.25 }),
  floorTile: new THREE.MeshStandardMaterial({ color: '#323b46', roughness: 0.6 }),
  wall: new THREE.MeshStandardMaterial({ map: tx.wall, roughness: 0.75, metalness: 0.05 }),
  wallLower: new THREE.MeshStandardMaterial({ color: '#2b333d', roughness: 0.5, metalness: 0.4 }),
  ceiling: new THREE.MeshStandardMaterial({ map: tx.ceiling, roughness: 0.95 }),
  lightPanel: new THREE.MeshStandardMaterial({ color: '#f2f6fa', emissive: '#e3efff', emissiveIntensity: 2.4, toneMapped: false }),
  lightStrip: new THREE.MeshStandardMaterial({ color: '#7fe6e0', emissive: '#3fd3cc', emissiveIntensity: 3, toneMapped: false }),
  warmStrip: new THREE.MeshStandardMaterial({ color: '#ffe2b8', emissive: '#ffd59a', emissiveIntensity: 2.2, toneMapped: false }),
  glass: new THREE.MeshPhysicalMaterial({ color: '#cfeff5', roughness: 0.04, metalness: 0, transparent: true, opacity: 0.18, depthWrite: false, clearcoat: 1, envMapIntensity: 1.5 }),
  frame: new THREE.MeshStandardMaterial({ color: '#36404c', roughness: 0.35, metalness: 0.75 }),
  rib: new THREE.MeshStandardMaterial({ color: '#4a5562', roughness: 0.4, metalness: 0.7, map: tx.brushed }),
  pipe: new THREE.MeshStandardMaterial({ color: '#8d99a6', roughness: 0.3, metalness: 0.85, map: tx.brushed }),
  pipeAccent: new THREE.MeshStandardMaterial({ color: '#1f7f86', roughness: 0.4, metalness: 0.5 }),
  steel: new THREE.MeshStandardMaterial({ color: '#c3ccd5', roughness: 0.28, metalness: 0.85, map: tx.brushed }),
  darkSteel: new THREE.MeshStandardMaterial({ color: '#4a535e', roughness: 0.35, metalness: 0.75, map: tx.brushed }),
  benchTop: new THREE.MeshPhysicalMaterial({ color: '#1b222b', roughness: 0.3, metalness: 0.1, clearcoat: 0.8, clearcoatRoughness: 0.2 }),
  cabinet: new THREE.MeshStandardMaterial({ color: '#e1e6eb', roughness: 0.45, metalness: 0.1 }),
  instrument: new THREE.MeshPhysicalMaterial({ color: '#eef1f4', roughness: 0.32, metalness: 0.1, clearcoat: 0.5 }),
  instrumentDark: new THREE.MeshStandardMaterial({ color: '#161c24', roughness: 0.35, metalness: 0.45 }),
  accent: new THREE.MeshStandardMaterial({ color: '#18b8b3', emissive: '#18b8b3', emissiveIntensity: 1.6, roughness: 0.4, toneMapped: false }),
  accentSoft: new THREE.MeshStandardMaterial({ color: '#0f8f8c', emissive: '#0f8f8c', emissiveIntensity: 0.6 }),
  holo: new THREE.MeshBasicMaterial({ color: '#3fd3cc', transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }),
  yellow: new THREE.MeshStandardMaterial({ color: '#d9a91e', roughness: 0.45, metalness: 0.2 }),
  hazard: new THREE.MeshStandardMaterial({ map: tx.hazard, roughness: 0.6 }),
  red: new THREE.MeshStandardMaterial({ color: '#b8423b', roughness: 0.5, emissive: '#5a1410', emissiveIntensity: 0.3 }),
  green: new THREE.MeshStandardMaterial({ color: '#3d9a5a', roughness: 0.5 }),
  vialGlass: new THREE.MeshPhysicalMaterial({ color: '#eef8fb', roughness: 0.03, transparent: true, opacity: 0.32, depthWrite: false, clearcoat: 1 }),
  cap: new THREE.MeshStandardMaterial({ color: '#2b3440', roughness: 0.45, metalness: 0.3 }),
  screenOff: new THREE.MeshPhysicalMaterial({ color: '#05080d', roughness: 0.15, metalness: 0.3, clearcoat: 1 }),
  rubber: new THREE.MeshStandardMaterial({ color: '#15191f', roughness: 0.9 }),
  // character
  coat: new THREE.MeshStandardMaterial({ color: '#eef1f4', roughness: 0.78 }),
  coatShade: new THREE.MeshStandardMaterial({ color: '#d5dbe1', roughness: 0.8 }),
  skin: new THREE.MeshStandardMaterial({ color: '#c8936f', roughness: 0.6 }),
  hair: new THREE.MeshStandardMaterial({ color: '#1f1915', roughness: 0.85 }),
  shirt: new THREE.MeshStandardMaterial({ color: '#2f6f8a', roughness: 0.8 }),
  trousers: new THREE.MeshStandardMaterial({ color: '#28303c', roughness: 0.85 }),
  shoe: new THREE.MeshStandardMaterial({ color: '#111419', roughness: 0.4, metalness: 0.2 }),
  sole: new THREE.MeshStandardMaterial({ color: '#d9dde2', roughness: 0.8 }),
  glove: new THREE.MeshStandardMaterial({ color: '#5fb7d9', roughness: 0.5 }),
  eye: new THREE.MeshStandardMaterial({ color: '#0d1116', roughness: 0.2 }),
  eyeWhite: new THREE.MeshStandardMaterial({ color: '#f4f4f2', roughness: 0.3 }),
  lens: new THREE.MeshPhysicalMaterial({ color: '#bff3f0', roughness: 0.05, transparent: true, opacity: 0.35, clearcoat: 1 }),
  visor: new THREE.MeshStandardMaterial({ color: '#7fe6e0', roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.55 }),
};

/** Liquid colour per compound category (purely visual). */
export const liquidFor = (category?: string) => {
  const map: Record<string, string> = {
    Alcohol: '#a9d8ff', 'Carboxylic acid': '#ffe9a8', 'Aromatic hydrocarbon': '#ffd28a', Pharmaceutical: '#b8f0d0',
    Alkaloid: '#e7c8ff', Phenol: '#ffc2b0', 'Industrial chemical': '#c8d0ff', 'Halogenated solvent': '#d0fff4', Custom: '#7fe6e0',
  };
  return map[category ?? ''] ?? '#cfe3ea';
};

const liquidCache = new Map<string, THREE.MeshStandardMaterial>();
export function liquidMaterial(color: string) {
  let m = liquidCache.get(color);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, roughness: 0.2, transparent: true, opacity: 0.85, emissive: color, emissiveIntensity: 0.15 });
    liquidCache.set(color, m);
  }
  return m;
}

export const highlightMaterial = new THREE.MeshBasicMaterial({ color: '#3fd3cc', transparent: true, opacity: 0.16, depthWrite: false, toneMapped: false });
