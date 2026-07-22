import { Sun, Moon, Mountain } from 'lucide-react'
import { useSceneStore } from '@/store/sceneStore'
import { cn } from '@/lib/utils'

export function TopBar() {
  const atmosphere = useSceneStore((s) => s.atmosphere)
  const toggleAtmosphere = useSceneStore((s) => s.toggleAtmosphere)
  const fps = useSceneStore((s) => s.fps)
  const loaded = useSceneStore((s) => s.loadedTiles)

  return (
    <div className="pointer-events-none absolute left-0 right-0 top-0 z-30 flex items-center justify-between px-5 py-4">
      {/* Brand */}
      <div className="pointer-events-auto flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center border border-amber/40">
          <Mountain size={15} className="text-amber" />
        </div>
        <div className="leading-none">
          <div className="font-display text-lg tracking-wide">
            YALI <span className="text-amber">·</span> CAMPUS 3D
          </div>
          <div className="font-mono text-[9px] tracking-widest text-fog/60">
            PHOTOGRAMMETRY / 18 TILES / ENU 28.17°N 112.98°E
          </div>
        </div>
      </div>

      {/* Right cluster */}
      <div className="pointer-events-auto flex items-center gap-3">
        <div className="hidden items-center gap-3 font-mono text-[10px] text-fog/70 sm:flex">
          <span className="tabular-nums">{fps} FPS</span>
          <span className="text-fog/30">|</span>
          <span className="tabular-nums">{loaded} TILES</span>
        </div>
        <button
          onClick={toggleAtmosphere}
          className={cn(
            'flex items-center gap-2 border px-3 py-1.5 font-mono text-[10px] tracking-widest transition-colors',
            'border-fog/20 text-fog/80 hover:border-amber hover:text-amber',
          )}
        >
          {atmosphere === 'day' ? <Sun size={13} /> : <Moon size={13} />}
          {atmosphere === 'day' ? 'DAY' : 'DUSK'}
        </button>
      </div>
    </div>
  )
}
