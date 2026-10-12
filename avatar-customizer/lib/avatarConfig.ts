export interface AccessoryConfig {
  id: string;
  color: string;
}

export type AvatarExpression = 'neutral' | 'happy' | 'sad' | 'angry' | 'surprised' | 'relaxed';
export type AvatarPose = 'relaxed' | 'wave' | 'arms_crossed';

export interface AvatarConfig {
  version: 1;
  hair: {
    color: string;
    variant?: string;
  };
  skin: {
    color: string;
    tone: number; // 0 (fair) to 1 (deep)
  };
  eyes: {
    color: string;
  };
  outfit: {
    primaryColor: string;
    secondaryColor: string;
    activeMeshes: string[];
  };
  accessories: AccessoryConfig[];
  expression: AvatarExpression;
  pose: AvatarPose;
}

export const SKIN_TONE_PRESETS = [
  '#fde7d9', // fair / peach
  '#f8d5b8', // warm ivory
  '#e8b998', // golden honey
  '#c7946d', // warm bronze
  '#8d5524', // rich amber
  '#53341c', // deep espresso
];

export const HAIR_COLOR_PRESETS = [
  '#1a1a1a', // onyx black
  '#4a2e18', // rich chestnut
  '#8a5229', // auburn
  '#e5b871', // honey blonde
  '#f0e2b6', // platinum blonde
  '#b22222', // ruby crimson
  '#3b82f6', // electric cobalt
  '#10b981', // emerald green
  '#a855f7', // cosmic violet
  '#ec4899', // bubblegum pink
  '#94a3b8', // silver mist
];

export const EYE_COLOR_PRESETS = [
  '#4a3728', // hazel brown
  '#2563eb', // sapphire blue
  '#059669', // jade emerald
  '#6b7280', // graphite grey
  '#d97706', // amber golden
  '#9333ea', // amethyst violet
  '#dc2626', // ruby red
];

export const OUTFIT_COLOR_PRESETS = [
  '#1e293b', // slate navy
  '#3b82f6', // vibrant azure
  '#10b981', // mint jade
  '#ef4444', // crimson
  '#f59e0b', // amber marigold
  '#8b5cf6', // royal purple
  '#ec4899', // rose pink
  '#f8fafc', // crisp white
  '#0f172a', // midnight obsidian
];

export const DEFAULT_AVATAR_CONFIG: AvatarConfig = {
  version: 1,
  hair: {
    color: '#4a2e18',
    variant: undefined,
  },
  skin: {
    color: '#f8d5b8',
    tone: 0.2,
  },
  eyes: {
    color: '#2563eb',
  },
  outfit: {
    primaryColor: '#1e293b',
    secondaryColor: '#3b82f6',
    activeMeshes: [],
  },
  accessories: [
    { id: 'smart_glasses', color: '#1e293b' },
  ],
  expression: 'neutral',
  pose: 'relaxed',
};

