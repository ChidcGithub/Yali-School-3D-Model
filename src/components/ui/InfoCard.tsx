import { useSceneStore } from '@/store/sceneStore'
import { cn } from '@/lib/utils'

export function InfoCard() {
  const viewpoints = useSceneStore((s) => s.viewpoints)
  const activeId = useSceneStore((s) => s.activeViewpointId)
  const isLoaded = useSceneStore((s) => s.isLoaded)
  const isTouring = useSceneStore((s) => s.isTouring)

  const vp = viewpoints.find((v) => v.id === activeId)

  return (
    <div className="pointer-events-none absolute bottom-5 left-5 z-20 max-w-xs">
      <div
        className={cn(
          'transition-opacity duration-500',
          isLoaded && vp ? 'opacity-100' : 'opacity-0',
        )}
      >
        <div className="mb-1 flex items-center gap-2 font-mono text-[9px] tracking-widest text-amber/80">
          <span className="inline-block h-1 w-1 bg-amber" />
          {isTouring ? 'AUTO TOUR' : 'VIEWPOINT'}
        </div>
        <div className="font-display text-3xl leading-none text-ink-50">
          {vp?.name ?? ''}
        </div>
        <div className="mt-2 font-mono text-[11px] leading-relaxed text-fog/70 text-balance">
          {vp?.description ?? ''}
        </div>
        {vp && (
          <div className="mt-2 font-mono text-[9px] text-fog/40">
            CAM {vp.position[0].toFixed(0)}, {vp.position[1].toFixed(0)},{' '}
            {vp.position[2].toFixed(0)}
          </div>
        )}
      </div>
    </div>
  )
}
