# 3D Avatar Models Directory

## `base.vrm`
Place your primary 3D humanoid avatar file here:
```
public/models/base.vrm
```

### How to Create & Export `base.vrm` in VRoid Studio
1. Download **VRoid Studio** (Free for Windows & macOS) from [vroid.com/en/studio](https://vroid.com/en/studio).
2. Create your avatar character or customize one of the pre-built sample models (hair, face, clothing, proportions).
3. Click **Export** (top right) -> **Export as VRM**.
4. Choose **VRM 0.0** or **VRM 1.0** (both are supported by BitVRM via `@pixiv/three-vrm`).
5. Fill in the title and author name. (Important: check your export license settings if using for commercial projects).
6. Save the exported `.vrm` file as `base.vrm` into this folder:
   `public/models/base.vrm`
7. Refresh BitVRM in your browser — your real custom 3D avatar will load automatically!

---

## Procedural Humanoid Fallback
If `base.vrm` is missing, BitVRM will **never crash**. Instead, it automatically renders an isolated procedural humanoid avatar built with Three.js primitives (`lib/vrm/placeholder.ts`). All hair, skin, eye, outfit, expression, pose, and accessory controls will work in real time on this procedural avatar.

---

## Custom Modular Parts (`public/models/parts/`)
Optional pre-baked GLB accessories can be placed in subdirectories:
- `public/models/parts/hat/<id>.glb`
- `public/models/parts/glasses/<id>.glb`
- `public/models/parts/audio/<id>.glb`
