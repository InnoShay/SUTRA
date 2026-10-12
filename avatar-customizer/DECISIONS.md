# Technical Decisions Log (DECISIONS.md)

This log documents every architectural, dependency, and technical decision made during the development of the 3D Avatar Customizer, in accordance with the project constraints.

---

### Decision 1: Project Location and Architecture
- **Decision**: Scaffolded as a self-contained Next.js (App Router) project inside `avatar-customizer/`.
- **Rationale**: The root repository contains an active FastAPI backend in `app/` and root documentation. Isolating the 3D customizer inside `avatar-customizer/` prevents filesystem collisions with Python files and enables standalone deployment to Vercel, Cloudflare Pages, or Netlify, while remaining easily embeddable into parent websites via the reusable `<AvatarViewer />` component.
- **Cost / Lock-in**: $0 total cost, zero external cloud dependencies.

---

### Decision 2: Dependency Versions & Peer Dependency Resolution
- **Decision**: Standardized on:
  - `next`: `14.2.15`
  - `react`: `^18.3.1`, `react-dom`: `^18.3.1`
  - `three`: `^0.169.0`
  - `@react-three/fiber`: `8.17.14`
  - `@react-three/drei`: `9.122.0`
  - `@pixiv/three-vrm`: `^3.3.6`
  - `zustand`: `^5.0.3`
- **Rationale**:
  - `npm view @react-three/fiber@9 peerDependencies` requires `react@^19`. React 19 is still in rollout with several breaking changes in Three.js bindings.
  - Setting `@react-three/fiber@8.17.14` + `@react-three/drei@9.122.0` with `react@^18.3.1` and `three@0.169` provides a production-grade, rock-solid WebGL stack with 100% peer dependency satisfaction.
  - `@pixiv/three-vrm@^3.3.6` supports Three.js `>=0.137` and cleanly parses both VRM0 and VRM1 models.
  - `zustand@^5.0.3` provides lightweight, fast state management with built-in `persist` middleware for zero-latency local state autosaving.

---

### Decision 3: Zero Vendor Lock-in & No External Services
- **Decision**: All asset loading, procedural mesh generation, and animation loops run completely client-side in the user's browser.
- **Rationale**: Hosted avatar services (such as Ready Player Me) have experienced platform closures and commercial license restrictions. Using `@pixiv/three-vrm` directly with open standards (`.vrm`, `.glb`) ensures that the user owns 100% of their pipeline forever without paying API fees or risking unexpected deprecations.

---

### Decision 4: Missing Base Model & Isolated Procedural Humanoid
- **Decision**: If `public/models/base.vrm` is missing or fails to load, the app automatically switches to an isolated procedural humanoid implemented in `lib/vrm/placeholder.ts`.
- **Rationale**:
  - Prevents fatal crashes on initial clone or download before the user supplies their model.
  - Creates procedural capsules/spheres for head, eyes, torso, arms, hands, legs, and feet.
  - Exposes standardized humanoid bone nodes (`head`, `leftUpperArm`, `rightUpperArm`, etc.) so expressions, poses, accessory attachments, and color customizations visibly work on the placeholder.
  - Displays a dismissible top banner: *"Add public/models/base.vrm (export from VRoid Studio) to see your real avatar."*
  - The placeholder logic is strictly quarantined in `lib/vrm/placeholder.ts` so it can be removed easily if ever desired.

---

### Decision 5: Procedural Built-In Accessories
- **Decision**: Built 3 procedural accessories (`smart_glasses`, `cap`, `headphones`) entirely from Three.js primitives (`CylinderGeometry`, `SphereGeometry`, `TorusGeometry`, `BoxGeometry`) in `lib/accessories.ts`.
- **Rationale**:
  - Ensures the app has working, customizable accessories out of the box with zero external file dependencies or asset licensing liabilities.
  - Automatically attaches accessories to the humanoid `head` bone with dynamic color synchronization.

---

### Decision 6: Runtime Material & Mesh Introspection (`lib/vrm/materialMap.ts`)
- **Decision**: Dynamically inspects the loaded VRM hierarchy at runtime and matches meshes and materials using case-insensitive regex patterns (`hair`, `skin|body|face`, `eye|iris`, `cloth|tops|bottoms|shoes`).
- **Rationale**:
  - Different VRM export tools (VRoid Studio v0.x vs v1.x, Blender VRM addons) assign varying material names.
  - Safe fallback: If a category has no matching materials, the corresponding control in the customizer UI is disabled with an explanatory tooltip rather than crashing.
  - Includes a developer helper `debugListVrmElements(vrm)` to log the full material and mesh catalog to the browser console.

---

### Decision 7: Pure Procedural Idle Animation (No Mixamo / External Motion)
- **Decision**: Built a procedural idle loop in `lib/vrm/idle.ts` controlling:
  - Sinusoidal spine/chest breathing.
  - Normalized humanoid upper-arm rotation out of T-pose into a natural relaxed posture.
  - Random blinking via VRM expression manager (`blink` target).
  - Gentle natural head sway.
  - Respects the user's `prefers-reduced-motion` media query to disable sway when requested.
- **Rationale**: Mixamo animations carry licensing questions and file overhead. Mathematical procedural animation is 0 KB, silky smooth 60fps, and has zero external dependencies.

---

### Decision 8: Memory Management & Leak Prevention
- **Decision**: Created `lib/vrm/dispose.ts` to recursively traverse geometries, materials, and textures and call `.dispose()`, along with `VRMUtils.deepDispose(vrm.scene)`.
- **Rationale**: In WebGL single-page applications, repeatedly switching models or navigating between routes can lead to GPU context memory exhaustion. Strict disposal on unmount and model replacement guarantees memory stability.

---

### Decision 9: Compact Share Link Encoding
- **Decision**: Encodes avatar configuration as URL-safe base64 (`base64url` JSON string in `?avatar=` query parameter) with handwritten schema validation.
- **Rationale**: Avoids bloated URL query strings, requires no backend database or external URL shortener, and remains fully functional on static hosting. A malformed or tampered query parameter falls back gracefully to default configuration without throwing errors.

---

### Decision 10: Verification & Quality Assurance Results
- **TypeScript**: `npx tsc --noEmit` passed with 0 errors (`strict: true`).
- **ESLint**: `npm run lint` passed with 0 warnings or errors (`✔ No ESLint warnings or errors`).
- **Build**: `npm run build` compiled 5/5 static pages with optimized production bundles.
- **Licenses Audit**: 100% of dependencies verified under permissive MIT, ISC, or Apache-2.0 licenses (`ASSETS_LICENSES.md`). Zero proprietary assets or APIs.

