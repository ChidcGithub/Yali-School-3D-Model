import { useSceneStore } from '@/store/sceneStore'
import { cn } from '@/lib/utils'

// Metro splash — pure black, a single amber brand tile that pulses, then bold
// uppercase typography and a thin determinate progress bar. Elements rise in
// with a staggered cascade (animation-delay) for a live-tile feel on entry.
export function LoadingScreen() {
  const progress = useSceneStore((s) => s.loadingProgress)
  const loaded = useSceneStore((s) => s.loadedTiles)
  const total = useSceneStore((s) => s.totalTiles)
  const error = useSceneStore((s) => s.loadError)
  const isLoaded = useSceneStore((s) => s.isLoaded)

  const pct = Math.round(progress)

  return (
    <div
      className={cn(
        'absolute inset-0 z-50 flex flex-col items-center justify-center bg-black transition-opacity duration-500',
        isLoaded ? 'pointer-events-none opacity-0' : 'opacity-100',
      )}
    >
      {/* Brand tile — single amber block, pulsing like a live tile. */}
      <div className="animate-metro-rise" style={{ animationDelay: '0ms' }}>
        <div className="metro-tile-accent animate-amber-pulse flex h-28 w-28 items-center justify-center">
          <span className="text-[64px] font-light leading-none text-black">Y</span>
        </div>
      </div>

      {/* Title */}
      <div
        className="animate-metro-rise mt-8 text-center"
        style={{ animationDelay: '80ms' }}
      >
        <div className="text-[32px] font-light uppercase tracking-metro text-white">
          YALI <span className="text-amber">·</span> CAMPUS 3D
        </div>
        <div className="mt-2 font-mono text-[10px] uppercase tracking-metro text-fog">
          YALI MIDDLE SCHOOL CAMPUS 3D RECONSTRUCTION
        </div>
      </div>

      {error ? (
        <div
          className="animate-metro-rise mt-10 max-w-md px-6 text-center font-mono text-xs text-red-400"
          style={{ animationDelay: '160ms' }}
        >
          LOAD FAILED: {error}
        </div>
      ) : (
        <div
          className="animate-metro-rise mt-10 w-80"
          style={{ animationDelay: '160ms' }}
        >
          {/* Thin determinate progress bar — amber on a dark surface tile. */}
          <div className="h-1 w-full bg-ink-700">
            <div
              className="h-full bg-amber transition-[width] duration-300 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-3 flex items-center justify-between font-mono text-[10px] uppercase tracking-metro text-fog">
            <span className="tabular-nums">
              {loaded} / {total || 18} <span className="text-fog/60">TILES</span>
            </span>
            <span className="tabular-nums text-amber">{pct}%</span>
          </div>
        </div>
      )}
    </div>
  )
}
