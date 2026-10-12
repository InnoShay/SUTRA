import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  AvatarConfig,
  AvatarExpression,
  AvatarPose,
  DEFAULT_AVATAR_CONFIG,
  validateAvatarConfig,
  HAIR_COLOR_PRESETS,
  SKIN_TONE_PRESETS,
  EYE_COLOR_PRESETS,
  OUTFIT_COLOR_PRESETS,
} from './avatarConfig';
import { ACCESSORIES_LIST } from './accessories';

interface AvailableMeshInfo {
  hairMeshes: string[];
  outfitMeshes: string[];
  hairMaterials: string[];
  skinMaterials: string[];
  eyeMaterials: string[];
  outfitMaterials: string[];
}

interface AvatarStoreState {
  config: AvatarConfig;
  isVrmLoaded: boolean;
  isPlaceholder: boolean;
  availableMeshes: AvailableMeshInfo;
  missingBannerDismissed: boolean;

  // Actions
  setConfig: (config: AvatarConfig) => void;
  updateHair: (hair: Partial<AvatarConfig['hair']>) => void;
  updateSkin: (skin: Partial<AvatarConfig['skin']>) => void;
  updateEyes: (eyes: Partial<AvatarConfig['eyes']>) => void;
  updateOutfit: (outfit: Partial<AvatarConfig['outfit']>) => void;
  toggleAccessory: (id: string, color?: string) => void;
  updateAccessoryColor: (id: string, color: string) => void;
  removeAccessory: (id: string) => void;
  setExpression: (expression: AvatarExpression) => void;
  setPose: (pose: AvatarPose) => void;
  randomize: () => void;
  reset: () => void;
  setVrmLoadedState: (loaded: boolean, isPlaceholder: boolean) => void;
  setAvailableMeshes: (info: AvailableMeshInfo) => void;
  dismissMissingBanner: () => void;
}

const safeStorage = {
  getItem: (name: string): string | null => {
    try {
      if (typeof window === 'undefined') return null;
      return localStorage.getItem(name);
    } catch (e) {
      console.warn('Could not read from localStorage:', e);
      return null;
    }
  },
  setItem: (name: string, value: string): void => {
    try {
      if (typeof window === 'undefined') return;
      localStorage.setItem(name, value);
    } catch (e) {
      console.warn('Could not write to localStorage:', e);
    }
  },
  removeItem: (name: string): void => {
    try {
      if (typeof window === 'undefined') return;
      localStorage.removeItem(name);
    } catch (e) {
      console.warn('Could not remove from localStorage:', e);
    }
  },
};

export const useAvatarStore = create<AvatarStoreState>()(
  persist(
    (set, get) => ({
      config: DEFAULT_AVATAR_CONFIG,
      isVrmLoaded: false,
      isPlaceholder: true,
      availableMeshes: {
        hairMeshes: [],
        outfitMeshes: [],
        hairMaterials: [],
        skinMaterials: [],
        eyeMaterials: [],
        outfitMaterials: [],
      },
      missingBannerDismissed: false,

      setConfig: (newConfig) => {
        set({ config: validateAvatarConfig(newConfig) });
      },

      updateHair: (hairUpdate) => {
        set((state) => ({
          config: {
            ...state.config,
            hair: { ...state.config.hair, ...hairUpdate },
          },
        }));
      },

      updateSkin: (skinUpdate) => {
        set((state) => ({
          config: {
            ...state.config,
            skin: { ...state.config.skin, ...skinUpdate },
          },
        }));
      },

      updateEyes: (eyesUpdate) => {
        set((state) => ({
          config: {
            ...state.config,
            eyes: { ...state.config.eyes, ...eyesUpdate },
          },
        }));
      },

      updateOutfit: (outfitUpdate) => {
        set((state) => ({
          config: {
            ...state.config,
            outfit: { ...state.config.outfit, ...outfitUpdate },
          },
        }));
      },

      toggleAccessory: (id, defaultColor = '#1e293b') => {
        set((state) => {
          const exists = state.config.accessories.some((a) => a.id === id);
          const accessories = exists
            ? state.config.accessories.filter((a) => a.id !== id)
            : [...state.config.accessories, { id, color: defaultColor }];
          return {
            config: { ...state.config, accessories },
          };
        });
      },

      updateAccessoryColor: (id, color) => {
        set((state) => ({
          config: {
            ...state.config,
            accessories: state.config.accessories.map((a) =>
              a.id === id ? { ...a, color } : a
            ),
          },
        }));
      },

      removeAccessory: (id) => {
        set((state) => ({
          config: {
            ...state.config,
            accessories: state.config.accessories.filter((a) => a.id !== id),
          },
        }));
      },

      setExpression: (expression) => {
        set((state) => ({
          config: { ...state.config, expression },
        }));
      },

      setPose: (pose) => {
        set((state) => ({
          config: { ...state.config, pose },
        }));
      },

      randomize: () => {
        const randItem = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
        const expressions: AvatarExpression[] = ['neutral', 'happy', 'sad', 'angry', 'surprised', 'relaxed'];
        const poses: AvatarPose[] = ['relaxed', 'wave', 'arms_crossed'];

        // Random accessory or two
        const randomAccessories = ACCESSORIES_LIST
          .filter(() => Math.random() > 0.5)
          .slice(0, 2)
          .map((acc) => ({
            id: acc.id,
            color: randItem(OUTFIT_COLOR_PRESETS),
          }));

        const randomTone = parseFloat((Math.random() * 0.9 + 0.05).toFixed(2));
        const skinColor = randItem(SKIN_TONE_PRESETS);

        const newConfig: AvatarConfig = {
          version: 1,
          hair: {
            color: randItem(HAIR_COLOR_PRESETS),
            variant: undefined,
          },
          skin: {
            color: skinColor,
            tone: randomTone,
          },
          eyes: {
            color: randItem(EYE_COLOR_PRESETS),
          },
          outfit: {
            primaryColor: randItem(OUTFIT_COLOR_PRESETS),
            secondaryColor: randItem(OUTFIT_COLOR_PRESETS),
            activeMeshes: [],
          },
          accessories: randomAccessories.length > 0 ? randomAccessories : [{ id: 'smart_glasses', color: '#1e293b' }],
          expression: randItem(expressions),
          pose: randItem(poses),
        };

        set({ config: newConfig });
      },

      reset: () => {
        set({ config: { ...DEFAULT_AVATAR_CONFIG } });
      },

      setVrmLoadedState: (loaded, isPlaceholder) => {
        set({ isVrmLoaded: loaded, isPlaceholder });
      },

      setAvailableMeshes: (info) => {
        set({ availableMeshes: info });
      },

      dismissMissingBanner: () => {
        set({ missingBannerDismissed: true });
      },
    }),
    {
      name: 'vrm_avatar_config_v1',
      storage: createJSONStorage(() => safeStorage),
      // Only persist avatar config and dismissal flag
      partialize: (state) => ({
        config: state.config,
        missingBannerDismissed: state.missingBannerDismissed,
      }),
    }
  )
);
