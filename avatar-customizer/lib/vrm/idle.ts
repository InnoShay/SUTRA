import * as THREE from 'three';
import { VRM } from '@pixiv/three-vrm';
import { AvatarPose } from '../avatarConfig';
import { POSE_DEFINITIONS } from './poses';

export interface IdleAnimationState {
  nextBlinkTime: number;
  blinkDuration: number;
  isBlinking: boolean;
  blinkProgress: number;
}

export function createIdleAnimationState(): IdleAnimationState {
  return {
    nextBlinkTime: 2.5 + Math.random() * 3.0,
    blinkDuration: 0.18,
    isBlinking: false,
    blinkProgress: 0,
  };
}

/**
 * Procedural idle animation handler running on every frame.
 * Applies breathing, natural head sway, random eye blinks, and dynamic wave oscillation.
 * Respects prefers-reduced-motion to disable sway.
 */
export function updateVrmIdle(
  vrm: VRM,
  clockTime: number,
  delta: number,
  currentPose: AvatarPose,
  state: IdleAnimationState,
  prefersReducedMotion = false
): void {
  // 1. Random Eye Blinking via VRM expression
  if (vrm.expressionManager) {
    if (!state.isBlinking) {
      if (clockTime >= state.nextBlinkTime) {
        state.isBlinking = true;
        state.blinkProgress = 0;
      }
    }

    if (state.isBlinking) {
      state.blinkProgress += delta / state.blinkDuration;
      let blinkWeight = 0;

      if (state.blinkProgress <= 0.5) {
        // Closing eyes
        blinkWeight = state.blinkProgress * 2;
      } else if (state.blinkProgress <= 1.0) {
        // Opening eyes
        blinkWeight = (1.0 - state.blinkProgress) * 2;
      } else {
        // Finished blink
        state.isBlinking = false;
        blinkWeight = 0;
        state.nextBlinkTime = clockTime + 2.0 + Math.random() * 4.0;
      }

      blinkWeight = Math.max(0, Math.min(1, blinkWeight));
      try {
        vrm.expressionManager.setValue('blink', blinkWeight);
      } catch {
        // VRM 0.0 or 1.0 may have specific blink name
      }
    }
  }

  // 2. Procedural Bone Movements (Humanoid)
  if (!vrm.humanoid) return;

  const poseDef = POSE_DEFINITIONS[currentPose] || POSE_DEFINITIONS.relaxed;
  const baseRotations = poseDef.rotations;

  // Breathing oscillation (chest and spine)
  const breathFreq = 1.6;
  const breathFactor = Math.sin(clockTime * breathFreq);
  const breathChestX = 0.02 * breathFactor;
  const breathSpineX = 0.015 * breathFactor;

  const chest = vrm.humanoid.getNormalizedBoneNode('chest') || vrm.humanoid.getBoneNode('chest');
  if (chest) {
    const base = baseRotations.chest || [0, 0, 0];
    chest.rotation.x = base[0] + breathChestX;
    chest.rotation.y = base[1];
    chest.rotation.z = base[2];
  }

  const spine = vrm.humanoid.getNormalizedBoneNode('spine') || vrm.humanoid.getBoneNode('spine');
  if (spine) {
    const base = baseRotations.spine || [0, 0, 0];
    spine.rotation.x = base[0] + breathSpineX;
    spine.rotation.y = base[1];
    spine.rotation.z = base[2];
  }

  // Head and Neck subtle sway (disabled if reduced motion preferred)
  const head = vrm.humanoid.getNormalizedBoneNode('head') || vrm.humanoid.getBoneNode('head');
  const neck = vrm.humanoid.getNormalizedBoneNode('neck') || vrm.humanoid.getBoneNode('neck');

  if (head && neck) {
    const baseHead = baseRotations.head || [0, 0, 0];
    const baseNeck = baseRotations.neck || [0, 0, 0];

    if (!prefersReducedMotion) {
      const headSwayY = Math.sin(clockTime * 0.75) * 0.035;
      const headSwayZ = Math.cos(clockTime * 0.6) * 0.015;
      const headTiltX = Math.sin(clockTime * 0.9) * 0.012;

      head.rotation.set(
        baseHead[0] + headTiltX,
        baseHead[1] + headSwayY,
        baseHead[2] + headSwayZ
      );
      neck.rotation.set(
        baseNeck[0] + headTiltX * 0.5,
        baseNeck[1] + headSwayY * 0.5,
        baseNeck[2] + headSwayZ * 0.5
      );
    } else {
      head.rotation.set(baseHead[0], baseHead[1], baseHead[2]);
      neck.rotation.set(baseNeck[0], baseNeck[1], baseNeck[2]);
    }
  }

  // If wave pose, add cheerful hand flutter
  if (currentPose === 'wave') {
    const rightHand = vrm.humanoid.getNormalizedBoneNode('rightHand') || vrm.humanoid.getBoneNode('rightHand');
    if (rightHand) {
      const baseHand = baseRotations.rightHand || [0, 0, 0];
      const waveFlutter = prefersReducedMotion ? 0 : Math.sin(clockTime * 7.0) * 0.22;
      rightHand.rotation.set(
        baseHand[0],
        baseHand[1],
        baseHand[2] + waveFlutter
      );
    }
  }
}
