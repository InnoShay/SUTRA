import * as THREE from 'three';

export interface AccessoryDefinition {
  id: string;
  name: string;
  category: 'glasses' | 'hat' | 'audio';
  attachBone: 'head' | 'chest' | 'leftHand' | 'rightHand';
  description: string;
  createMesh: (color: string) => THREE.Group;
}

export const ACCESSORY_REGISTRY: Record<string, AccessoryDefinition> = {
  smart_glasses: {
    id: 'smart_glasses',
    name: 'Smart Glasses',
    category: 'glasses',
    attachBone: 'head',
    description: 'Minimalist geometric spectacles with tinted lenses',
    createMesh: (colorHex: string) => {
      const group = new THREE.Group();
      group.name = 'accessory_smart_glasses';

      const frameMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(colorHex),
        roughness: 0.2,
        metalness: 0.8,
      });

      const lensMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color('#38bdf8'),
        transparent: true,
        opacity: 0.45,
        roughness: 0.1,
        metalness: 0.9,
      });

      // Left lens frame
      const rimGeo = new THREE.TorusGeometry(0.045, 0.005, 12, 24);
      const leftRim = new THREE.Mesh(rimGeo, frameMat);
      leftRim.position.set(-0.065, 0.04, 0.13);
      group.add(leftRim);

      // Left lens glass
      const lensGeo = new THREE.CylinderGeometry(0.043, 0.043, 0.003, 24);
      const leftLens = new THREE.Mesh(lensGeo, lensMat);
      leftLens.rotation.x = Math.PI / 2;
      leftLens.position.set(-0.065, 0.04, 0.13);
      group.add(leftLens);

      // Right lens frame
      const rightRim = new THREE.Mesh(rimGeo, frameMat);
      rightRim.position.set(0.065, 0.04, 0.13);
      group.add(rightRim);

      // Right lens glass
      const rightLens = new THREE.Mesh(lensGeo, lensMat);
      rightLens.rotation.x = Math.PI / 2;
      rightLens.position.set(0.065, 0.04, 0.13);
      group.add(rightLens);

      // Bridge
      const bridgeGeo = new THREE.CylinderGeometry(0.004, 0.004, 0.04, 8);
      const bridge = new THREE.Mesh(bridgeGeo, frameMat);
      bridge.rotation.z = Math.PI / 2;
      bridge.position.set(0, 0.045, 0.13);
      group.add(bridge);

      // Left temple arm
      const armGeo = new THREE.BoxGeometry(0.004, 0.005, 0.16);
      const leftArm = new THREE.Mesh(armGeo, frameMat);
      leftArm.position.set(-0.11, 0.04, 0.05);
      group.add(leftArm);

      // Right temple arm
      const rightArm = new THREE.Mesh(armGeo, frameMat);
      rightArm.position.set(0.11, 0.04, 0.05);
      group.add(rightArm);

      return group;
    },
  },

  cap: {
    id: 'cap',
    name: 'Streetwear Cap',
    category: 'hat',
    attachBone: 'head',
    description: 'Classic curved-brim baseball cap',
    createMesh: (colorHex: string) => {
      const group = new THREE.Group();
      group.name = 'accessory_cap';

      const capMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(colorHex),
        roughness: 0.8,
        metalness: 0.1,
      });

      const accentMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(colorHex).offsetHSL(0, -0.2, -0.15),
        roughness: 0.9,
      });

      // Cap dome (upper hemisphere)
      const domeGeo = new THREE.SphereGeometry(0.125, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2);
      const dome = new THREE.Mesh(domeGeo, capMat);
      dome.position.set(0, 0.08, 0.0);
      group.add(dome);

      // Top button
      const buttonGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.008, 12);
      const button = new THREE.Mesh(buttonGeo, accentMat);
      button.position.set(0, 0.205, 0.0);
      group.add(button);

      // Visor / Brim
      const brimShape = new THREE.Shape();
      brimShape.absarc(0, 0, 0.13, -Math.PI * 0.35, Math.PI * 0.35, false);
      const brimGeo = new THREE.CylinderGeometry(0.135, 0.135, 0.008, 24, 1, false, -Math.PI * 0.35, Math.PI * 0.7);
      const brim = new THREE.Mesh(brimGeo, capMat);
      brim.position.set(0, 0.075, 0.08);
      brim.rotation.x = 0.15;
      group.add(brim);

      return group;
    },
  },

  headphones: {
    id: 'headphones',
    name: 'Studio Headphones',
    category: 'audio',
    attachBone: 'head',
    description: 'Over-ear pro monitoring headphones with padded headband',
    createMesh: (colorHex: string) => {
      const group = new THREE.Group();
      group.name = 'accessory_headphones';

      const bodyMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(colorHex),
        roughness: 0.3,
        metalness: 0.6,
      });

      const padMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color('#1e1e24'),
        roughness: 0.9,
        metalness: 0.0,
      });

      // Headband arc
      const arcGeo = new THREE.TorusGeometry(0.14, 0.012, 12, 28, Math.PI);
      const arc = new THREE.Mesh(arcGeo, bodyMat);
      arc.rotation.z = -Math.PI;
      arc.position.set(0, 0.09, 0.0);
      group.add(arc);

      // Headband comfort cushion
      const cushionGeo = new THREE.TorusGeometry(0.136, 0.01, 12, 24, Math.PI * 0.5);
      const cushion = new THREE.Mesh(cushionGeo, padMat);
      cushion.rotation.z = -Math.PI * 0.75;
      cushion.position.set(0, 0.09, 0.0);
      group.add(cushion);

      // Left ear cup
      const cupGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.025, 24);
      const leftCup = new THREE.Mesh(cupGeo, bodyMat);
      leftCup.rotation.z = Math.PI / 2;
      leftCup.position.set(-0.14, 0.06, 0.0);
      group.add(leftCup);

      // Left ear pad
      const earPadGeo = new THREE.TorusGeometry(0.038, 0.012, 12, 24);
      const leftPad = new THREE.Mesh(earPadGeo, padMat);
      leftPad.rotation.y = Math.PI / 2;
      leftPad.position.set(-0.125, 0.06, 0.0);
      group.add(leftPad);

      // Right ear cup
      const rightCup = new THREE.Mesh(cupGeo, bodyMat);
      rightCup.rotation.z = Math.PI / 2;
      rightCup.position.set(0.14, 0.06, 0.0);
      group.add(rightCup);

      // Right ear pad
      const rightPad = new THREE.Mesh(earPadGeo, padMat);
      rightPad.rotation.y = Math.PI / 2;
      rightPad.position.set(0.125, 0.06, 0.0);
      group.add(rightPad);

      return group;
    },
  },
};

export const ACCESSORIES_LIST: AccessoryDefinition[] = Object.values(ACCESSORY_REGISTRY);

export function getAccessoryDefinition(id: string): AccessoryDefinition | undefined {
  return ACCESSORY_REGISTRY[id];
}
