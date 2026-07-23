import { useMemo } from 'react'
import * as THREE from 'three'
import { useSceneStore } from '@/store/sceneStore'

// Ground plane: a large disc centered at the world origin that fills the
// area outside the model with the same color as the sky horizon (fog color),
// so the model appears to sit on a continuous ground that blends seamlessly
// into the sky. The disc is big enough to reach the horizon under the
// camera's maxPolarAngle limit but stays inside the sky dome.
//
// Color is keyed to the atmosphere (day/dusk) to match Lighting's fog and
// SkyDome's bottom color — this is what makes the "distance fog" treatment
// read as a natural ground-to-sky gradient at the horizon.
const GROUND = {
  day: '#C9D2DA', // = SkyDome day.bottom / Lighting day.fog
  dusk: '#0F1F38', // = SkyDome dusk.bottom / Lighting dusk.fog
} as const

// Slightly under the sky dome radius (4500) so the edge tucks under the sky.
const GROUND_RADIUS = 4200

export function Ground() {
  const atmosphere = useSceneStore((s) => s.atmosphere)
  const color = useMemo(() => new THREE.Color(GROUND[atmosphere]), [atmosphere])
  // Model ground sits around y≈25 (non-uniform). Place the disc just below
  // the model floor so it reads as the ground the campus sits on, and so the
  // camera (which can't go below maxPolarAngle) always sees it ahead.
  const GROUND_Y = 20
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, GROUND_Y, 0]}>
      <circleGeometry args={[GROUND_RADIUS, 64]} />
      <meshBasicMaterial color={color} side={THREE.FrontSide} />
    </mesh>
  )
}
