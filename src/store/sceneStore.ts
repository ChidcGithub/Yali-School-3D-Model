import { create } from 'zustand'

export type Atmosphere = 'day' | 'dusk'

interface SceneState {
  loadingProgress: number
  loadedTiles: number
  totalTiles: number
  isLoaded: boolean
  loadError: string | null

  // Currently-downloading tile's byte-level progress (serial loader → one at a time).
  activeTileName: string | null
  activeTileBytes: number
  activeTileTotalBytes: number

  atmosphere: Atmosphere
  showHints: boolean
  fps: number

  // actions
  setProgress: (loaded: number, total: number) => void
  setLoaded: () => void
  setLoadError: (msg: string) => void
  setActiveTile: (name: string | null) => void
  setActiveTileProgress: (received: number, total: number) => void
  setAtmosphere: (a: Atmosphere) => void
  toggleAtmosphere: () => void
  dismissHints: () => void
  setFps: (f: number) => void
}

export const useSceneStore = create<SceneState>((set) => ({
  loadingProgress: 0,
  loadedTiles: 0,
  totalTiles: 0,
  isLoaded: false,
  loadError: null,

  activeTileName: null,
  activeTileBytes: 0,
  activeTileTotalBytes: 0,

  atmosphere: 'day',
  showHints: true,
  fps: 0,

  setProgress: (loaded, total) =>
    set({ loadedTiles: loaded, totalTiles: total, loadingProgress: total ? (loaded / total) * 100 : 0 }),

  setLoaded: () => set({ isLoaded: true, activeTileName: null }),

  setLoadError: (msg) => set({ loadError: msg }),

  setActiveTile: (name) =>
    set({ activeTileName: name, activeTileBytes: 0, activeTileTotalBytes: 0 }),

  setActiveTileProgress: (received, total) =>
    set({ activeTileBytes: received, activeTileTotalBytes: total }),

  setAtmosphere: (a) => set({ atmosphere: a }),
  toggleAtmosphere: () => set((s) => ({ atmosphere: s.atmosphere === 'day' ? 'dusk' : 'day' })),

  dismissHints: () => set({ showHints: false }),

  setFps: (f) => set({ fps: f }),
}))
