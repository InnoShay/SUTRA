'use client';

import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { VRM } from '@pixiv/three-vrm';
import { AvatarConfig } from '../lib/avatarConfig';
import { loadVrm } from '../lib/vrm/loadVrm';
import {
  inspectVrmMaterialsAndMeshes,
  applyColorsToVrmMaterials,
  debugListVrmElements,
  VrmInspectionResult,
} from '../lib/vrm/materialMap';
import { applyVrmExpression } from '../lib/vrm/expressions';
import { applyVrmPose } from '../lib/vrm/poses';
import {
  createIdleAnimationState,
  updateVrmIdle,
  IdleAnimationState,
} from '../lib/vrm/idle';
import {
  createProceduralHumanoid,
  PlaceholderHumanoid,
} from '../lib/vrm/placeholder';
import { disposeVrm } from '../lib/vrm/dispose';
import { getAccessoryDefinition } from '../lib/accessories';
import { useAvatarStore } from '../lib/store';
import { Info, X, Camera, RefreshCw } from 'lucide-react';

export interface AvatarViewerHandle {
  captureSnapshot: () => Promise<string | null>;
}

interface AvatarViewerProps {
  config?: AvatarConfig;
  modelUrl?: string;
  className?: string;
  autoRotate?: boolean;
  showControls?: boolean;
}

