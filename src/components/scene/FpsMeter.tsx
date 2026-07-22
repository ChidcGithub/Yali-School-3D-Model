import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useSceneStore } from '@/store/sceneStore'

// Samples FPS inside the render loop and pushes a smoothed value to the store.
export function FpsMeter() {
  const frames = useRef(0)
  const acc = useRef(0)
  const setFps = useSceneStore((s) => s.setFps)

  useEffect(() => () => setFps(0), [setFps])

  useFrame((_, delta) => {
    frames.current += 1
    acc.current += delta
    if (acc.current >= 0.5) {
      setFps(Math.round(frames.current / acc.current))
      frames.current = 0
      acc.current = 0
    }
  })
  return null
}
