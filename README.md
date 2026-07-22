# YALI · CAMPUS 3D

A browser-based 3D tour of the Yali Middle School campus, built on photogrammetry reconstruction tiles. Explore the campus freely, jump between curated viewpoints, or let the auto-tour fly you through the grounds — no plugins required.

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)
![three.js](https://img.shields.io/badge/three.js-0.169-000000?logo=three.js&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-38BDF8?logo=tailwindcss&logoColor=white)

---

## Features

- **Browser-native 3D** — Renders 18 photogrammetry OBJ tiles with PBR-ish materials in a WebGL2 canvas via React Three Fiber.
- **Curated viewpoints** — 6 named bookmarks (e.g. *东曦初照*, *悬视中庭*, *西岭衔霞*) generated dynamically from the model's bounding box.
- **Auto-tour** — One-click cinematic fly-through across all viewpoints with pause / resume / exit, lingering 1.8s at each stop.
- **Atmosphere switch** — Toggle between `day` and `dusk` lighting moods.
- **Resilient loader** — Serial download→parse queue with capped exponential-backoff retries and a recovery pass so a single aborted fetch never cascades.
- **Performance-aware** — Frustum culling per tile, DPR clamped to 2, live FPS meter, target 60 fps desktop / 30 fps mobile.
- **"Survey archive" aesthetic** — Deep charcoal backdrop with a single amber accent, glassmorphic overlays, serif + monospaced typography.

## Tech Stack

| Layer | Choice |
|------|--------|
| Framework | React 18 + TypeScript + Vite 6 |
| 3D | three 0.169 · @react-three/fiber · @react-three/drei · @react-three/postprocessing |
| State | Zustand |
| Styling | Tailwind CSS 3 |
| Icons | lucide-react |
| Backend | None — pure static assets |

## Project Structure

```
Models/OBJ/Data/            # 18 photogrammetry tiles (*.obj + *.mtl + *.jpg)
public/Models               # directory junction -> ../Models (served by Vite publicDir)
src/
├── components/
│   ├── scene/              # CampusScene, TileModels, CameraRig, Lighting, SkyDome, FpsMeter
│   └── ui/                 # TopBar, TourPanel, InfoCard, ControlHints, LoadingScreen
├── pages/Home.tsx          # single page: 3D viewport + UI overlays + loading screen
├── store/sceneStore.ts     # Zustand store (load progress / tour / atmosphere / fps)
├── three/
│   ├── tiles.ts            # MTL+OBJ loader, serial queue with retries
│   └── viewpoints.ts       # 6 viewpoints generated from bounding box
└── App.tsx
```

## Getting Started

### Prerequisites

- Node.js 18+
- The `public/Models` junction must point at the project-root `Models/` folder. Create it once:

```powershell
New-Item -ItemType Junction -Path public\Models -Target Models
```

### Install & Run

```bash
npm install
npm run dev      # start Vite dev server
npm run build    # type-check + production build
npm run preview  # preview the production build
npm run check    # tsc --noEmit type-check only
```

## 3D Model Data

Photogrammetry output lives under `Models/OBJ/Data/<Tile>/` and is served verbatim by Vite's public-dir handler through the `public/Models` junction. Keeping the original tile structure intact means the frontend loads resources via plain relative paths (`/Models/OBJ/Data/<Tile>/<Tile>.obj`).

The 18 tiles:

```
Tile_+000_+001  Tile_+000_+002  Tile_+000_+003
Tile_+001_+000  Tile_+001_+001  Tile_+001_+002  Tile_+001_+003  Tile_+001_+004
Tile_+002_+000  Tile_+002_+001  Tile_+002_+002  Tile_+002_+003  Tile_+002_+004
Tile_+003_+000  Tile_+003_+001  Tile_+003_+002  Tile_+003_+003  Tile_+003_+004
```

## Loading Strategy

- **Serial queue (concurrency = 1)** — `OBJLoader` parses each large OBJ synchronously on the main thread. With concurrency > 1, a parse blocks the main thread and starves/aborts in-flight sibling fetches (`net::ERR_ABORTED`). Serial download→parse guarantees no fetch is in flight during a parse.
- **Retry with backoff** — Each tile download is wrapped with capped exponential backoff + jitter (5 retries, 500ms base). `fetch` uses `cache: 'no-store'` to bypass dev-server `304` revalidation paths that interact badly with three's `FileLoader` under load.
- **Recovery pass** — Tiles that still fail after the first pass get a second quiet pass once connections are idle; most aborts succeed here.
- **Non-fatal partial loads** — A failed tile is logged but does not block the rest from rendering.

### Coordinate Alignment

OBJ vertices are in ENU meters (X ≈ 200–600, Y ≈ 295–800, Z ≈ 24–52) with **Z-up**. After assembly:

1. Rotate the whole group by `-π/2` around X so height maps to three.js **Y-up**.
2. Compute the bounding box, then translate so the campus center sits at the origin and the ground drops to `y = 0`.
3. `OrbitControls` targets the origin; viewpoints are derived from the centered box.

## Viewpoints & Auto-Tour

Six viewpoints are generated from the centered bounding box by azimuth / elevation / distance factors, ordered into a pleasing tour sequence:

| id | name | description |
|----|------|-------------|
| `aerial` | 低空巡影 | Low-angle glide from the southeast. |
| `east` | 东曦初照 | Morning light over the teaching block. |
| `south` | 南庭远眺 | Southward view of the field and courts. |
| `overhead` | 悬视中庭 | Top-down over the campus center. |
| `west` | 西岭衔霞 | Dusk silhouette along the west edge. |
| `north` | 北望学宫 | Northward view of the main building group. |

Camera transitions use `easeInOutCubic` over 2.6s; the tour lingers 1.8s at each stop before advancing.

## UI Design

- **Palette** — charcoal `#0E0F13` background, amber `#E8A33D` single accent, fog gray `#A8A8AE` secondary text, slate `#3A3D44` panels.
- **Typography** — `Cormorant Garamond` for titles (serif, archival), `JetBrains Mono` for UI (monospaced, technical).
- **Layout** — full-bleed 3D canvas with edge-anchored glassmorphic overlays; nothing invades the central viewport.
- **Responsive** — desktop-first (1280px+); tablet collapses the side panel into a drawer; mobile moves panels to a bottom drawer and hides the FPS meter.

## Performance & Compatibility

- **Frustum culling** — every tile mesh has `frustumCulled = true`; three.js skips off-screen tiles automatically.
- **DPR clamp** — `dpr` capped at `Math.min(devicePixelRatio, 2)` to avoid mobile oversampling.
- **Keep-alive tuning** — a custom `tameKeepAlive` Vite plugin widens the dev server's keep-alive window so the browser never races a connection reuse against a closing socket (a major source of `net::ERR_ABORTED` on large OBJ/texture streams).
- **Targets** — 60 fps on desktop, 30 fps on mobile; ~30–50k vertices total across all tiles.
- **Browsers** — any WebGL2-capable browser from the past 2 years (Chrome / Edge / Firefox / Safari).

## License

Project-specific. Model data © its respective photogrammetry source.
