import { useSceneStore } from '@/store/sceneStore'
import { cn } from '@/lib/utils'

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
        'absolute inset-0 z-50 flex flex-col items-center justify-center bg-ink-950 survey-grid transition-opacity duration-700',
        isLoaded ? 'pointer-events-none opacity-0' : 'opacity-100',
      )}
    >
      {/* rotating wireframe marker */}
      <div className="relative mb-10 h-24 w-24">
        <div className="absolute inset-0 animate-spin-slow rounded-full border border-amber/30" />
        <div className="absolute inset-3 animate-spin-slow rounded-full border border-amber/20 [animation-direction:reverse]" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-display text-2xl text-amber">Y</span>
        </div>
      </div>

      <div className="font-display text-3xl tracking-wide text-ink-50 mb-1">
        YALI <span className="text-amber">·</span> CAMPUS 3D
      </div>
      <div className="font-mono text-[10px] tracking-widest text-fog/70 mb-10">
        雅礼中学校园三维重建 · 摄影测量瓦片加载中
      </div>

      {error ? (
        <div className="max-w-md px-6 text-center font-mono text-xs text-red-400">
          加载失败：{error}
        </div>
      ) : (
        <>
          <div className="h-px w-72 bg-ink-700 overflow-hidden">
            <div
              className="h-full bg-amber transition-[width] duration-300 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-3 flex w-72 items-center justify-between font-mono text-[10px] text-fog/70">
            <span>
              {loaded}/{total || 18} TILES
            </span>
            <span className="text-amber">{pct}%</span>
          </div>
        </>
      )}
    </div>
  )
}
