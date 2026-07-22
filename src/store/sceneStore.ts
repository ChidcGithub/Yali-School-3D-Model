import { create } from 'zustand'
import type { Viewpoint } from '@/three/viewpoints'

export type Atmosphere = 'day' | 'dusk'

interface SceneState {
  loadingProgress: number
  loadedTiles: number
  totalTiles: number
  isLoaded: boolean
  loadError: string | null

  viewpoints: Viewpoint[]
  activeViewpointId: string | null

  isTouring: boolean
  tourPaused: boolean
  tourIndex: number

  atmosphere: Atmosphere
  showHints: boolean
  fps: number
  panelOpen: boolean

  // actions
  setProgress: (loaded: number, total: number) => void
  setLoaded: (viewpoints: Viewpoint[]) => void
  setLoadError: (msg: string) => void
  selectViewpoint: (id: string | null) => void
  pickViewpoint: (id: string) => void
  startTour: () => void
  pauseTour: () => void
  resumeTour: () => void
  stopTour: () => void
  nextTourIndex: () => void
  setTourIndex: (i: number) => void
  setAtmosphere: (a: Atmosphere) => void
  toggleAtmosphere: () => void
  dismissHints: () => void
  setFps: (f: number) => void
  togglePanel: () => void
}

export const useSceneStore = create<SceneState>((set, get) => ({
  loadingProgress: 0,
  loadedTiles: 0,
  totalTiles: 0,
  isLoaded: false,
  loadError: null,

  viewpoints: [],
  activeViewpointId: null,

  isTouring: false,
  tourPaused: false,
  tourIndex: 0,

  atmosphere: 'day',
  showHints: true,
  fps: 0,
  panelOpen: true,

  setProgress: (loaded, total) =>
    set({ loadedTiles: loaded, totalTiles: total, loadingProgress: total ? (loaded / total) * 100 : 0 }),

  setLoaded: (viewpoints) => set({ viewpoints, isLoaded: true }),

  setLoadError: (msg) => set({ loadError: msg }),

  selectViewpoint: (id) => set({ activeViewpointId: id }),

  pickViewpoint: (id) =>
    set({ isTouring: false, tourPaused: false, activeViewpointId: id }),

  startTour: () => {
    const { viewpoints } = get()
    if (viewpoints.length === 0) return
    set({
      isTouring: true,
      tourPaused: false,
      tourIndex: 0,
      activeViewpointId: viewpoints[0].id,
    })
  },

  pauseTour: () => set({ tourPaused: true }),
  resumeTour: () => set({ tourPaused: false }),

  stopTour: () => set({ isTouring: false, tourPaused: false }),

  nextTourIndex: () => {
    const { viewpoints, tourIndex, isTouring, tourPaused } = get()
    if (!isTouring || tourPaused || viewpoints.length === 0) return
    const next = (tourIndex + 1) % viewpoints.length
    set({ tourIndex: next, activeViewpointId: viewpoints[next].id })
  },

  setTourIndex: (i) => set({ tourIndex: i }),

  setAtmosphere: (a) => set({ atmosphere: a }),
  toggleAtmosphere: () => set((s) => ({ atmosphere: s.atmosphere === 'day' ? 'dusk' : 'day' })),

  dismissHints: () => set({ showHints: false }),

  setFps: (f) => set({ fps: f }),

  togglePanel: () => set((s) => ({ panelOpen: !s.panelOpen })),
}))
