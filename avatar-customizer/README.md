# BitVRM — Free, Self-Hosted 3D Avatar Customizer

A $0, 100% self-hosted 3D anime/Bitmoji-style avatar customizer built with Next.js (App Router), TypeScript (strict), Tailwind CSS, Three.js, React Three Fiber, and `@pixiv/three-vrm`.

No paid APIs. No external avatar services. Zero vendor lock-in.

---

## Features

- **Standard VRM 0.0 & 1.0 Support**: Loads any VRM avatar (exported from VRoid Studio) using `@pixiv/three-vrm`.
- **Procedural Humanoid Fallback**: If `public/models/base.vrm` is missing, the engine automatically spins up an isolated procedural humanoid with full bone rigging. Zero crashes guaranteed.
- **Customization Engine**:
  - **Hair**: Color presets, fine hex picker, and mesh variant toggles.
  - **Skin**: Realistic tones from peach to deep espresso + continuous spectrum slider.
  - **Eyes**: Iris color presets and custom color picker.
  - **Outfit**: Primary (top) and secondary (bottom/accent) colors + modular layer toggles.
  - **Accessories**: 3 built-in procedural Three.js accessories (`smart_glasses`, `streetwear cap`, `studio headphones`) attached directly to humanoid bone nodes with individual color controls.
  - **Expressions**: Real-time VRM blendshapes (`neutral`, `happy`, `sad`, `angry`, `surprised`, `relaxed`).
  - **Poses**: Dynamic humanoid bone rotations (`relaxed`, `wave`, `arms_crossed`).
- **Procedural Idle Animation**: Breathing, random natural blinking, and head sway (respects `prefers-reduced-motion` for accessibility).
- **Persistent & Shareable**:
  - Auto-saves avatar state to `localStorage` safely.
  - Compact URL sharing via base64url JSON serialization.
  - Export and Import avatar configs as `.json`.
  - Download high-res 1024x1024 transparent PNG snapshots.
- **Reusable Component**: Embed `<AvatarViewer config={config} />` into any React / Next.js application.

---

## Quick Start

### 1. Installation
Clone the repository and install dependencies:
```bash
cd avatar-customizer
npm install
```

### 2. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

- Landing page: [http://localhost:3000/](http://localhost:3000/)
- Customizer Studio: [http://localhost:3000/create](http://localhost:3000/create)

---

## How to Create & Export `base.vrm` in VRoid Studio

You can customize your avatar in VRoid Studio and load it directly into BitVRM:

1. Download **VRoid Studio** (Free for Windows & macOS) from [vroid.com/en/studio](https://vroid.com/en/studio).
2. Create your character (customize hair strands, face shape, eyes, clothing, and proportions).
3. Click the **Export** button in the top right corner and select **Export as VRM**.
4. In the export dialog:
   - Select **VRM 0.0** or **VRM 1.0** (both are supported).
   - Enter your model's title and author name.
   - Set your preferred licensing options.
5. Save the file directly to:
   ```
   public/models/base.vrm
   ```
6. Reload the customizer — your custom character will render immediately in real 3D!

---

## How to Embed `<AvatarViewer />` in Another Next.js / React Project

The avatar viewer is an isolated, reusable React Three Fiber component.

### Step 1: Copy Components & Libraries
Copy the following folders into your destination project:
```
components/AvatarViewer.tsx
lib/
  avatarConfig.ts
  accessories.ts
  store.ts
  vrm/
    loadVrm.ts
    materialMap.ts
    expressions.ts
    poses.ts
    idle.ts
    placeholder.ts
    dispose.ts
```

### Step 2: Ensure Peer Dependencies
In your destination project `package.json`:
```json
{
  "dependencies": {
    "three": "^0.169.0",
    "@react-three/fiber": "^8.17.14",
    "@react-three/drei": "^9.122.0",
    "@pixiv/three-vrm": "^3.5.5",
    "zustand": "^5.0.3",
    "lucide-react": "^0.453.0"
  }
}
```

### Step 3: Render Anywhere
```tsx
'use client';

import dynamic from 'next/dynamic';
import { DEFAULT_AVATAR_CONFIG } from '@/lib/avatarConfig';

// Import dynamically to ensure SSR-safety
const AvatarViewer = dynamic(
  () => import('@/components/AvatarViewer').then((mod) => mod.AvatarViewer),
  { ssr: false }
);

export default function ProfileAvatarPage() {
  const customConfig = {
    ...DEFAULT_AVATAR_CONFIG,
    hair: { color: '#ec4899' },
    expression: 'happy' as const,
    pose: 'wave' as const,
  };

  return (
    <div className="w-[450px] h-[550px]">
      <AvatarViewer
        config={customConfig}
        modelUrl="/models/base.vrm"
        autoRotate={false}
      />
    </div>
  );
}
```

---

## How to Add New Accessories

To register a new procedural accessory, open `lib/accessories.ts` and add an entry to `ACCESSORY_REGISTRY`:

```typescript
export const ACCESSORY_REGISTRY: Record<string, AccessoryDefinition> = {
  // ... existing accessories
  halo: {
    id: 'halo',
    name: 'Golden Halo',
    category: 'hat',
    attachBone: 'head', // Attaches to VRM humanoid head bone
    description: 'Floating radiant golden ring',
    createMesh: (colorHex: string) => {
      const group = new THREE.Group();
      const torusGeo = new THREE.TorusGeometry(0.12, 0.015, 12, 24);
      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(colorHex),
        emissive: new THREE.Color(colorHex),
        emissiveIntensity: 0.6,
        roughness: 0.2,
      });
      const haloMesh = new THREE.Mesh(torusGeo, mat);
      haloMesh.rotation.x = Math.PI / 2;
      haloMesh.position.set(0, 0.25, 0); // Position above head
      group.add(haloMesh);
      return group;
    },
  },
};
```
The accessory will automatically appear in the **Accessories** tab in the customizer UI.

---

## Deploying for Free

### Deploy on Vercel
1. Push your repository to GitHub or GitLab.
2. Go to [vercel.com](https://vercel.com) and click **Add New Project**.
3. Select your repository.
4. Set Framework Preset: **Next.js**.
5. Set Root Directory: `avatar-customizer` (if in a subfolder) or `./`.
6. Click **Deploy**. BitVRM is static-friendly and requires zero environment variables!

### Deploy on Cloudflare Pages
1. In Cloudflare Dashboard, navigate to **Workers & Pages** -> **Create application** -> **Pages**.
2. Connect your Git repository.
3. Build command: `npm run build`
4. Build output directory: `.next` (or use Cloudflare Next-on-Pages adapter)
5. Deploy.

---

## Verification & Definition of Done

- [x] `npm run build` compiles with zero errors and static pre-rendering.
- [x] Strict TypeScript (`tsc --noEmit`) and ESLint (`npm run lint`) clean with zero warnings.
- [x] Works seamlessly with and without `base.vrm` (procedural humanoid fallback).
- [x] Reusable `<AvatarViewer />` component with OrbitControls and WebGL disposal.
- [x] Tabbed customizer with Hair, Skin, Eyes, Outfit, Accessories, Expressions, and Poses.
- [x] Auto-saving to localStorage, Randomize, Reset, and compact URL sharing via base64url.
- [x] 1024x1024 transparent PNG snapshot downloads.
- [x] 100% clean MIT/ISC/Apache-2.0 dependencies audit documented in `ASSETS_LICENSES.md`.

---

## Known Issues

- None. All features are fully operational, tested against WebGL disposal, and SSR-safe.