// Inner 3D Scene Component
function AvatarScene({
  config,
  modelUrl = '/models/base.vrm',
  autoRotate = false,
  onLoaded,
}: {
  config: AvatarConfig;
  modelUrl?: string;
  autoRotate?: boolean;
  onLoaded: (isPlaceholder: boolean) => void;
}) {
  const { gl } = useThree();
  const vrmRef = useRef<VRM | null>(null);
  const placeholderRef = useRef<PlaceholderHumanoid | null>(null);
  const inspectionRef = useRef<VrmInspectionResult | null>(null);
  const idleStateRef = useRef<IdleAnimationState>(createIdleAnimationState());
  const accessoriesGroupRef = useRef<THREE.Group>(new THREE.Group());
  const attachedMeshesRef = useRef<THREE.Object3D[]>([]);

  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const setAvailableMeshes = useAvatarStore((s) => s.setAvailableMeshes);
  const setVrmLoadedState = useAvatarStore((s) => s.setVrmLoadedState);

  // Check prefers-reduced-motion media query
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Clean up existing attached accessory objects
  const clearAccessories = useCallback(() => {
    for (const obj of attachedMeshesRef.current) {
      if (obj.parent) {
        obj.parent.remove(obj);
      }
      obj.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry?.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m?.dispose());
          } else {
            child.material?.dispose();
          }
        }
      });
    }
    attachedMeshesRef.current = [];
  }, []);

  // Update attached accessories to humanoid bones
  const updateAccessories = useCallback(
    (targetHumanoid: {
      getNormalizedBoneNode: (name: any) => THREE.Object3D | null;
      getBoneNode: (name: any) => THREE.Object3D | null;
    } | null) => {
      clearAccessories();
      if (!targetHumanoid || !config.accessories) return;

      for (const accConfig of config.accessories) {
        const def = getAccessoryDefinition(accConfig.id);
        if (!def) continue;

        const boneNode =
          targetHumanoid.getNormalizedBoneNode(def.attachBone) ||
          targetHumanoid.getBoneNode(def.attachBone);

        if (boneNode) {
          const mesh = def.createMesh(accConfig.color);
          boneNode.add(mesh);
          attachedMeshesRef.current.push(mesh);
        }
      }
    },
    [config.accessories, clearAccessories]
  );

  // Model loading and lifecycle
  useEffect(() => {
    let isCancelled = false;

    async function initModel() {
      // 1. Try loading real VRM model
      const loadedVrm = await loadVrm(modelUrl);
      if (isCancelled) {
        disposeVrm(loadedVrm);
        return;
      }

      if (loadedVrm) {
        vrmRef.current = loadedVrm;
        placeholderRef.current = null;

        // Inspect materials and meshes
        const inspection = inspectVrmMaterialsAndMeshes(loadedVrm);
        inspectionRef.current = inspection;
        debugListVrmElements(loadedVrm);

        // Store available mesh names for customizer UI
        setAvailableMeshes({
          hairMeshes: inspection.hairMeshes.map((m) => m.name),
          outfitMeshes: inspection.outfitMeshes.map((m) => m.name),
          hairMaterials: inspection.hairMaterials.map((m) => m.name),
          skinMaterials: inspection.skinMaterials.map((m) => m.name),
          eyeMaterials: inspection.eyeMaterials.map((m) => m.name),
          outfitMaterials: inspection.outfitMaterials.map((m) => m.name),
        });

        // Apply initial colors and poses
        applyColorsToVrmMaterials(inspection, config);
        applyVrmPose(loadedVrm, config.pose);
        applyVrmExpression(loadedVrm, config.expression);
        updateAccessories(loadedVrm.humanoid);

        setVrmLoadedState(true, false);
        onLoaded(false);
      } else {
        // 2. Fall back to procedural placeholder humanoid
        console.info('[AvatarViewer] Generating procedural placeholder avatar.');
        const placeholder = createProceduralHumanoid(config);
        placeholderRef.current = placeholder;
        vrmRef.current = null;
        inspectionRef.current = null;

        setAvailableMeshes({
          hairMeshes: ['Procedural Hair'],
          outfitMeshes: ['Procedural Torso', 'Procedural Pants'],
          hairMaterials: ['HairMat'],
          skinMaterials: ['SkinMat'],
          eyeMaterials: ['EyeMat'],
          outfitMaterials: ['OutfitPrimaryMat', 'OutfitSecondaryMat'],
        });

        applyVrmPose(placeholder as unknown as VRM, config.pose);
        placeholder.setExpression(config.expression);
        updateAccessories(placeholder.humanoid);

        setVrmLoadedState(true, true);
        onLoaded(true);
      }
    }

    initModel();

    return () => {
      isCancelled = true;
      clearAccessories();
      if (vrmRef.current) {
        disposeVrm(vrmRef.current);
        vrmRef.current = null;
      }
      if (placeholderRef.current) {
        placeholderRef.current.dispose();
        placeholderRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelUrl]); // Reload only if model URL changes

  // Synchronize avatar colors & materials when config changes
  useEffect(() => {
    if (vrmRef.current && inspectionRef.current) {
      applyColorsToVrmMaterials(inspectionRef.current, config);
    } else if (placeholderRef.current) {
      placeholderRef.current.updateColors(config);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    config.hair.color,
    config.hair.variant,
    config.skin.tone,
    config.eyes.color,
    config.outfit.primaryColor,
    config.outfit.secondaryColor,
    config.outfit.activeMeshes,
  ]);

  // Synchronize pose
  useEffect(() => {
    if (vrmRef.current) {
      applyVrmPose(vrmRef.current, config.pose);
    } else if (placeholderRef.current) {
      applyVrmPose(placeholderRef.current as unknown as VRM, config.pose);
    }
  }, [config.pose]);

  // Synchronize expression
  useEffect(() => {
    if (vrmRef.current) {
      applyVrmExpression(vrmRef.current, config.expression);
    } else if (placeholderRef.current) {
      placeholderRef.current.setExpression(config.expression);
    }
  }, [config.expression]);

  // Synchronize accessories attachment
  useEffect(() => {
    if (vrmRef.current) {
      updateAccessories(vrmRef.current.humanoid);
    } else if (placeholderRef.current) {
      updateAccessories(placeholderRef.current.humanoid);
    }
  }, [config.accessories, updateAccessories]);

  // Animation frame loop
  useFrame((state, delta) => {
    const elapsed = state.clock.elapsedTime;

    if (vrmRef.current) {
      // Pixiv VRM standard update
      vrmRef.current.update(delta);
      // Procedural idle: breathing, blink, head sway
      updateVrmIdle(
        vrmRef.current,
        elapsed,
        delta,
        config.pose,
        idleStateRef.current,
        prefersReducedMotion
      );
    } else if (placeholderRef.current) {
      placeholderRef.current.update(delta);
      updateVrmIdle(
        placeholderRef.current as unknown as VRM,
        elapsed,
        delta,
        config.pose,
        idleStateRef.current,
        prefersReducedMotion
      );
    }
  });

  return (
    <>
      {/* Studio Lighting Setup */}
      <ambientLight intensity={0.75} />
      <directionalLight position={[2.5, 4, 3]} intensity={1.3} color="#ffffff" castShadow />
      <directionalLight position={[-3, 2, 2]} intensity={0.65} color="#cbd5e1" />
      <directionalLight position={[0, 3.5, -3.5]} intensity={0.9} color="#e0f2fe" />

      {/* Orbit Controls with bounded angles */}
      <OrbitControls
        makeDefault
        target={[0, 1.05, 0]}
        minDistance={0.7}
        maxDistance={3.5}
        minPolarAngle={Math.PI * 0.15}
        maxPolarAngle={Math.PI * 0.55}
        enablePan={false}
        autoRotate={autoRotate}
        autoRotateSpeed={1.5}
      />

      {/* VRM Scene Primitive */}
      {vrmRef.current && <primitive object={vrmRef.current.scene} />}

      {/* Procedural Placeholder Primitive */}
      {placeholderRef.current && <primitive object={placeholderRef.current.scene} />}
    </>
  );
}

// Exportable, Reusable AvatarViewer Component
export const AvatarViewer = forwardRef<AvatarViewerHandle, AvatarViewerProps>(
  function AvatarViewer(
    {
      config: propConfig,
      modelUrl = '/models/base.vrm',
      className = '',
      autoRotate = false,
      showControls = true,
    },
    ref
  ) {
    const storeConfig = useAvatarStore((s) => s.config);
    const activeConfig = propConfig || storeConfig;

    const missingBannerDismissed = useAvatarStore((s) => s.missingBannerDismissed);
    const dismissMissingBanner = useAvatarStore((s) => s.dismissMissingBanner);

    const [isPlaceholder, setIsPlaceholder] = useState<boolean>(true);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const canvasContainerRef = useRef<HTMLDivElement>(null);

    // Snapshot Capture Handler (1024x1024 transparent PNG)
    useImperativeHandle(ref, () => ({
      captureSnapshot: async (): Promise<string | null> => {
        if (!canvasContainerRef.current) return null;
        const canvas = canvasContainerRef.current.querySelector('canvas');
        if (!canvas) return null;

        try {
          // Offscreen 1024x1024 high resolution canvas
          const offscreenCanvas = document.createElement('canvas');
          offscreenCanvas.width = 1024;
          offscreenCanvas.height = 1024;
          const ctx = offscreenCanvas.getContext('2d');
          if (!ctx) return null;

          // Render canvas contents scaled into high-res transparent output
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(canvas, 0, 0, 1024, 1024);

          return offscreenCanvas.toDataURL('image/png');
        } catch (err) {
          console.error('Snapshot capture failed:', err);
          return null;
        }
      },
    }));

    return (
      <div
        ref={canvasContainerRef}
        className={`relative w-full h-full min-h-[380px] select-none overflow-hidden rounded-2xl bg-gradient-to-b from-slate-900/90 via-slate-950 to-slate-900 border border-slate-800/80 shadow-2xl backdrop-blur-md ${className}`}
      >
        {/* Loading Spinner */}
        {isLoading && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm transition-opacity duration-300">
            <RefreshCw className="w-9 h-9 text-indigo-400 animate-spin mb-3" />
            <p className="text-sm font-medium text-slate-300 tracking-wide">
              Initializing 3D Avatar Engine...
            </p>
          </div>
        )}

        {/* Missing VRM Model Informational Banner */}
        {isPlaceholder && !missingBannerDismissed && (
          <div className="absolute top-3 left-3 right-3 z-20 flex items-start justify-between gap-3 p-3.5 rounded-xl bg-slate-900/90 border border-amber-500/30 text-amber-200 shadow-lg backdrop-blur-md">
            <div className="flex items-start gap-2.5">
              <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs leading-relaxed text-slate-300">
                <span className="font-semibold text-amber-300">Using Procedural Avatar:</span>{' '}
                Add <code className="px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 font-mono text-[11px]">public/models/base.vrm</code> (export from VRoid Studio) to see your real 3D avatar. All customizer options work live on this placeholder!
              </div>
            </div>
            <button
              onClick={dismissMissingBanner}
              className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/60 transition"
              aria-label="Dismiss banner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 3D Canvas */}
        <Canvas
          gl={{
            preserveDrawingBuffer: true,
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance',
          }}
          camera={{ position: [0, 1.25, 2.1], fov: 38 }}
          dpr={[1, 2]}
          className="w-full h-full"
        >
          <AvatarScene
            config={activeConfig}
            modelUrl={modelUrl}
            autoRotate={autoRotate}
            onLoaded={(placeholderMode) => {
              setIsPlaceholder(placeholderMode);
              setIsLoading(false);
            }}
          />
        </Canvas>

        {/* Floating Subtle Hint / Info overlay */}
        {showControls && !isLoading && (
          <div className="absolute bottom-3 left-3 z-10 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/70 border border-slate-800 text-[11px] text-slate-400 backdrop-blur-sm pointer-events-none">
            <span>Drag to rotate</span>
            <span>•</span>
            <span>Scroll to zoom</span>
          </div>
        )}
      </div>
    );
  }
);
