import { Play, Pause, Square, Compass, ChevronLeft, ChevronRight } from 'lucide-react'
import { useSceneStore } from '@/store/sceneStore'
import { cn } from '@/lib/utils'

export function TourPanel() {
  const viewpoints = useSceneStore((s) => s.viewpoints)
  const activeId = useSceneStore((s) => s.activeViewpointId)
  const isTouring = useSceneStore((s) => s.isTouring)
  const tourPaused = useSceneStore((s) => s.tourPaused)
  const tourIndex = useSceneStore((s) => s.tourIndex)
  const panelOpen = useSceneStore((s) => s.panelOpen)
  const togglePanel = useSceneStore((s) => s.togglePanel)
  const pickViewpoint = useSceneStore((s) => s.pickViewpoint)
  const startTour = useSceneStore((s) => s.startTour)
  const pauseTour = useSceneStore((s) => s.pauseTour)
  const resumeTour = useSceneStore((s) => s.resumeTour)
  const stopTour = useSceneStore((s) => s.stopTour)

  const disabled = viewpoints.length === 0

  return (
    <>
      {/* Collapse toggle */}
      <button
        onClick={togglePanel}
        className={cn(
          'absolute z-30 flex h-12 items-center gap-1 border border-fog/20 bg-ink-900/80 px-2 font-mono text-[9px] tracking-widest text-fog/80 backdrop-blur transition-colors hover:border-amber hover:text-amber',
          'left-3 top-1/2 -translate-y-1/2 flex-col justify-center rounded-sm',
        )}
        aria-label={panelOpen ? '收起导览面板' : '展开导览面板'}
      >
        {panelOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
        <span className="[writing-mode:vertical-rl]">TOUR</span>
      </button>

      <aside
        className={cn(
          'absolute z-20 left-3 top-20 bottom-24 w-64 transition-transform duration-500',
          panelOpen ? 'translate-x-0' : '-translate-x-[110%]',
        )}
      >
        <div className="glass flex h-full flex-col rounded-sm">
          {/* header */}
          <div className="flex items-center justify-between border-b border-fog/10 px-4 py-3">
            <div className="flex items-center gap-2">
              <Compass size={14} className="text-amber" />
              <span className="font-display text-base tracking-wide">导览视角</span>
            </div>
            <span className="font-mono text-[9px] text-fog/50">{viewpoints.length} PTS</span>
          </div>

          {/* viewpoint list */}
          <div className="scroll-thin flex-1 overflow-y-auto px-2 py-2">
            {viewpoints.map((vp, i) => {
              const active = vp.id === activeId
              return (
                <button
                  key={vp.id}
                  onClick={() => pickViewpoint(vp.id)}
                  className={cn(
                    'group relative flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors',
                    active ? 'bg-amber/10' : 'hover:bg-ink-700/50',
                  )}
                >
                  <span
                    className={cn(
                      'mt-0.5 font-mono text-[10px] tabular-nums',
                      active ? 'text-amber' : 'text-fog/40',
                    )}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="flex-1">
                    <span
                      className={cn(
                        'block font-display text-[15px] leading-tight',
                        active ? 'text-amber' : 'text-ink-50',
                      )}
                    >
                      {vp.name}
                    </span>
                    <span className="mt-0.5 block font-mono text-[9px] leading-snug text-fog/55">
                      {vp.description}
                    </span>
                  </span>
                  {active && (
                    <span className="absolute left-0 top-0 h-full w-0.5 bg-amber" />
                  )}
                </button>
              )
            })}
            {viewpoints.length === 0 && (
              <div className="px-3 py-6 font-mono text-[10px] text-fog/40">
                模型加载完成后生成视角…
              </div>
            )}
          </div>

          {/* tour controls */}
          <div className="border-t border-fog/10 p-3">
            {!isTouring ? (
              <button
                onClick={startTour}
                disabled={disabled}
                className={cn(
                  'flex w-full items-center justify-center gap-2 border px-3 py-2.5 font-mono text-[10px] tracking-widest transition-colors',
                  disabled
                    ? 'cursor-not-allowed border-fog/10 text-fog/30'
                    : 'border-amber/50 text-amber hover:bg-amber hover:text-ink-950',
                )}
              >
                <Play size={13} /> 开始自动巡游
              </button>
            ) : (
              <div className="flex items-center gap-2">
                {tourPaused ? (
                  <button
                    onClick={resumeTour}
                    className="flex flex-1 items-center justify-center gap-2 border border-amber/50 px-3 py-2.5 font-mono text-[10px] tracking-widest text-amber hover:bg-amber hover:text-ink-950"
                  >
                    <Play size={13} /> 继续
                  </button>
                ) : (
                  <button
                    onClick={pauseTour}
                    className="flex flex-1 items-center justify-center gap-2 border border-fog/30 px-3 py-2.5 font-mono text-[10px] tracking-widest text-fog/80 hover:border-amber hover:text-amber"
                  >
                    <Pause size={13} /> 暂停
                  </button>
                )}
                <button
                  onClick={stopTour}
                  className="flex items-center justify-center border border-fog/30 px-3 py-2.5 text-fog/70 hover:border-red-400/70 hover:text-red-400"
                  aria-label="退出巡游"
                >
                  <Square size={13} />
                </button>
              </div>
            )}
            {isTouring && (
              <div className="mt-2 flex items-center justify-between font-mono text-[9px] text-fog/50">
                <span>巡游中</span>
                <span className="tabular-nums">
                  {tourIndex + 1} / {viewpoints.length}
                </span>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}
