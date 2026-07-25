import { Canvas } from '@react-three/fiber'
import { Suspense, useCallback, useRef } from 'react'
import { EffectComposer, Pixelation } from '@react-three/postprocessing'
import { useSceneStore } from '@/store/sceneStore'
import { Lighting } from './Lighting'
import { SkyDome } from './SkyDome'
import { MapGround } from './MapGround'
import { TileModels } from './TileModels'
import { SunMoon } from './SunMoon'
import { Clouds } from './Clouds'
import { CameraRig, INITIAL_CAM } from './CameraRig'
import { FpsMeter } from './FpsMeter'
import * as THREE from 'three'

function PostProcessing() {
  const granularity = useSceneStore((s) => s.pixelGranularity)
  if (granularity <= 0) return null
  return (
    <EffectComposer multisampling={0}>
      <Pixelation granularity={granularity} />
    </EffectComposer>
  )
}

export function CampusScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const onCreated = useCallback(({ gl }: { gl: THREE.WebGLRenderer }) => {
    gl.setClearColor('#000000')

    // WebGL context-loss recovery for iOS Safari memory pressure.
    const canvas = gl.domElement
    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault()
      console.warn('[CampusScene] WebGL context lost')
    })
    canvas.addEventListener('webglcontextrestored', () => {
      console.log('[CampusScene] WebGL context restored')
      gl.setClearColor('#000000')
    })
  }, [])

  return (
    <Canvas
      ref={canvasRef}
      gl={{ antialias: false, powerPreference: 'high-performance', alpha: false }}
      dpr={[0.5, 1]}
      camera={{ fov: 50, near: 0.5, far: 6000, position: INITIAL_CAM }}
      onCreated={onCreated}
    >
      <Suspense fallback={null}>
        <Lighting />
        <SkyDome />
        <SunMoon />
        <Clouds />
        <MapGround />
        <TileModels />
        <FpsMeter />
      </Suspense>
      <CameraRig />
      <PostProcessing />
    </Canvas>
  )
}
