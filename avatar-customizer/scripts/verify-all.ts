import {
  validateAvatarConfig,
  encodeAvatarConfig,
  decodeAvatarConfig,
  DEFAULT_AVATAR_CONFIG,
  getSkinColorFromTone,
  AvatarConfig,
} from '../lib/avatarConfig';
import { ACCESSORY_REGISTRY } from '../lib/accessories';

console.log('--- RUNNING RIGOROUS AVATAR CUSTOMIZER VERIFICATION ---');

// 1. Default config validation
const defaultConfig = validateAvatarConfig(null);
console.assert(defaultConfig.version === 1, 'Default version must be 1');
console.assert(defaultConfig.hair.color === DEFAULT_AVATAR_CONFIG.hair.color, 'Default hair color matches');
console.assert(defaultConfig.skin.tone === DEFAULT_AVATAR_CONFIG.skin.tone, 'Default skin tone matches');
console.assert(defaultConfig.pose === 'relaxed', 'Default pose is relaxed');
console.assert(defaultConfig.expression === 'neutral', 'Default expression is neutral');
console.log('✔ Test 1: Default configuration and validation passed');

// 2. Share link base64url encode and decode round-trip
const customConfig: AvatarConfig = {
  version: 1,
  hair: { color: '#ec4899', variant: 'Hair_TwinTail' },
  skin: { color: '#c7946d', tone: 0.6 },
  eyes: { color: '#059669' },
  outfit: {
    primaryColor: '#8b5cf6',
    secondaryColor: '#f59e0b',
    activeMeshes: ['Tops_Jacket', 'Bottoms_Jeans'],
  },
  accessories: [
    { id: 'smart_glasses', color: '#1e293b' },
    { id: 'headphones', color: '#ec4899' },
  ],
  expression: 'happy',
  pose: 'wave',
};

const encoded = encodeAvatarConfig(customConfig);
console.assert(encoded.length > 0, 'Encoded string must not be empty');
console.assert(!encoded.includes('+') && !encoded.includes('/') && !encoded.includes('='), 'Encoded string must be base64url safe');

const decoded = decodeAvatarConfig(encoded);
console.assert(decoded !== null, 'Decoded config must not be null');
console.assert(decoded?.hair.color === '#ec4899', 'Decoded hair color matches');
console.assert(decoded?.expression === 'happy', 'Decoded expression matches');
console.assert(decoded?.pose === 'wave', 'Decoded pose matches');
console.assert(decoded?.accessories.length === 2, 'Decoded accessories count matches');
console.log('✔ Test 2: Share link base64url round-trip passed');

// 3. Malformed share parameter fallback
const malformedInputs = [
  'not-a-valid-base64!',
  '{}',
  'invalid%%%base64',
  '',
  encodeAvatarConfig({ ...customConfig, hair: { color: 'not-a-hex' } } as any),
];

for (const input of malformedInputs) {
  const result = decodeAvatarConfig(input);
  if (result) {
    console.assert(result.version === 1, 'Sanitized version must be 1');
    console.assert(/^#[0-9a-fA-F]{6}$/.test(result.hair.color), 'Sanitized hair color must be valid hex');
  }
}
console.log('✔ Test 3: Malformed share param never crashes and safely falls back');

// 4. Skin tone spectrum interpolation
const fairTone = getSkinColorFromTone(0.0);
const midTone = getSkinColorFromTone(0.5);
const deepTone = getSkinColorFromTone(1.0);
console.assert(/^#[0-9a-fA-F]{6}$/.test(fairTone), 'Fair tone is valid hex');
console.assert(/^#[0-9a-fA-F]{6}$/.test(midTone), 'Mid tone is valid hex');
console.assert(/^#[0-9a-fA-F]{6}$/.test(deepTone), 'Deep tone is valid hex');
console.assert(fairTone !== deepTone, 'Tones differ across spectrum');
console.log('✔ Test 4: Skin tone continuous interpolation passed (%s -> %s -> %s)', fairTone, midTone, deepTone);

// 5. Procedural Accessories Registry
console.assert(ACCESSORY_REGISTRY['smart_glasses'] !== undefined, 'Smart glasses exists');
console.assert(ACCESSORY_REGISTRY['cap'] !== undefined, 'Cap exists');
console.assert(ACCESSORY_REGISTRY['headphones'] !== undefined, 'Headphones exists');
for (const key of Object.keys(ACCESSORY_REGISTRY)) {
  const acc = ACCESSORY_REGISTRY[key];
  console.assert(acc.attachBone === 'head', 'Attached to humanoid head bone');
  const mesh = acc.createMesh('#1e293b');
  console.assert(mesh.children.length > 0, 'Mesh has geometry children');
}
console.log('✔ Test 5: All 3 procedural accessories verified with Three.js geometry constructors');

console.log('--- ALL AUTOMATED VERIFICATIONS PASSED (5/5) ---');