// Interpolate skin color based on tone slider (0 to 1)
export function getSkinColorFromTone(tone: number): string {
  const clamped = Math.max(0, Math.min(1, tone));
  const segment = 1 / (SKIN_TONE_PRESETS.length - 1);
  const index = Math.min(Math.floor(clamped / segment), SKIN_TONE_PRESETS.length - 2);
  const factor = (clamped - index * segment) / segment;

  const hex1 = SKIN_TONE_PRESETS[index];
  const hex2 = SKIN_TONE_PRESETS[index + 1];

  const r1 = parseInt(hex1.slice(1, 3), 16);
  const g1 = parseInt(hex1.slice(3, 5), 16);
  const b1 = parseInt(hex1.slice(5, 7), 16);

  const r2 = parseInt(hex2.slice(1, 3), 16);
  const g2 = parseInt(hex2.slice(3, 5), 16);
  const b2 = parseInt(hex2.slice(5, 7), 16);

  const r = Math.round(r1 + (r2 - r1) * factor);
  const g = Math.round(g1 + (g2 - g1) * factor);
  const b = Math.round(b1 + (b2 - b1) * factor);

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;

function sanitizeHex(val: unknown, fallback: string): string {
  if (typeof val === 'string' && HEX_COLOR_REGEX.test(val)) {
    return val.toLowerCase();
  }
  return fallback;
}

export function validateAvatarConfig(input: unknown): AvatarConfig {
  if (!input || typeof input !== 'object') {
    return { ...DEFAULT_AVATAR_CONFIG };
  }

  const raw = input as Record<string, unknown>;

  const hairRaw = (raw.hair && typeof raw.hair === 'object' ? raw.hair : {}) as Record<string, unknown>;
  const skinRaw = (raw.skin && typeof raw.skin === 'object' ? raw.skin : {}) as Record<string, unknown>;
  const eyesRaw = (raw.eyes && typeof raw.eyes === 'object' ? raw.eyes : {}) as Record<string, unknown>;
  const outfitRaw = (raw.outfit && typeof raw.outfit === 'object' ? raw.outfit : {}) as Record<string, unknown>;

  const validExpressions: AvatarExpression[] = ['neutral', 'happy', 'sad', 'angry', 'surprised', 'relaxed'];
  const expression = validExpressions.includes(raw.expression as AvatarExpression)
    ? (raw.expression as AvatarExpression)
    : DEFAULT_AVATAR_CONFIG.expression;

  const validPoses: AvatarPose[] = ['relaxed', 'wave', 'arms_crossed'];
  const pose = validPoses.includes(raw.pose as AvatarPose)
    ? (raw.pose as AvatarPose)
    : DEFAULT_AVATAR_CONFIG.pose;

  const accessories: AccessoryConfig[] = Array.isArray(raw.accessories)
    ? raw.accessories
        .filter((item): item is { id: string; color: string } => {
          return item && typeof item === 'object' && typeof item.id === 'string' && item.id.length > 0;
        })
        .map((item) => ({
          id: String(item.id).slice(0, 50),
          color: sanitizeHex(item.color, '#1e293b'),
        }))
    : DEFAULT_AVATAR_CONFIG.accessories;

  const toneRaw = typeof skinRaw.tone === 'number' && !isNaN(skinRaw.tone)
    ? Math.max(0, Math.min(1, skinRaw.tone))
    : DEFAULT_AVATAR_CONFIG.skin.tone;

  const activeMeshes = Array.isArray(outfitRaw.activeMeshes)
    ? outfitRaw.activeMeshes.filter((m): m is string => typeof m === 'string').map(m => m.slice(0, 100))
    : [];

  return {
    version: 1,
    hair: {
      color: sanitizeHex(hairRaw.color, DEFAULT_AVATAR_CONFIG.hair.color),
      variant: typeof hairRaw.variant === 'string' ? hairRaw.variant.slice(0, 100) : undefined,
    },
    skin: {
      color: sanitizeHex(skinRaw.color, DEFAULT_AVATAR_CONFIG.skin.color),
      tone: toneRaw,
    },
    eyes: {
      color: sanitizeHex(eyesRaw.color, DEFAULT_AVATAR_CONFIG.eyes.color),
    },
    outfit: {
      primaryColor: sanitizeHex(outfitRaw.primaryColor, DEFAULT_AVATAR_CONFIG.outfit.primaryColor),
      secondaryColor: sanitizeHex(outfitRaw.secondaryColor, DEFAULT_AVATAR_CONFIG.outfit.secondaryColor),
      activeMeshes,
    },
    accessories,
    expression,
    pose,
  };
}

// Encode config to compact URL-safe base64 string
export function encodeAvatarConfig(config: AvatarConfig): string {
  try {
    const jsonStr = JSON.stringify(config);
    if (typeof window !== 'undefined' && typeof btoa === 'function') {
      const utf8Bytes = new TextEncoder().encode(jsonStr);
      let binary = '';
      for (let i = 0; i < utf8Bytes.length; i++) {
        binary += String.fromCharCode(utf8Bytes[i]);
      }
      return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    } else {
      return Buffer.from(jsonStr, 'utf-8').toString('base64url');
    }
  } catch (err) {
    console.error('Failed to encode avatar config:', err);
    return '';
  }
}

// Decode base64url string to AvatarConfig with sanitization
export function decodeAvatarConfig(encoded: string): AvatarConfig | null {
  if (!encoded || typeof encoded !== 'string') return null;
  try {
    // Restore base64 standard characters
    let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4 !== 0) {
      base64 += '=';
    }

    let jsonStr: string;
    if (typeof window !== 'undefined' && typeof atob === 'function') {
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      jsonStr = new TextDecoder().decode(bytes);
    } else {
      jsonStr = Buffer.from(base64, 'base64').toString('utf-8');
    }

    const parsed = JSON.parse(jsonStr);
    return validateAvatarConfig(parsed);
  } catch (err) {
    console.warn('Invalid avatar config in URL or string:', err);
    return null;
  }
}
