import * as THREE from 'three';
import { VRM, VRMHumanBoneName } from '@pixiv/three-vrm';
import { AvatarPose } from '../avatarConfig';

interface BoneRotationMap {
  [boneName: string]: [number, number, number]; // Euler angles [x, y, z] in radians
}

export const POSE_DEFINITIONS: Record<AvatarPose, { name: string; description: string; rotations: BoneRotationMap }> = {
  relaxed: {
    name: 'Relaxed Standing',
    description: 'Natural casual posture with arms resting gently at the sides',
    rotations: {
      leftUpperArm: [0.08, 0.05, -1.25],
      rightUpperArm: [0.08, -0.05, 1.25],
      leftLowerArm: [0.05, 0.15, -0.1],
      rightLowerArm: [0.05, -0.15, 0.1],
      leftHand: [0, 0, 0],
      rightHand: [0, 0, 0],
      spine: [0.03, 0, 0],
      chest: [-0.02, 0, 0],
      neck: [0, 0, 0],
      head: [0, 0, 0],
    },
  },

  wave: {
    name: 'Friendly Wave',
    description: 'Left arm relaxed with right arm raised in a cheerful greeting',
    rotations: {
      leftUpperArm: [0.08, 0.05, -1.25],
      leftLowerArm: [0.05, 0.15, -0.1],
      leftHand: [0, 0, 0],
      // Right arm raised high for wave
      rightUpperArm: [-0.2, -0.3, 1.9],
      rightLowerArm: [0.1, -0.4, 1.2],
      rightHand: [0.1, 0.0, 0.3],
      spine: [0.03, 0.05, 0],
      chest: [0.02, 0.05, 0.02],
      neck: [0, 0.05, 0],
      head: [0, 0.05, 0],
    },
  },

  arms_crossed: {
    name: 'Confident Crossed',
    description: 'Thoughtful, confident pose with arms folded across the chest',
    rotations: {
      leftUpperArm: [0.55, 0.45, -0.65],
      rightUpperArm: [0.55, -0.45, 0.65],
      leftLowerArm: [0.1, 0.85, -1.35],
      rightLowerArm: [0.1, -0.85, 1.35],
      leftHand: [-0.1, 0.2, 0],
      rightHand: [-0.1, -0.2, 0],
      spine: [-0.02, 0, 0],
      chest: [0.03, 0, 0],
      neck: [0.02, 0, 0],
      head: [0.02, 0, 0],
    },
  },
};

/**
 * Applies a humanoid pose to a VRM model using normalized humanoid bone rotations.
 */
export function applyVrmPose(vrm: VRM, pose: AvatarPose): void {
  if (!vrm.humanoid) return;

  const poseDef = POSE_DEFINITIONS[pose] || POSE_DEFINITIONS.relaxed;

  // Reset standard arm and spine bones before applying new pose rotations
  const bonesToControl: VRMHumanBoneName[] = [
    'leftUpperArm',
    'rightUpperArm',
    'leftLowerArm',
    'rightLowerArm',
    'leftHand',
    'rightHand',
    'spine',
    'chest',
    'neck',
    'head',
  ];

  for (const boneName of bonesToControl) {
    const node = vrm.humanoid.getNormalizedBoneNode(boneName) || vrm.humanoid.getBoneNode(boneName);
    if (node) {
      const rot = poseDef.rotations[boneName];
      if (rot) {
        node.rotation.set(rot[0], rot[1], rot[2]);
      } else {
        node.rotation.set(0, 0, 0);
      }
    }
  }
}
