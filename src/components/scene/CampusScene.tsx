import { Canvas } from '@react-three/fiber'
import { Suspense } from 'react'
import { Lighting } from './Lighting'
import { SkyDome } from './SkyDome'
import { TileModels } from './TileModels'
import { CameraRig } from './CameraRig'
import { FpsMeter } from './FpsMeter'

export function CampusScene() {
  return (
    <Canvas
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      dpr={[1, 2]}
      camera={{ fov: 50, near: 0.5, far: 6000, position: [420, 320, 460] }}
      onCreated={({ gl }) => {
        gl.setClearColor('#C9D2DA')
      }}
    >
      <Suspense fallback={null}>
        <Lighting />
        <SkyDome />
        <TileModels />
        <FpsMeter />
      </Suspense>
      <CameraRig />
    </Canvas>
  )
}
