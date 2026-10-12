import * as THREE from 'three';
import { VRM, VRMHumanBoneName } from '@pixiv/three-vrm';
import { AvatarConfig, AvatarExpression, getSkinColorFromTone } from '../avatarConfig';

export interface PlaceholderHumanoid {
  isPlaceholder: true;
  scene: THREE.Group;
  humanoid: {
    getNormalizedBoneNode: (name: VRMHumanBoneName | string) => THREE.Object3D | null;
    getBoneNode: (name: VRMHumanBoneName | string) => THREE.Object3D | null;
  };
  expressionManager: {
    setValue: (name: string, value: number) => void;
    getValue: (name: string) => number;
    getExpression: (name: string) => unknown;
    update: () => void;
  };
  updateColors: (config: AvatarConfig) => void;
  setExpression: (expr: AvatarExpression) => void;
  update: (delta: number) => void;
  dispose: () => void;
}

/**
 * Procedural humanoid placeholder generated entirely from Three.js primitives.
 * Completely isolated in this file, adhering to the standard VRM humanoid bone
 * interface and expression manager so that all customizer controls, poses, and idle
 * animations work seamlessly even without base.vrm.
 */
export function createProceduralHumanoid(initialConfig: AvatarConfig): PlaceholderHumanoid {
  const root = new THREE.Group();
  root.name = 'procedural_humanoid_root';

  // 1. Materials
  const skinMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(getSkinColorFromTone(initialConfig.skin.tone)),
    roughness: 0.55,
    metalness: 0.05,
  });

  const hairMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(initialConfig.hair.color),
    roughness: 0.45,
    metalness: 0.1,
  });

  const eyeMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(initialConfig.eyes.color),
    roughness: 0.2,
    metalness: 0.2,
  });

  const eyeWhiteMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#f8fafc'),
    roughness: 0.3,
  });

  const outfitPrimaryMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(initialConfig.outfit.primaryColor),
    roughness: 0.7,
    metalness: 0.05,
  });

  const outfitSecondaryMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(initialConfig.outfit.secondaryColor),
    roughness: 0.65,
    metalness: 0.1,
  });

  const shoeMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#1e293b'),
    roughness: 0.8,
  });

  const mouthMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color('#3f1d24'),
  });

  const eyebrowMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(initialConfig.hair.color),
  });

  // Bone Nodes Dictionary
  const bones: Record<string, THREE.Object3D> = {};

  // 2. Bone Hierarchy Construction
  // Hips
  const hips = new THREE.Group();
  hips.name = 'hips';
  hips.position.set(0, 0.82, 0);
  root.add(hips);
  bones['hips'] = hips;

  // Hips Geometry (Pants waist)
  const waistGeo = new THREE.CylinderGeometry(0.14, 0.13, 0.14, 16);
  const waistMesh = new THREE.Mesh(waistGeo, outfitSecondaryMat);
  waistMesh.position.set(0, 0, 0);
  hips.add(waistMesh);

  // Spine
  const spine = new THREE.Group();
  spine.name = 'spine';
  spine.position.set(0, 0.09, 0);
  hips.add(spine);
  bones['spine'] = spine;

  // Spine lower torso
  const lowerTorsoGeo = new THREE.CylinderGeometry(0.145, 0.14, 0.12, 16);
  const lowerTorso = new THREE.Mesh(lowerTorsoGeo, outfitPrimaryMat);
  lowerTorso.position.set(0, 0.06, 0);
  spine.add(lowerTorso);

  // Chest
  const chest = new THREE.Group();
  chest.name = 'chest';
  chest.position.set(0, 0.12, 0);
  spine.add(chest);
  bones['chest'] = chest;

  // Upper Torso
  const upperTorsoGeo = new THREE.CylinderGeometry(0.16, 0.145, 0.22, 16);
  const upperTorso = new THREE.Mesh(upperTorsoGeo, outfitPrimaryMat);
  upperTorso.position.set(0, 0.11, 0);
  chest.add(upperTorso);

  // Neck
  const neck = new THREE.Group();
  neck.name = 'neck';
  neck.position.set(0, 0.23, 0);
  chest.add(neck);
  bones['neck'] = neck;

  const neckGeo = new THREE.CylinderGeometry(0.06, 0.065, 0.09, 14);
  const neckMesh = new THREE.Mesh(neckGeo, skinMat);
  neckMesh.position.set(0, 0.04, 0);
  neck.add(neckMesh);

  // Head
  const head = new THREE.Group();
  head.name = 'head';
  head.position.set(0, 0.09, 0);
  neck.add(head);
  bones['head'] = head;

  // Head Base Sphere
  const headGeo = new THREE.SphereGeometry(0.14, 24, 20);
  const headMesh = new THREE.Mesh(headGeo, skinMat);
  headMesh.position.set(0, 0.12, 0);
  head.add(headMesh);

  // Hair Cap & Strands
  const hairDomeGeo = new THREE.SphereGeometry(0.148, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.65);
  const hairDome = new THREE.Mesh(hairDomeGeo, hairMat);
  hairDome.position.set(0, 0.125, -0.01);
  head.add(hairDome);

  // Stylized Hair Bangs (anime-style front tufts)
  const bangsGroup = new THREE.Group();
  for (let i = -2; i <= 2; i++) {
    const tuftGeo = new THREE.ConeGeometry(0.035, 0.12, 8);
    const tuft = new THREE.Mesh(tuftGeo, hairMat);
    tuft.rotation.x = Math.PI - 0.2;
    tuft.rotation.z = i * 0.22;
    tuft.position.set(i * 0.045, 0.2, 0.12);
    bangsGroup.add(tuft);
  }
  head.add(bangsGroup);

  // Eyes (Left & Right)
  const eyeSocketsGroup = new THREE.Group();
  eyeSocketsGroup.position.set(0, 0.13, 0.128);

  const eyeWhiteGeo = new THREE.SphereGeometry(0.024, 16, 12);
  const irisGeo = new THREE.CylinderGeometry(0.013, 0.013, 0.005, 16);
  irisGeo.rotateX(Math.PI / 2);

  // Left Eye
  const leftEyeGroup = new THREE.Group();
  leftEyeGroup.position.set(-0.048, 0, 0);
  const leftWhite = new THREE.Mesh(eyeWhiteGeo, eyeWhiteMat);
  const leftIris = new THREE.Mesh(irisGeo, eyeMat);
  leftIris.position.set(0, 0, 0.018);
  leftEyeGroup.add(leftWhite, leftIris);

  // Right Eye
  const rightEyeGroup = new THREE.Group();
  rightEyeGroup.position.set(0.048, 0, 0);
  const rightWhite = new THREE.Mesh(eyeWhiteGeo, eyeWhiteMat);
  const rightIris = new THREE.Mesh(irisGeo, eyeMat);
  rightIris.position.set(0, 0, 0.018);
  rightEyeGroup.add(rightWhite, rightIris);

  eyeSocketsGroup.add(leftEyeGroup, rightEyeGroup);
  head.add(eyeSocketsGroup);

  // Eyebrows
  const leftEyebrow = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.007, 0.008), eyebrowMat);
  leftEyebrow.position.set(-0.048, 0.165, 0.138);
  const rightEyebrow = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.007, 0.008), eyebrowMat);
  rightEyebrow.position.set(0.048, 0.165, 0.138);
  head.add(leftEyebrow, rightEyebrow);

  // Mouth
  const mouthGeo = new THREE.TorusGeometry(0.022, 0.005, 8, 16, Math.PI);
  const mouthMesh = new THREE.Mesh(mouthGeo, mouthMat);
  mouthMesh.position.set(0, 0.075, 0.134);
  mouthMesh.rotation.z = Math.PI; // default curve smile
  head.add(mouthMesh);

  // Left Arm Chain
  const leftUpperArm = new THREE.Group();
  leftUpperArm.name = 'leftUpperArm';
  leftUpperArm.position.set(-0.21, 0.17, 0);
  chest.add(leftUpperArm);
  bones['leftUpperArm'] = leftUpperArm;

  const leftUpperArmMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045, 0.04, 0.22, 12),
    outfitPrimaryMat
  );
  leftUpperArmMesh.position.set(0, -0.11, 0);
  leftUpperArm.add(leftUpperArmMesh);

  const leftLowerArm = new THREE.Group();
  leftLowerArm.name = 'leftLowerArm';
  leftLowerArm.position.set(0, -0.22, 0);
  leftUpperArm.add(leftLowerArm);
  bones['leftLowerArm'] = leftLowerArm;

  const leftLowerArmMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.038, 0.035, 0.2, 12),
    skinMat
  );
  leftLowerArmMesh.position.set(0, -0.1, 0);
  leftLowerArm.add(leftLowerArmMesh);

  const leftHand = new THREE.Group();
  leftHand.name = 'leftHand';
  leftHand.position.set(0, -0.2, 0);
  leftLowerArm.add(leftHand);
  bones['leftHand'] = leftHand;

  const leftHandMesh = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 10), skinMat);
  leftHandMesh.position.set(0, -0.03, 0);
  leftHand.add(leftHandMesh);

  // Right Arm Chain
  const rightUpperArm = new THREE.Group();
  rightUpperArm.name = 'rightUpperArm';
  rightUpperArm.position.set(0.21, 0.17, 0);
  chest.add(rightUpperArm);
  bones['rightUpperArm'] = rightUpperArm;

  const rightUpperArmMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045, 0.04, 0.22, 12),
    outfitPrimaryMat
  );
  rightUpperArmMesh.position.set(0, -0.11, 0);
  rightUpperArm.add(rightUpperArmMesh);

  const rightLowerArm = new THREE.Group();
  rightLowerArm.name = 'rightLowerArm';
  rightLowerArm.position.set(0, -0.22, 0);
  rightUpperArm.add(rightLowerArm);
  bones['rightLowerArm'] = rightLowerArm;

  const rightLowerArmMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.038, 0.035, 0.2, 12),
    skinMat
  );
  rightLowerArmMesh.position.set(0, -0.1, 0);
  rightLowerArm.add(rightLowerArmMesh);

  const rightHand = new THREE.Group();
  rightHand.name = 'rightHand';
  rightHand.position.set(0, -0.2, 0);
  rightLowerArm.add(rightHand);
  bones['rightHand'] = rightHand;

  const rightHandMesh = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 10), skinMat);
  rightHandMesh.position.set(0, -0.03, 0);
  rightHand.add(rightHandMesh);

  // Left Leg Chain
  const leftUpperLeg = new THREE.Group();
  leftUpperLeg.name = 'leftUpperLeg';
  leftUpperLeg.position.set(-0.08, -0.08, 0);
  hips.add(leftUpperLeg);
  bones['leftUpperLeg'] = leftUpperLeg;

  const leftUpperLegMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.05, 0.35, 12),
    outfitSecondaryMat
  );
  leftUpperLegMesh.position.set(0, -0.175, 0);
  leftUpperLeg.add(leftUpperLegMesh);

  const leftLowerLeg = new THREE.Group();
  leftLowerLeg.name = 'leftLowerLeg';
  leftLowerLeg.position.set(0, -0.35, 0);
  leftUpperLeg.add(leftLowerLeg);
  bones['leftLowerLeg'] = leftLowerLeg;

  const leftLowerLegMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.048, 0.045, 0.34, 12),
    outfitSecondaryMat
  );
  leftLowerLegMesh.position.set(0, -0.17, 0);
  leftLowerLeg.add(leftLowerLegMesh);

  const leftFoot = new THREE.Group();
  leftFoot.name = 'leftFoot';
  leftFoot.position.set(0, -0.34, 0);
  leftLowerLeg.add(leftFoot);
  bones['leftFoot'] = leftFoot;

  const leftFootMesh = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.16), shoeMat);
  leftFootMesh.position.set(0, -0.03, 0.03);
  leftFoot.add(leftFootMesh);

  // Right Leg Chain
  const rightUpperLeg = new THREE.Group();
  rightUpperLeg.name = 'rightUpperLeg';
  rightUpperLeg.position.set(0.08, -0.08, 0);
  hips.add(rightUpperLeg);
  bones['rightUpperLeg'] = rightUpperLeg;

  const rightUpperLegMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.05, 0.35, 12),
    outfitSecondaryMat
  );
  rightUpperLegMesh.position.set(0, -0.175, 0);
  rightUpperLeg.add(rightUpperLegMesh);

  const rightLowerLeg = new THREE.Group();
  rightLowerLeg.name = 'rightLowerLeg';
  rightLowerLeg.position.set(0, -0.35, 0);
  rightUpperLeg.add(rightLowerLeg);
  bones['rightLowerLeg'] = rightLowerLeg;

  const rightLowerLegMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.048, 0.045, 0.34, 12),
    outfitSecondaryMat
  );
  rightLowerLegMesh.position.set(0, -0.17, 0);
  rightLowerLeg.add(rightLowerLegMesh);

  const rightFoot = new THREE.Group();
  rightFoot.name = 'rightFoot';
  rightFoot.position.set(0, -0.34, 0);
  rightLowerLeg.add(rightFoot);
  bones['rightFoot'] = rightFoot;

  const rightFootMesh = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.16), shoeMat);
  rightFootMesh.position.set(0, -0.03, 0.03);
  rightFoot.add(rightFootMesh);

  // Expression Weights
  const expressionWeights: Record<string, number> = {
    blink: 0,
    happy: 0,
    sad: 0,
    angry: 0,
    surprised: 0,
    relaxed: 0,
  };

  const applyProceduralExpression = (name: string, val: number) => {
    expressionWeights[name] = val;

    // Handle blink on eye scale
    const blinkVal = expressionWeights['blink'] || 0;
    const eyeScaleY = Math.max(0.08, 1 - blinkVal);
    eyeSocketsGroup.scale.y = eyeScaleY;

    // Handle expressions
    if (expressionWeights['happy'] > 0.3 || expressionWeights['relaxed'] > 0.3) {
      // Big smile
      mouthMesh.rotation.z = Math.PI;
      mouthMesh.scale.set(1.1, 1.1, 1);
      leftEyebrow.rotation.z = 0.05;
      rightEyebrow.rotation.z = -0.05;
    } else if (expressionWeights['sad'] > 0.3) {
      // Frown
      mouthMesh.rotation.z = 0;
      mouthMesh.scale.set(0.9, 0.9, 1);
      leftEyebrow.rotation.z = -0.2;
      rightEyebrow.rotation.z = 0.2;
    } else if (expressionWeights['angry'] > 0.3) {
      // Angry brows
      mouthMesh.rotation.z = 0;
      mouthMesh.scale.set(0.8, 0.6, 1);
      leftEyebrow.rotation.z = 0.3;
      rightEyebrow.rotation.z = -0.3;
    } else if (expressionWeights['surprised'] > 0.3) {
      // O mouth
      mouthMesh.rotation.z = Math.PI * 0.5;
      mouthMesh.scale.set(0.7, 1.5, 1);
      leftEyebrow.rotation.z = 0;
      rightEyebrow.rotation.z = 0;
    } else {
      // Neutral
      mouthMesh.rotation.z = Math.PI;
      mouthMesh.scale.set(0.8, 0.7, 1);
      leftEyebrow.rotation.z = 0;
      rightEyebrow.rotation.z = 0;
    }
  };

  return {
    isPlaceholder: true,
    scene: root,
    humanoid: {
      getNormalizedBoneNode: (name) => bones[name] || null,
      getBoneNode: (name) => bones[name] || null,
    },
    expressionManager: {
      setValue: (name, value) => applyProceduralExpression(name, value),
      getValue: (name) => expressionWeights[name] || 0,
      getExpression: (name) => ({ name }),
      update: () => {},
    },
    updateColors: (config) => {
      skinMat.color.set(getSkinColorFromTone(config.skin.tone));
      hairMat.color.set(config.hair.color);
      eyebrowMat.color.set(config.hair.color);
      eyeMat.color.set(config.eyes.color);
      outfitPrimaryMat.color.set(config.outfit.primaryColor);
      outfitSecondaryMat.color.set(config.outfit.secondaryColor);
    },
    setExpression: (expr) => {
      // Reset all emotion expressions
      ['happy', 'sad', 'angry', 'surprised', 'relaxed'].forEach((k) => (expressionWeights[k] = 0));
      if (expr !== 'neutral') {
        expressionWeights[expr] = 1;
      }
      applyProceduralExpression(expr, 1.0);
    },
    update: (_delta) => {
      // Internal tick if needed
    },
    dispose: () => {
      skinMat.dispose();
      hairMat.dispose();
      eyeMat.dispose();
      eyeWhiteMat.dispose();
      outfitPrimaryMat.dispose();
      outfitSecondaryMat.dispose();
      shoeMat.dispose();
      mouthMat.dispose();
      eyebrowMat.dispose();
    },
  };
}
