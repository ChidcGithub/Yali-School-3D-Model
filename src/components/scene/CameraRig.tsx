import { useEffect, useMemo, useRef } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

// Ref type inferred from drei's OrbitControls (avoids a direct three-stdlib dep).
type OrbitControlsImpl = React.ElementRef<typeof OrbitControls>

// Keyboard fly controls layered on top of OrbitControls.
// W/S move along the camera's forward axis (horizontal projection),
// A/D along the right axis, Q/E move straight down/up.
// Holding Shift doubles the speed. The OrbitControls target follows the
// camera so free-flight and orbit manipulations stay coherent.
const BASE_SPEED = 60 // world units per second
const SHIFT_MULT = 2

const MOVE_KEYS = new Set(['w', 'a', 's', 'd', 'q', 'e'])

export function CameraRig() {
  const controlsRef = useRef<OrbitControlsImpl>(null)
  const { camera, gl } = useThree()

  const pressed = useRef<Set<string>>(new Set())
  const tmpForward = useMemo(() => new THREE.Vector3(), [])
  const tmpRight = useMemo(() => new THREE.Vector3(), [])
  const tmpMove = useMemo(() => new THREE.Vector3(), [])

  // Track keyboard state on the canvas element so the page keeps working when
  // focus is on the 3D viewport. Ignore key repeats for Set semantics.
  useEffect(() => {
    const el = gl.domElement
    const isMoveKey = (k: string) => MOVE_KEYS.has(k)

    const onDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      if (!isMoveKey(k)) return
      // Prevent page scroll for space-adjacent keys (particularly Q/E on some layouts).
      e.preventDefault()
      pressed.current.add(k)
    }
    const onUp = (e: KeyboardEvent) => {
      pressed.current.delete(e.key.toLowerCase())
    }
    const onBlur = () => pressed.current.clear()

    el.addEventListener('keydown', onDown)
    el.addEventListener('keyup', onUp)
    window.addEventListener('blur', onBlur)
    return () => {
      el.removeEventListener('keydown', onDown)
      el.removeEventListener('keyup', onUp)
      window.removeEventListener('blur', onBlur)
    }
  }, [gl])

  useFrame((_, delta) => {
    const controls = controlsRef.current
    if (!controls) return

    const keys = pressed.current
    let fx = 0
    let rx = 0
    let uy = 0
    if (keys.has('w')) fx += 1
    if (keys.has('s')) fx -= 1
    if (keys.has('d')) rx += 1
    if (keys.has('a')) rx -= 1
    if (keys.has('e')) uy += 1
    if (keys.has('q')) uy -= 1

    if (fx === 0 && rx === 0 && uy === 0) return

    // Forward axis projected onto the horizontal plane so flight stays level
    // regardless of pitch; matches how most 3D viewers behave.
    camera.getWorldDirection(tmpForward)
    tmpForward.y = 0
    if (tmpForward.lengthSq() < 1e-8) {
      tmpForward.set(0, 0, -1)
    } else {
      tmpForward.normalize()
    }
    tmpRight.crossVectors(tmpForward, camera.up).normalize()

    const speed = BASE_SPEED * (keys.has('shift') ? SHIFT_MULT : 1)
    tmpMove.set(0, 0, 0)
    tmpMove.addScaledVector(tmpForward, fx * speed * delta)
    tmpMove.addScaledVector(tmpRight, rx * speed * delta)
    tmpMove.y += uy * speed * delta

    camera.position.add(tmpMove)
    // Move the orbit pivot along with the camera so OrbitControls stays anchored
    // to the same relative target during and after the fly motion.
    controls.target.add(tmpMove)
    controls.update()
  })

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      minDistance={5}
      maxDistance={2200}
      maxPolarAngle={Math.PI / 2 - 0.02}
      enablePan
    />
  )
}
