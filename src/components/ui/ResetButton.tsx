import { Locate } from 'lucide-react'
import { useSceneStore } from '@/store/sceneStore'

// Metro ResetButton — snaps the camera back to the canonical initial pose.
// Uses the accent tile style for high visibility against any background.
export function ResetButton() {
  const resetView = useSceneStore((s) => s.resetView)
  return (
    <button
      onClick={resetView}
      className="metro-tile-accent pointer-events-auto fixed top-20 right-2 z-30 flex items-center gap-1.5 px-3 py-2"
      aria-label="Reset view"
      title="Reset view"
    >
      <Locate size={13} className="text-black" />
      <span className="font-mono text-[10px] font-semibold uppercase tracking-metro text-black">
        RESET
      </span>
    </button>
  )
}
