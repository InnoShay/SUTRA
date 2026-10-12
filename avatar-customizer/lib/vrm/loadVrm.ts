import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRM, VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';

export interface VrmLoadResult {
  vrm: VRM;
  isVRM0: boolean;
}

/**
 * Loads a VRM model asynchronously from a URL (e.g. /models/base.vrm).
 * Returns null if the file is not found (404) or fails to parse, allowing
 * seamless fallback to the procedural placeholder humanoid.
 */
export async function loadVrm(
  url: string,
  onProgress?: (percent: number) => void
): Promise<VRM | null> {
  try {
    // 1. Preflight check to verify file exists and is not a 404 HTML fallback
    if (typeof window !== 'undefined') {
      const headRes = await fetch(url, { method: 'HEAD' });
      if (!headRes.ok) {
        console.info(`[loadVrm] Model not found at "${url}" (status: ${headRes.status}). Using procedural placeholder.`);
        return null;
      }
      const contentType = headRes.headers.get('content-type') || '';
      if (contentType.includes('text/html')) {
        console.info(`[loadVrm] URL returned HTML instead of 3D asset. Using procedural placeholder.`);
        return null;
      }
    }

    // 2. Setup GLTFLoader with Pixiv VRMLoaderPlugin
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));

    const gltf = await loader.loadAsync(
      url,
      (progress) => {
        if (progress.total > 0 && onProgress) {
          onProgress(Math.round((progress.loaded / progress.total) * 100));
        }
      }
    );

    const vrm = gltf.userData.vrm as VRM | undefined;
    if (!vrm) {
      console.warn(`[loadVrm] Asset at "${url}" was parsed as GLTF, but contains no VRM extension.`);
      return null;
    }

    // 3. Apply standard Pixiv VRM optimizations
    try {
      VRMUtils.removeUnnecessaryVertices(gltf.scene);
    } catch {
      // Non-fatal if helper unavailable for this mesh type
    }

    try {
      VRMUtils.removeUnnecessaryJoints(gltf.scene);
    } catch {
      // Non-fatal
    }

    // VRM0 models need an orientation fix (180 deg Y flip)
    try {
      VRMUtils.rotateVRM0(vrm);
    } catch {
      // Non-fatal
    }

    return vrm;
  } catch (error) {
    console.info(`[loadVrm] Could not load model from "${url}". Falling back to procedural placeholder.`, error);
    return null;
  }
}
