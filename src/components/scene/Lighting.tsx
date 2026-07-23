import { useSceneStore } from '@/store/sceneStore'

const PRESETS = {
  day: {
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
  },
  dusk: {
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
  },
}

export function Lighting() {
  const atmosphere = useSceneStore((s) => s.atmosphere)
  const p = PRESETS[atmosphere]

  return (
    <>
      <color attach="background" args={[p.background]} />
      <fog attach="fog" args={[p.fog, p.fogNear, p.fogFar]} />
      <ambientLight intensity={p.ambient} />
      <hemisphereLight
        color={p.hemiSky}
        groundColor={p.hemiGround}
        intensity={p.hemiIntensity}
      />
      <directionalLight
        color={p.dirColor}
        intensity={p.dirIntensity}
        position={p.dirPos}
      />
    </>
  )
}
