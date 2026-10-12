import * as THREE from 'three';
import { VRM } from '@pixiv/three-vrm';
import { AvatarConfig, getSkinColorFromTone } from '../avatarConfig';

export interface VrmInspectionResult {
  hairMaterials: THREE.Material[];
  skinMaterials: THREE.Material[];
  eyeMaterials: THREE.Material[];
  outfitMaterials: THREE.Material[];
  hairMeshes: THREE.Mesh[];
  outfitMeshes: THREE.Mesh[];
  allMeshNames: string[];
  allMaterialNames: string[];
}

/**
 * Inspects a loaded VRM scene and classifies meshes and materials using case-insensitive
 * keyword matching for hair, skin/face, eyes/iris, and clothes/outfit.
 */
export function inspectVrmMaterialsAndMeshes(vrm: VRM): VrmInspectionResult {
  const hairMats = new Set<THREE.Material>();
  const skinMats = new Set<THREE.Material>();
  const eyeMats = new Set<THREE.Material>();
  const outfitMats = new Set<THREE.Material>();

  const hairMeshes: THREE.Mesh[] = [];
  const outfitMeshes: THREE.Mesh[] = [];

  const allMeshNames: string[] = [];
  const allMaterialNames = new Set<string>();

  vrm.scene.traverse((child) => {
    if (child instanceof THREE.Mesh || child instanceof THREE.SkinnedMesh) {
      const meshName = (child.name || '').toLowerCase();
      allMeshNames.push(child.name || 'UnnamedMesh');

      // Check mesh categorizations
      if (/hair|bangs|braid|ponytail|twin/i.test(meshName)) {
        hairMeshes.push(child);
      } else if (/cloth|tops|bottoms|shoes|shirt|pant|skirt|jacket|coat|hood|dress|sleeve/i.test(meshName)) {
        outfitMeshes.push(child);
      }

      const mats = Array.isArray(child.material) ? child.material : [child.material];
      for (const mat of mats) {
        if (!mat) continue;
        const matName = (mat.name || '').toLowerCase();
        allMaterialNames.add(mat.name || 'UnnamedMaterial');

        // Eye / Iris classification takes precedence over face
        if (/eye|iris|pupil/i.test(matName)) {
          eyeMats.add(mat);
        } else if (/hair|fur|brow|eyebrow/i.test(matName) || /hair/i.test(meshName)) {
          hairMats.add(mat);
        } else if (/skin|body|face|head|ear|mouth/i.test(matName) || /body|face/i.test(meshName)) {
          skinMats.add(mat);
        } else if (/cloth|tops|bottoms|shoes|shirt|pant|skirt|jacket|coat|hood|dress|sleeve|suit/i.test(matName) || outfitMeshes.includes(child)) {
          outfitMats.add(mat);
        }
      }
    }
  });

  return {
    hairMaterials: Array.from(hairMats),
    skinMaterials: Array.from(skinMats),
    eyeMaterials: Array.from(eyeMats),
    outfitMaterials: Array.from(outfitMats),
    hairMeshes,
    outfitMeshes,
    allMeshNames,
    allMaterialNames: Array.from(allMaterialNames),
  };
}

/**
 * Developer console debug helper to print all meshes, materials, and bone bindings.
 */
export function debugListVrmElements(vrm: VRM): void {
  const inspection = inspectVrmMaterialsAndMeshes(vrm);
  console.groupCollapsed('🔍 [VRM Material & Mesh Inspection]');
  console.log('Meshes Found (%d):', inspection.allMeshNames.length, inspection.allMeshNames);
  console.log('Materials Found (%d):', inspection.allMaterialNames.length, inspection.allMaterialNames);
  console.table({
    'Hair Materials': inspection.hairMaterials.map((m) => m.name),
    'Skin Materials': inspection.skinMaterials.map((m) => m.name),
    'Eye Materials': inspection.eyeMaterials.map((m) => m.name),
    'Outfit Materials': inspection.outfitMaterials.map((m) => m.name),
    'Hair Meshes': inspection.hairMeshes.map((m) => m.name),
    'Outfit Meshes': inspection.outfitMeshes.map((m) => m.name),
  });
  console.groupEnd();
}

/**
 * Applies customizer colors and active mesh toggles to the classified VRM materials.
 */
export function applyColorsToVrmMaterials(
  inspection: VrmInspectionResult,
  config: AvatarConfig
): void {
  const setColorOnMat = (mat: THREE.Material, hex: string) => {
    if ('color' in mat && (mat as unknown as { color: THREE.Color }).color instanceof THREE.Color) {
      (mat as unknown as { color: THREE.Color }).color.set(hex);
      mat.needsUpdate = true;
    }
  };

  // 1. Hair
  for (const mat of inspection.hairMaterials) {
    setColorOnMat(mat, config.hair.color);
  }

  // 2. Skin (calculated from tone)
  const computedSkin = getSkinColorFromTone(config.skin.tone);
  for (const mat of inspection.skinMaterials) {
    setColorOnMat(mat, computedSkin);
  }

  // 3. Eyes
  for (const mat of inspection.eyeMaterials) {
    setColorOnMat(mat, config.eyes.color);
  }

  // 4. Outfit
  inspection.outfitMaterials.forEach((mat, idx) => {
    // Alternating primary and secondary colors if multiple outfit materials
    const color = idx % 2 === 0 ? config.outfit.primaryColor : config.outfit.secondaryColor;
    setColorOnMat(mat, color);
  });

  // 5. Hair Mesh Variants toggle (if model has multiple hair meshes)
  if (inspection.hairMeshes.length > 1 && config.hair.variant) {
    inspection.hairMeshes.forEach((mesh) => {
      mesh.visible = mesh.name === config.hair.variant;
    });
  }

  // 6. Clothing meshes toggle
  if (config.outfit.activeMeshes && config.outfit.activeMeshes.length > 0) {
    inspection.outfitMeshes.forEach((mesh) => {
      mesh.visible = config.outfit.activeMeshes.includes(mesh.name);
    });
  }
}
