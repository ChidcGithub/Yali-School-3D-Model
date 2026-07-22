import { useEffect, useRef } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { useSceneStore } from '@/store/sceneStore'
import { easeInOutCubic } from '@/three/viewpoints'

// Ref type inferred from drei's OrbitControls (avoids a direct three-stdlib dep).
type OrbitControlsImpl = React.ElementRef<typeof OrbitControls>

type Anim = {
  startPos: THREE.Vector3
  startTarget: THREE.Vector3
  endPos: THREE.Vector3
  endTarget: THREE.Vector3
  t: number
  duration: number
}

const TOUR_PAUSE_AT_VIEWPOINT = 1.8 // seconds to linger before flying on

export function CameraRig() {
  const controlsRef = useRef<OrbitControlsImpl>(null)
  const { camera } = useThree()

  const viewpoints = useSceneStore((s) => s.viewpoints)
  const activeViewpointId = useSceneStore((s) => s.activeViewpointId)
  const isTouring = useSceneStore((s) => s.isTouring)
  const tourPaused = useSceneStore((s) => s.tourPaused)

  const animRef = useRef<Anim | null>(null)
  const tourWaitRef = useRef<number>(0)

  // Begin a fly-to animation whenever the active viewpoint changes.
  useEffect(() => {
    if (!activeViewpointId) return
    const vp = viewpoints.find((v) => v.id === activeViewpointId)
    const controls = controlsRef.current
    if (!vp || !controls) return
    animRef.current = {
      startPos: camera.position.clone(),
      startTarget: controls.target.clone(),
      endPos: new THREE.Vector3(vp.position[0], vp.position[1], vp.position[2]),
      endTarget: new THREE.Vector3(vp.target[0], vp.target[1], vp.target[2]),
      t: 0,
      duration: vp.duration,
    }
    // Reset tour linger timer; it only counts down after arrival.
    tourWaitRef.current = 0
  }, [activeViewpointId, viewpoints, camera])

  useFrame((_, delta) => {
    const controls = controlsRef.current
    if (!controls) return
    const state = useSceneStore.getState()

    const anim = animRef.current
    if (anim) {
      anim.t += delta / anim.duration
      const k = anim.t >= 1 ? 1 : easeInOutCubic(anim.t)
      camera.position.lerpVectors(anim.startPos, anim.endPos, k)
      controls.target.lerpVectors(anim.startTarget, anim.endTarget, k)
      controls.update()
      if (anim.t >= 1) {
        animRef.current = null
        if (state.isTouring && !state.tourPaused) {
          tourWaitRef.current = TOUR_PAUSE_AT_VIEWPOINT
        }
      }
      return
    }

    // Not animating: if touring & not paused, count down then advance.
    if (state.isTouring && !state.tourPaused) {
      if (tourWaitRef.current > 0) {
        tourWaitRef.current -= delta
        if (tourWaitRef.current <= 0) {
          state.nextTourIndex()
        }
      }
    }
  })

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      enabled={!isTouring || tourPaused}
      minDistance={40}
      maxDistance={1800}
      maxPolarAngle={Math.PI / 2 - 0.02}
      enablePan
    />
  )
}
