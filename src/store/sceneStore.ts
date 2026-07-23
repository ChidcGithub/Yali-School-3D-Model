import { create } from 'zustand'

export type Atmosphere = 'day' | 'dusk'

// Per-tile state machine. 'downloaded' is the brief window between the text
// fetch finishing and the serial OBJ parser picking it up.
export type TileStatus = 'pending' | 'downloading' | 'downloaded' | 'parsing' | 'ready' | 'error'

export interface TileProgress {
  status: TileStatus
  received: number // bytes downloaded so far
  total: number // Content-Length (0 if unknown / cache hit before measure)
}

interface SceneState {
  // Tile loading — a per-tile progress map drives both the loading screen and
  // the background progress panel. `isLoaded` means the user has entered the
  // page (either all tiles finished OR they hit SKIP); background loading may
  // still continue. `skipped` distinguishes the two paths.
  tileProgress: Record<string, TileProgress>
  totalTiles: number
  isLoaded: boolean
  skipped: boolean
  bgPanelOpen: boolean
  loadError: string | null

  // Download source — a user-supplied GitHub proxy prefix (empty = origin).
  // Changing it bumps reloadKey, which TileModels watches to cancel & restart.
  proxyUrl: string
  reloadKey: number

  // Atmosphere / UI
  atmosphere: Atmosphere
  showHints: boolean
  fps: number
  pixelGranularity: number

  // TEMP: airwall debugging — independent min/max per axis. Once values are
  // found they'll be hardcoded here and the slider + setter removed.
  airwallX: { min: number; max: number }
  airwallY: { min: number; max: number }
  airwallZ: { min: number; max: number }
  // Live camera + target coords for the debug panel.
  camX: number
  camY: number
  camZ: number
  tgtX: number
  tgtY: number
  tgtZ: number

  // View reset — bumping resetKey triggers CameraRig to snap the camera and
  // orbit target back to the canonical initial pose.
  resetKey: number

  // Actions
  initTiles: (names: string[]) => void
  setTileDownloading: (name: string) => void
  setTileDownloaded: (name: string) => void
  setTileParsing: (name: string) => void
  setTileReady: (name: string) => void
  setTileError: (name: string) => void
  // Batched byte-progress update for many tiles at once — called from a single
  // throttled flush loop so 18 concurrent downloads don't flood the store with
  // hundreds of renders per second.
  batchSetProgress: (updates: Record<string, { received: number; total: number }>) => void
  skip: () => void
  toggleBgPanel: () => void
  setLoaded: () => void
  setLoadError: (msg: string) => void
  setProxyUrl: (url: string) => void
  setAtmosphere: (a: Atmosphere) => void
  toggleAtmosphere: () => void
  dismissHints: () => void
  setFps: (f: number) => void
  setAirwall: (axis: 'x' | 'y' | 'z', value: { min: number; max: number }) => void
  setCamDebug: (cam: { x: number; y: number; z: number }, tgt: { x: number; y: number; z: number }) => void
  resetView: () => void
  setPixelGranularity: (g: number) => void
}

export const useSceneStore = create<SceneState>((set) => ({
  tileProgress: {},
  totalTiles: 0,
  isLoaded: false,
  skipped: false,
  bgPanelOpen: false,
  loadError: null,

  proxyUrl: '',
  reloadKey: 0,

  atmosphere: 'day',
  showHints: true,
  fps: 0,
  pixelGranularity: 4,

  airwallX: { min: 180, max: 700 },
  airwallY: { min: 10, max: 2000 },
  airwallZ: { min: -770, max: -260 },
  camX: 0,
  camY: 0,
  camZ: 0,
  tgtX: 0,
  tgtY: 0,
  tgtZ: 0,
  resetKey: 0,

  initTiles: (names) =>
    set(() => {
      const tileProgress: Record<string, TileProgress> = {}
      for (const n of names) tileProgress[n] = { status: 'pending', received: 0, total: 0 }
      return { tileProgress, totalTiles: names.length, isLoaded: false, skipped: false, bgPanelOpen: false }
    }),

  setTileDownloading: (name) =>
    set((s) => {
      const cur = s.tileProgress[name]
      if (!cur) return {}
      return {
        tileProgress: { ...s.tileProgress, [name]: { status: 'downloading', received: 0, total: 0 } },
      }
    }),

  setTileDownloaded: (name) =>
    set((s) => {
      const cur = s.tileProgress[name]
      if (!cur) return {}
      return {
        tileProgress: { ...s.tileProgress, [name]: { ...cur, status: 'downloaded' } },
      }
    }),

  setTileParsing: (name) =>
    set((s) => {
      const cur = s.tileProgress[name]
      if (!cur) return {}
      return { tileProgress: { ...s.tileProgress, [name]: { ...cur, status: 'parsing' } } }
    }),

  setTileReady: (name) =>
    set((s) => {
      const cur = s.tileProgress[name]
      if (!cur) return {}
      return {
        tileProgress: {
          ...s.tileProgress,
          [name]: { status: 'ready', received: cur.total, total: cur.total },
        },
      }
    }),

  setTileError: (name) =>
    set((s) => {
      const cur = s.tileProgress[name]
      if (!cur) return {}
      return { tileProgress: { ...s.tileProgress, [name]: { ...cur, status: 'error' } } }
    }),

  batchSetProgress: (updates) =>
    set((s) => {
      let changed = false
      const next = { ...s.tileProgress }
      for (const [name, p] of Object.entries(updates)) {
        const cur = next[name]
        if (!cur) continue
        next[name] = { ...cur, received: p.received, total: p.total }
        changed = true
      }
      return changed ? { tileProgress: next } : {}
    }),

  skip: () => set({ skipped: true, isLoaded: true }),

  toggleBgPanel: () => set((s) => ({ bgPanelOpen: !s.bgPanelOpen })),

  setLoaded: () => set({ isLoaded: true }),

  setLoadError: (msg) => set({ loadError: msg }),

  // Switching proxy resets the load state and bumps reloadKey so TileModels
  // cancels in-flight work and starts fresh with the new base URL.
  setProxyUrl: (url) =>
    set((s) => ({
      proxyUrl: url,
      reloadKey: s.reloadKey + 1,
      tileProgress: {},
      totalTiles: 0,
      isLoaded: false,
      skipped: false,
      bgPanelOpen: false,
      loadError: null,
    })),

  setAtmosphere: (a) => set({ atmosphere: a }),
  toggleAtmosphere: () => set((s) => ({ atmosphere: s.atmosphere === 'day' ? 'dusk' : 'day' })),
  dismissHints: () => set({ showHints: false }),
  setFps: (f) => set({ fps: f }),

  setAirwall: (axis, value) =>
    set(() => {
      if (axis === 'x') return { airwallX: value }
      if (axis === 'y') return { airwallY: value }
      return { airwallZ: value }
    }),

  setCamDebug: (cam, tgt) =>
    set({
      camX: cam.x,
      camY: cam.y,
      camZ: cam.z,
      tgtX: tgt.x,
      tgtY: tgt.y,
      tgtZ: tgt.z,
    }),

  resetView: () => set((s) => ({ resetKey: s.resetKey + 1 })),
  setPixelGranularity: (g) => set({ pixelGranularity: g }),
}))
