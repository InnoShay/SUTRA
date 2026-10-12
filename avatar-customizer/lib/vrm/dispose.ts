import * as THREE from 'three';
import { VRM } from '@pixiv/three-vrm';

/**
 * Cleanly disposes of a Three.js material and all attached textures.
 */
export function disposeMaterial(material: THREE.Material): void {
  const mat = material as unknown as Record<string, unknown>;
  const textureKeys = [
    'map',
    'alphaMap',
    'normalMap',
    'roughnessMap',
    'metalnessMap',
    'bumpMap',
    'displacementMap',
    'emissiveMap',
    'lightMap',
    'aoMap',
    'envMap',
  ];

  for (const key of textureKeys) {
    const val = mat[key];
    if (val && typeof val === 'object' && 'dispose' in val && typeof (val as { dispose: () => void }).dispose === 'function') {
      (val as { dispose: () => void }).dispose();
    }
  }

  material.dispose();
}

/**
 * Traverses an Object3D or Scene hierarchy and recursively disposes geometries,
 * materials, and textures to prevent WebGL memory leaks.
 */
export function disposeHierarchy(root: THREE.Object3D): void {
  root.traverse((child) => {
    if (child instanceof THREE.Mesh || child instanceof THREE.SkinnedMesh) {
      if (child.geometry) {
        child.geometry.dispose();
      }

      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((mat) => mat && disposeMaterial(mat));
        } else {
          disposeMaterial(child.material);
        }
      }
    }
  });

  // Clear children
  while (root.children.length > 0) {
    const child = root.children[0];
    root.remove(child);
  }
}

/**
 * Complete disposal for a loaded VRM instance and its scene.
 */
export function disposeVrm(vrm: VRM | null): void {
  if (!vrm) return;

  try {
    if (vrm.scene) {
      disposeHierarchy(vrm.scene);
    }
    // Call VRM internal dispose if provided
    if (typeof (vrm as unknown as { dispose?: () => void }).dispose === 'function') {
      (vrm as unknown as { dispose: () => void }).dispose();
    }
  } catch (err) {
    console.warn('Error during VRM disposal:', err);
  }
}
