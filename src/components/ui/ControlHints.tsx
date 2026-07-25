import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { useSceneStore } from '@/store/sceneStore'

// Metro ControlHints — a header accent tile stacked above flat surface tiles,
// each row pairing a flat amber key cap with a white label. No glass, no border.
export function ControlHints() {
  const showHints = useSceneStore((s) => s.showHints)
  const dismissHints = useSceneStore((s) => s.dismissHints)
  const isLoaded = useSceneStore((s) => s.isLoaded)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    if (!showHints || !isLoaded) return
    const t = setTimeout(() => dismissHints(), 9000)
    return () => clearTimeout(t)
  }, [showHints, isLoaded, dismissHints])

  if (!showHints) return null

  const rows: { keys: string[]; desc: string }[] = [
    { keys: ['W', 'S'], desc: 'FORWARD / BACK' },
    { keys: ['A', 'D'], desc: 'STRAFE LEFT / RIGHT' },
    { keys: ['Q', 'E'], desc: 'DOWN / UP' },
    { keys: ['SHIFT'], desc: '2× SPEED' },
    { keys: ['DRAG'], desc: 'ORBIT / PAN' },
    { keys: ['WHEEL'], desc: 'ZOOM' },
  ]

  return (
    <div className="absolute bottom-2 right-2 z-20 w-64">
      {/* Header tile (accent) */}
      <div className="metro-tile-accent flex items-center justify-between px-4 py-2.5">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-metro text-black">
          CONTROLS
        </span>
        <button
          onClick={dismissHints}
          className="text-black/70 transition-colors hover:text-black"
          aria-label="Dismiss hints"
        >
          <X size={13} />
        </button>
      </div>

      {/* Body tiles */}
      {!collapsed && (
        <div className="mt-0.5">
          {rows.map((r) => (
            <div
              key={r.desc}
              className="metro-tile mt-0.5 flex items-center justify-between px-4 py-2"
            >
              <div className="flex items-center gap-1">
                {r.keys.map((k) => (
                  <span key={k} className="key-cap">
                    {k}
                  </span>
                ))}
              </div>
              <span className="font-mono text-[10px] uppercase tracking-metro text-white">
                {r.desc}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
