import { useSceneStore } from '@/store/sceneStore'
import * as THREE from 'three'

const DAY = {
  background: '#C9D2DA',
  fog: '#C9D2DA',
  fogNear: 600,
  fogFar: 2200,
  hemiSky: '#D6E2EC',
  hemiGround: '#5B4F3D',
  hemiIntensity: 1.0,
  dirColor: '#FFF4E0',
  dirIntensity: 1.15,
  dirPos: [600, 800, 400] as [number, number, number],
  ambient: 0.25,
}

const DUSK = {
  background: '#0F1F38',
  fog: '#0F1F38',
  fogNear: 400,
  fogFar: 1800,
  hemiSky: '#152850',
  hemiGround: '#0A102A',
  hemiIntensity: 0.5,
  dirColor: '#3A6090',
  dirIntensity: 0.4,
  dirPos: [520, 360, 240] as [number, number, number],
  ambient: 0.15,
}

function lerpColor(a: string, b: string, t: number): string {
  const ca = new THREE.Color(a)
  const cb = new THREE.Color(b)
  return '#' + ca.lerp(cb, t).getHexString()
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function lerpDir(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]
}

function timeToT(timeOfDay: number): number {
  // Map 0-1 to 0-1 where 0=day, 1=night, with smooth transitions
  if (timeOfDay < 0.25) {
    // Night → Dawn (fade from night to day between 0.15 and 0.25)
    return 1 - smoothstep(0.15, 0.25, timeOfDay)
  } else if (timeOfDay < 0.75) {
    // Day (full daylight)
    return 0
  } else {
    // Dusk → Night (fade from day to night between 0.75 and 0.85)
    return smoothstep(0.75, 0.85, timeOfDay)
  }
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

export function Lighting() {
  const timeOfDay = useSceneStore((s) => s.timeOfDay)
  const t = timeToT(timeOfDay)

  const bg = lerpColor(DAY.background, DUSK.background, t)
  const fog = lerpColor(DAY.fog, DUSK.fog, t)
  const fogNear = lerp(DAY.fogNear, DUSK.fogNear, t)
  const fogFar = lerp(DAY.fogFar, DUSK.fogFar, t)
  const hemiSky = lerpColor(DAY.hemiSky, DUSK.hemiSky, t)
  const hemiGround = lerpColor(DAY.hemiGround, DUSK.hemiGround, t)
  const hemiIntensity = lerp(DAY.hemiIntensity, DUSK.hemiIntensity, t)
  const dirColor = lerpColor(DAY.dirColor, DUSK.dirColor, t)
  const dirIntensity = lerp(DAY.dirIntensity, DUSK.dirIntensity, t)
  const dirPos = lerpDir(DAY.dirPos, DUSK.dirPos, t)
  const ambient = lerp(DAY.ambient, DUSK.ambient, t)

  return (
    <>
      <color attach="background" args={[bg]} />
      <fog attach="fog" args={[fog, fogNear, fogFar]} />
      <ambientLight intensity={ambient} />
      <hemisphereLight
        color={hemiSky}
        groundColor={hemiGround}
        intensity={hemiIntensity}
      />
      <directionalLight
        color={dirColor}
        intensity={dirIntensity}
        position={dirPos}
      />
    </>
  )
}
