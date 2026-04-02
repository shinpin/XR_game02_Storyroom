import * as THREE from 'three';

// Common Materials for Quick Construction
export const matWater = new THREE.MeshStandardMaterial({ color: 0x0a1a2a, roughness: 0.05, metalness: 0.9, transparent: true, opacity: 0.9 });
export const matStone = new THREE.MeshStandardMaterial({ color: 0x333338, roughness: 0.9, metalness: 0.1 });
export const matGrass = new THREE.MeshStandardMaterial({ color: 0x113311, roughness: 0.9 });
export const matWood = new THREE.MeshStandardMaterial({ color: 0x3d2314, roughness: 0.9 });
export const matLight = new THREE.MeshBasicMaterial({ color: 0xeeffff });

export const globalMaterials = [matWater, matStone, matGrass, matWood, matLight];
