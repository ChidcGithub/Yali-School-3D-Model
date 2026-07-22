import { CampusScene } from '@/components/scene/CampusScene'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { BackgroundProgress } from '@/components/ui/BackgroundProgress'
import { TopBar } from '@/components/ui/TopBar'
import { ControlHints } from '@/components/ui/ControlHints'

export default function Home() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-ink-950">
      {/* 3D viewport (full-bleed) */}
      <div className="absolute inset-0">
        <CampusScene />
      </div>

      {/* UI overlays */}
      <TopBar />
      <ControlHints />
      {/* Post-skip background tile progress (left corner chevron) */}
      <BackgroundProgress />

      {/* Loading screen sits above everything until assets resolve */}
      <LoadingScreen />
    </div>
  )
}
