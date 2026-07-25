import { useEffect, useMemo, useRef } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { useSceneStore } from '@/store/sceneStore'

// Ref type inferred from drei's OrbitControls (avoids a direct three-stdlib dep).
type OrbitControlsImpl = React.ElementRef<typeof OrbitControls>

// Canonical initial view pose. Used both for the Canvas camera init and for
// the RESET button — bumping store.resetKey snaps back to this transform.
// Camera sits at the world origin; target is offset slightly so OrbitControls
// has a non-zero distance. Target Y must NOT sit on an airwall boundary
// (default airwallY max = 2000), or the Y axis gets clamp-locked.
export const INITIAL_CAM: [number, number, number] = [389, 99, -627]
export const INITIAL_TGT: [number, number, number] = [449, -52, -382]

// Keyboard fly controls layered on top of OrbitControls.
// W/S: forward/back along the camera's horizontal forward axis.
// A/D: strafe left/right.
// Q/E: down/up (world Y).
// Shift: 2× speed.
// The orbit target moves together with the camera so free-flight and orbit
// manipulations stay coherent.
const BASE_SPEED = 60 // world units per second
const SHIFT_MULT = 2
const MOVE_KEYS = new Set(['w', 'a', 's', 'd', 'q', 'e', 'shift'])

export function CameraRig() {
  const controlsRef = useRef<OrbitControlsImpl>(null)
  const { camera } = useThree()
  const awX = useSceneStore((s) => s.airwallX)
  const awY = useSceneStore((s) => s.airwallY)
  const awZ = useSceneStore((s) => s.airwallZ)
  const setCamDebug = useSceneStore((s) => s.setCamDebug)
  const resetKey = useSceneStore((s) => s.resetKey)

  const pressed = useRef<Set<string>>(new Set())
  const tmpForward = useMemo(() => new THREE.Vector3(), [])
  const tmpRight = useMemo(() => new THREE.Vector3(), [])
  const tmpMove = useMemo(() => new THREE.Vector3(), [])
  const lastDebugFlush = useRef(0)

  // Track keyboard state on window. The canvas itself is not focusable
  // (no tabindex), so binding to gl.domElement would never fire. Window-level
  // listening catches keys regardless of focus, but we skip when the user is
  // typing into an input/textarea so the proxy field and slider stay usable.
  useEffect(() => {
    const isEditable = (t: EventTarget | null) => {
      const el = t as HTMLElement | null
      if (!el) return false
      const tag = el.tagName
      return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable
    }
    const onDown = (e: KeyboardEvent) => {
      if (isEditable(e.target)) return
      const k = e.key.toLowerCase()
      if (!MOVE_KEYS.has(k)) return
      e.preventDefault()
      pressed.current.add(k)
    }
    const onUp = (e: KeyboardEvent) => {
      if (isEditable(e.target)) return
      pressed.current.delete(e.key.toLowerCase())
    }
    const onBlur = () => pressed.current.clear()
    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
      window.removeEventListener('blur', onBlur)
    }
  }, [])

  // Reset view — snap camera and orbit target back to the canonical initial
  // pose whenever store.resetKey bumps (RESET button click).
  useEffect(() => {
    if (resetKey === 0) return
    const controls = controlsRef.current
    if (!controls) return
    camera.position.set(...INITIAL_CAM)
    controls.target.set(...INITIAL_TGT)
    camera.updateProjectionMatrix()
    controls.update()
  }, [resetKey, camera])

  useFrame((_, delta) => {
    const controls = controlsRef.current
    if (!controls) return

    // --- Keyboard fly motion ---
    const keys = pressed.current
    let fx = 0, rx = 0, uy = 0
    if (keys.has('w')) fx += 1
    if (keys.has('s')) fx -= 1
    if (keys.has('d')) rx += 1
    if (keys.has('a')) rx -= 1
    if (keys.has('e')) uy += 1
    if (keys.has('q')) uy -= 1

    if (fx !== 0 || rx !== 0 || uy !== 0) {
      // Forward axis projected onto the horizontal plane so flight stays level.
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
      controls.target.add(tmpMove)
    }

    // --- Airwall ---
    // Clamp ONLY the orbit target to the per-axis box, then re-apply the
    // preserved camera-to-target offset. The camera is NOT clamped
    // independently — that would distort the view angle/height. Since WASD
    // moves camera and target together, clamping the target (and dragging the
    // camera along by the same offset) bounds the whole rig without breaking
    // the orbit relationship.
    const ox = camera.position.x - controls.target.x
    const oy = camera.position.y - controls.target.y
    const oz = camera.position.z - controls.target.z
    controls.target.x = THREE.MathUtils.clamp(controls.target.x, awX.min, awX.max)
    controls.target.y = THREE.MathUtils.clamp(controls.target.y, awY.min, awY.max)
    controls.target.z = THREE.MathUtils.clamp(controls.target.z, awZ.min, awZ.max)
    camera.position.x = controls.target.x + ox
    camera.position.y = controls.target.y + oy
    camera.position.z = controls.target.z + oz

    controls.update()

    // Throttled debug coord publish (5x/sec) for the tuning panel.
    const now = performance.now()
    if (now - lastDebugFlush.current > 200) {
      lastDebugFlush.current = now
      setCamDebug(
        { x: camera.position.x, y: camera.position.y, z: camera.position.z },
        { x: controls.target.x, y: controls.target.y, z: controls.target.z },
      )
    }
  })

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      minDistance={5}
      maxDistance={2200}
      enablePan
      target={INITIAL_TGT}
    />
  )
}
