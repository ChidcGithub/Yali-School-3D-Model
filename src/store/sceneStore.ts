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

  // Atmosphere / UI
  atmosphere: Atmosphere
  showHints: boolean
  fps: number

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
  setAtmosphere: (a: Atmosphere) => void
  toggleAtmosphere: () => void
  dismissHints: () => void
  setFps: (f: number) => void
}

export const useSceneStore = create<SceneState>((set) => ({
  tileProgress: {},
  totalTiles: 0,
  isLoaded: false,
  skipped: false,
  bgPanelOpen: false,
  loadError: null,

  atmosphere: 'day',
  showHints: true,
  fps: 0,

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

  setAtmosphere: (a) => set({ atmosphere: a }),
  toggleAtmosphere: () => set((s) => ({ atmosphere: s.atmosphere === 'day' ? 'dusk' : 'day' })),
  dismissHints: () => set({ showHints: false }),
  setFps: (f) => set({ fps: f }),
}))
