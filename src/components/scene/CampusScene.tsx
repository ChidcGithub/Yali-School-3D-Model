import { Canvas } from '@react-three/fiber'
import { Suspense } from 'react'
import { EffectComposer, Pixelation } from '@react-three/postprocessing'
import { Lighting } from './Lighting'
import { SkyDome } from './SkyDome'
import { MapGround } from './MapGround'
import { TileModels } from './TileModels'
import { CameraRig, INITIAL_CAM } from './CameraRig'
import { FpsMeter } from './FpsMeter'

export function CampusScene() {
  return (
    <Canvas
      gl={{ antialias: false, powerPreference: 'high-performance' }}
      dpr={[1, 2]}
      camera={{ fov: 50, near: 0.5, far: 6000, position: INITIAL_CAM }}
      onCreated={({ gl }) => {
        gl.setClearColor('#000000')
      }}
    >
      <Suspense fallback={null}>
        <Lighting />
        <SkyDome />
        <MapGround />
        <TileModels />
        <FpsMeter />
      </Suspense>
      <CameraRig />
      <EffectComposer>
        <Pixelation granularity={4} />
      </EffectComposer>
    </Canvas>
  )
}
