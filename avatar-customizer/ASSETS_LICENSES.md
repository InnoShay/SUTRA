# Asset & Dependency Licenses

This document tracks all 3D assets, procedural geometry, fonts, icons, and software dependencies included in this project, guaranteeing 100% clean, permissive licensing with zero non-permissive or paid assets.

---

## 1. 3D Assets & Procedural Models

| Asset Name | Type / Format | Source | License | Commercial Use Allowed | Notes |
|---|---|---|---|---|---|
| **Procedural Humanoid** | Three.js Procedural Mesh (`placeholder.ts`) | Original, self-made | MIT / CC0 | **YES** | Head, torso, arms, legs, facial features, blendshapes generated in code |
| **Smart Glasses** | Three.js Procedural Mesh (`accessories.ts`) | Original, self-made | MIT / CC0 | **YES** | Torus rims, cylinder lenses, box temple arms |
| **Streetwear Cap** | Three.js Procedural Mesh (`accessories.ts`) | Original, self-made | MIT / CC0 | **YES** | Sphere dome, cylinder visor, button |
| **Studio Headphones**| Three.js Procedural Mesh (`accessories.ts`) | Original, self-made | MIT / CC0 | **YES** | Torus headband, cylinder cups, torus pads |
| **User Avatar** (`public/models/base.vrm`) | Pixiv VRM 0.0 / 1.0 (Optional user model) | User supplied (VRoid Studio) | User Determined | **Verify Before Commercial Use** | See notice below |

> [!IMPORTANT]
> ### User Notice: VRoid Studio Model Licensing
> When you create and export `base.vrm` in **VRoid Studio**, you control your avatar's licensing settings during the export dialog:
> - By default, models created with standard VRoid Studio preset items permit non-commercial and commercial use, but you **MUST verify the license terms** you selected in VRoid Studio before commercial use (especially if you incorporated third-party BOOTH texture packs or accessories).
> - The BitVRM application itself ships with **zero proprietary or copyrighted models** and runs 100% on original procedural assets until you add your own file.

---

## 2. Software Dependencies License Audit

All dependencies were verified via `package.json` license inspections. Every direct and peer dependency is released under standard permissive licenses (**MIT**, **ISC**, or **Apache-2.0**). Zero proprietary or copyleft (GPL/AGPL) dependencies are required.

| Package | Version | License | Commercial Use Permitted |
|---|---|---|---|
| `next` | 14.2.15 | MIT | Yes |
| `react` | 18.3.1 | MIT | Yes |
| `react-dom` | 18.3.1 | MIT | Yes |
| `three` | 0.169.0 | MIT | Yes |
| `@react-three/fiber` | 8.17.14 | MIT | Yes |
| `@react-three/drei` | 9.122.0 | MIT | Yes |
| `@pixiv/three-vrm` | 3.5.5 | MIT | Yes |
| `zustand` | 5.0.15 | MIT | Yes |
| `lucide-react` | 0.453.0 | ISC | Yes |
| `tailwindcss` | 3.4.19 | MIT | Yes |
| `clsx` | 2.1.1 | MIT | Yes |
| `tailwind-merge` | 2.6.1 | MIT | Yes |
| `typescript` | 5.9.3 | Apache-2.0 | Yes |
| `postcss` | 8.5.29 | MIT | Yes |
| `autoprefixer` | 10.6.1 | MIT | Yes |
| `eslint` | 8.57.1 | MIT | Yes |
| `eslint-config-next` | 14.2.15 | MIT | Yes |
| `@types/three` | 0.169.0 | MIT | Yes |
| `@types/react` | 18.3.31 | MIT | Yes |
| `@types/react-dom` | 18.3.7 | MIT | Yes |
| `@types/node` | 20.19.43 | MIT | Yes |

---

## 3. Fonts & Icons

| Resource | Source | License | Commercial Use Allowed |
|---|---|---|---|
| **Inter Font Family** | Google Fonts (`next/font/google`) | SIL Open Font License 1.1 | **YES** |
| **Lucide Icons** | Lucide React | ISC | **YES** |

---

## 4. Certification of Compliance
- [x] No paid APIs, no API keys, no accounts required to run locally.
- [x] No Ready Player Me, Snap, Meta, Bitmoji, or Mixamo proprietary assets.
- [x] Fully self-hosted with no external model server dependencies.
- [x] Permissive open-source stack throughout.
