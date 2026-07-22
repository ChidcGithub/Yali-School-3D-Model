import { Sun, Moon, Mountain } from 'lucide-react'
import { useSceneStore } from '@/store/sceneStore'

// Metro TopBar — a horizontal strip of flat solid tiles separated by 2px black
// gaps. The brand tile carries the amber accent; the rest are dark surface
// tiles. No glass, no border, no shadow — pure Metro.
export function TopBar() {
  const atmosphere = useSceneStore((s) => s.atmosphere)
  const toggleAtmosphere = useSceneStore((s) => s.toggleAtmosphere)
  const fps = useSceneStore((s) => s.fps)
  // Count ready tiles — primitive return so TopBar only re-renders when the
  // count actually changes, not on every byte-progress flush.
  const loaded = useSceneStore((s) => {
    let c = 0
    for (const p of Object.values(s.tileProgress)) if (p.status === 'ready') c++
    return c
  })

  return (
    <div className="pointer-events-none absolute left-0 right-0 top-0 z-30 flex items-stretch justify-between p-2">
      {/* Brand tile (accent) */}
      <div className="pointer-events-auto flex items-stretch">
        <div className="metro-tile-accent flex items-center gap-3 px-4 py-3">
          <Mountain size={18} className="text-black" strokeWidth={2.2} />
          <div className="leading-none">
            <div className="text-[15px] font-semibold uppercase tracking-metro text-black">
              YALI <span className="opacity-60">·</span> CAMPUS 3D
            </div>
            <div className="mt-1 font-mono text-[9px] uppercase tracking-metro text-black/70">
              PHOTOGRAMMETRY / 18 TILES / 28.17°N 112.98°E
            </div>
          </div>
        </div>
      </div>

      {/* Right cluster: stats tile + atmosphere tile */}
      <div className="pointer-events-auto flex items-stretch gap-2">
        <div className="metro-tile hidden items-center gap-4 px-4 font-mono text-[10px] uppercase tracking-metro text-fog sm:flex">
          <span className="tabular-nums text-white">
            {fps} <span className="text-fog/60">FPS</span>
          </span>
          <span className="h-3 w-px bg-ink-600" />
          <span className="tabular-nums text-white">
            {loaded} <span className="text-fog/60">TILES</span>
          </span>
        </div>
        <button
          onClick={toggleAtmosphere}
          className="metro-tile flex items-center gap-2 px-4 font-mono text-[10px] uppercase tracking-metro text-white transition-colors hover:bg-ink-700"
        >
          {atmosphere === 'day' ? <Sun size={14} className="text-amber" /> : <Moon size={14} className="text-amber" />}
          {atmosphere === 'day' ? 'DAY' : 'DUSK'}
        </button>
      </div>
    </div>
  )
}
