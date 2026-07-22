import { CampusScene } from '@/components/scene/CampusScene'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { TopBar } from '@/components/ui/TopBar'
import { ControlHints } from '@/components/ui/ControlHints'

export default function Home() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-ink-950">
      {/* 3D viewport (full-bleed) */}
      <div className="absolute inset-0">
        <CampusScene />
      </div>

      {/* Subtle vignette for mood & legibility of overlays */}
      <div
        className="pointer-events-none absolute inset-0 z-10"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 55%, rgba(14,15,19,0.45) 100%)',
        }}
      />

      {/* UI overlays */}
      <TopBar />
      <ControlHints />

      {/* Loading screen sits above everything until assets resolve */}
      <LoadingScreen />
    </div>
  )
}
