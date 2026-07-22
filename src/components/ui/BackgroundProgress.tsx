import { useMemo } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'
import { useSceneStore } from '@/store/sceneStore'
import { cn } from '@/lib/utils'

// Post-skip background progress indicator. After the user hits SKIP on the
// loading screen, remaining tiles keep downloading and parsing in the
// background. This component tucks a small amber "^" chevron in the top-left
// corner; clicking it drops down a Metro panel listing every tile still in
// flight with its own progress bar. It disappears entirely once all tiles are
// ready, so the corner stays clean when loading is done.
export function BackgroundProgress() {
  const skipped = useSceneStore((s) => s.skipped)
  const bgPanelOpen = useSceneStore((s) => s.bgPanelOpen)
  const toggleBgPanel = useSceneStore((s) => s.toggleBgPanel)
  const tileProgress = useSceneStore((s) => s.tileProgress)

  const remaining = useMemo(
    () =>
      Object.entries(tileProgress)
        .filter(([, p]) => p.status !== 'ready')
        .sort((a, b) => a[0].localeCompare(b[0])),
    [tileProgress],
  )

  const overall = useMemo(() => {
    let received = 0
    let bytes = 0
    for (const p of Object.values(tileProgress)) {
      received += p.received
      bytes += p.total
    }
    return bytes > 0 ? Math.min(100, Math.round((received / bytes) * 100)) : 0
  }, [tileProgress])

  // Only relevant after the user skipped. Once nothing remains, hide entirely.
  if (!skipped || remaining.length === 0) return null

  return (
    <div className="absolute left-2 top-20 z-40 animate-metro-fade">
      {bgPanelOpen ? (
        <div className="metro-tile w-72 p-3">
          {/* Header — title + collapse chevron */}
          <div className="flex items-center justify-between">
            <div className="font-mono text-[10px] uppercase tracking-metro text-fog">
              BACKGROUND · {overall}%
            </div>
            <button
              onClick={toggleBgPanel}
              className="flex h-5 w-5 items-center justify-center text-amber transition-colors hover:text-amber-soft"
              aria-label="Collapse background progress"
            >
              <ChevronUp size={14} strokeWidth={2.4} />
            </button>
          </div>

          {/* Remaining tiles list */}
          <div className="mt-3 space-y-2">
            {remaining.map(([name, p]) => {
              const tp = p.total > 0 ? Math.min(100, Math.round((p.received / p.total) * 100)) : 0
              return (
                <div key={name}>
                  <div className="flex items-center justify-between font-mono text-[9px] uppercase tracking-metro text-fog/70">
                    <span className="truncate">{name.replace('Tile_', '')}</span>
                    <span className="tabular-nums text-fog">
                      {p.status === 'parsing' ? 'PARSING' : p.status === 'downloaded' ? 'QUEUED' : `${tp}%`}
                    </span>
                  </div>
                  <div className="mt-1 h-[3px] w-full bg-ink-700">
                    <div
                      className={cn(
                        'h-full transition-[width] duration-200 ease-out',
                        p.status === 'parsing' ? 'bg-amber-soft' : 'bg-amber',
                      )}
                      style={{ width: `${p.status === 'parsing' ? 100 : tp}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        // Collapsed — a single small "^" chevron. The amber dot signals that
        // background work is still in progress.
        <button
          onClick={toggleBgPanel}
          className="metro-tile flex h-7 items-center gap-1.5 px-2 font-mono text-[9px] uppercase tracking-metro text-fog transition-colors hover:bg-ink-700"
          aria-label="Show background tile download progress"
        >
          <ChevronDown size={12} strokeWidth={2.4} className="text-amber" />
          <span className="tabular-nums text-amber">{remaining.length}</span>
        </button>
      )}
    </div>
  )
}
