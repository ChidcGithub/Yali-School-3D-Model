import { Sun, Moon } from 'lucide-react'
import { useSceneStore } from '@/store/sceneStore'
import emblemUrl from '@/assets/emblem.png'

export function TopBar() {
  const timeOfDay = useSceneStore((s) => s.timeOfDay)
  const toggleDayNight = useSceneStore((s) => s.toggleDayNight)
  const fps = useSceneStore((s) => s.fps)
  const loaded = useSceneStore((s) => {
    let c = 0
    for (const p of Object.values(s.tileProgress)) if (p.status === 'ready') c++
    return c
  })

  const isNight = timeOfDay < 0.25 || timeOfDay > 0.75
  // Time display: map 0-1 to 24h format
  const hours = Math.floor(timeOfDay * 24)
  const mins = Math.floor((timeOfDay * 24 - hours) * 60)
  const timeStr = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`

  return (
    <div className="pointer-events-none absolute left-0 right-0 top-0 z-30 flex items-stretch justify-between p-2">
      <div className="pointer-events-auto flex items-stretch">
        <div className="metro-tile-accent flex items-center gap-3 px-4 py-3">
          <img src={emblemUrl} alt="YALI" className="h-8 w-8 object-contain" />
          <div className="leading-none">
            <div className="text-[15px] font-semibold uppercase tracking-metro text-white">
              YALI School
            </div>
            <div className="mt-1 font-mono text-[9px] uppercase tracking-metro text-white/70">
              PHOTOGRAMMETRY / 28.17°N 112.98°E
            </div>
          </div>
        </div>
      </div>

      <div className="pointer-events-auto flex items-stretch gap-2">
        <div className="metro-tile hidden items-center gap-4 px-4 font-mono text-[10px] uppercase tracking-metro text-fog sm:flex">
          <span className="tabular-nums text-white">
            {fps} <span className="text-fog/60">FPS</span>
          </span>
          <span className="h-3 w-px bg-ink-600" />
          <span className="tabular-nums text-white">
            {loaded} <span className="text-fog/60">TILES</span>
          </span>
          <span className="h-3 w-px bg-ink-600" />
          <span className="tabular-nums text-amber">{timeStr}</span>
        </div>
        <button
          onClick={toggleDayNight}
          className="metro-tile flex items-center gap-2 px-4 font-mono text-[10px] uppercase tracking-metro text-white transition-colors hover:bg-ink-700"
        >
          {isNight ? <Moon size={14} className="text-amber" /> : <Sun size={14} className="text-amber" />}
          {isNight ? 'NIGHT' : 'DAY'}
        </button>
      </div>
    </div>
  )
}
