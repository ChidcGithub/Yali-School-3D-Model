import { Canvas } from '@react-three/fiber'
import { Suspense } from 'react'
import { Lighting } from './Lighting'
import { SkyDome } from './SkyDome'
import { Ground } from './Ground'
import { TileModels } from './TileModels'
import { CameraRig, INITIAL_CAM } from './CameraRig'
import { FpsMeter } from './FpsMeter'

export function CampusScene() {
  return (
    <Canvas
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      dpr={[1, 2]}
      camera={{ fov: 50, near: 0.5, far: 6000, position: INITIAL_CAM }}
      onCreated={({ gl }) => {
        gl.setClearColor('#000000')
      }}
    >
      <Suspense fallback={null}>
        <Lighting />
        <SkyDome />
        <Ground />
        <TileModels />
        <FpsMeter />
      </Suspense>
      <CameraRig />
    </Canvas>
  )
}
