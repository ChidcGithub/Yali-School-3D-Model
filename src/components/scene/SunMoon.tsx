import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useSceneStore } from '@/store/sceneStore'

const SUN_RADIUS = 3500
const SUN_SIZE = 80
const MOON_SIZE = 40
const CYCLE_DURATION = 60
const BOOST_SPEED = 20

function sunPosition(timeOfDay: number): THREE.Vector3 {
  const elevation = -Math.cos(timeOfDay * Math.PI * 2) * (Math.PI / 3)
  const azimuth = timeOfDay * Math.PI * 2
  const r = SUN_RADIUS * Math.cos(elevation)
  return new THREE.Vector3(
    r * Math.sin(azimuth),
    SUN_RADIUS * Math.sin(elevation),
    -r * Math.cos(azimuth),
  )
}

export function SunMoon() {
  const sunRef = useRef<THREE.Mesh>(null)
  const moonRef = useRef<THREE.Mesh>(null)
  const glowRef = useRef<THREE.Sprite>(null)

  useFrame((_, delta) => {
    const store = useSceneStore.getState()
    let { timeOfDay, boostTarget } = store

    const baseSpeed = 1 / CYCLE_DURATION
    let speed = baseSpeed

    if (boostTarget !== null) {
      // Calculate remaining distance to target (handle wrap-around)
      let dist = boostTarget - timeOfDay
      if (dist < 0) dist += 1
      const boostStep = baseSpeed * BOOST_SPEED * delta
      if (dist <= boostStep + 0.0001) {
        // Close enough — snap to target and stop boost
        timeOfDay = boostTarget
        boostTarget = null
      } else {
        speed = baseSpeed * BOOST_SPEED
      }
    }

    timeOfDay = (timeOfDay + speed * delta) % 1.0

    if (
      boostTarget !== store.boostTarget ||
      Math.abs(timeOfDay - store.timeOfDay) > 0.0001
    ) {
      useSceneStore.setState({ timeOfDay, boostTarget })
    }

    const sunPos = sunPosition(timeOfDay)
    const moonPos = sunPosition((timeOfDay + 0.5) % 1.0)

    if (sunRef.current) sunRef.current.position.copy(sunPos)
    if (glowRef.current) glowRef.current.position.copy(sunPos)
    if (moonRef.current) moonRef.current.position.copy(moonPos)

    const sunVisible = sunPos.y > 0
    if (sunRef.current) sunRef.current.visible = sunVisible
    if (glowRef.current) glowRef.current.visible = sunVisible
    if (moonRef.current) moonRef.current.visible = moonPos.y > 0
  })

  return (
    <>
      <mesh ref={sunRef}>
        <sphereGeometry args={[SUN_SIZE, 32, 16]} />
        <meshBasicMaterial color="#FFE8C0" />
      </mesh>
      <sprite ref={glowRef} scale={[600, 600, 1]}>
        <spriteMaterial
          color="#FFD080"
          transparent
          opacity={0.25}
          depthWrite={false}
          depthTest={false}
        />
      </sprite>
      <mesh ref={moonRef}>
        <sphereGeometry args={[MOON_SIZE, 32, 16]} />
        <meshBasicMaterial color="#C8D6E8" />
      </mesh>
    </>
  )
}
