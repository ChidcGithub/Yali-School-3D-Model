import { useSceneStore } from '@/store/sceneStore'

export function PixelSlider() {
  const granularity = useSceneStore((s) => s.pixelGranularity)
  const setGranularity = useSceneStore((s) => s.setPixelGranularity)

  return (
    <div className="pointer-events-auto fixed right-2 top-20 z-30 flex items-stretch gap-2">
      <div className="metro-tile flex items-center gap-2 px-3 py-2">
        <span className="font-mono text-[10px] uppercase tracking-metro text-fog">
          PX
        </span>
        <input
          type="range"
          min={0}
          max={6}
          step={1}
          value={granularity}
          onChange={(e) => setGranularity(Number(e.target.value))}
          className="h-1 w-20 cursor-pointer appearance-none bg-ink-600 accent-amber"
        />
        <span className="w-3 text-center font-mono text-[10px] tabular-nums text-white">
          {granularity}
        </span>
      </div>
    </div>
  )
}
