import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useSceneStore } from '@/store/sceneStore'

const DAY = {
  top: '#3D5A80',
  middle: '#9BB5C9',
  bottom: '#C9D2DA',
}

const DUSK = {
  top: '#050A1A',
  middle: '#152850',
  bottom: '#0F1F38',
}

const SKY_RADIUS = 4500

const vertexShader = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const fragmentShader = /* glsl */ `
  uniform vec3 topColor;
  uniform vec3 middleColor;
  uniform vec3 bottomColor;
  uniform float exponent;
  varying vec3 vDir;

  void main() {
    float h = normalize(vDir).y;
    float t = pow(clamp(h, 0.0, 1.0), exponent);
    vec3 col;
    if (t < 0.5) {
      col = mix(bottomColor, middleColor, t * 2.0);
    } else {
      col = mix(middleColor, topColor, (t - 0.5) * 2.0);
    }
    col = h < 0.0 ? bottomColor : col;
    gl_FragColor = vec4(col, 1.0);
  }
`

function timeToT(timeOfDay: number): number {
  if (timeOfDay < 0.15) return 1
  if (timeOfDay < 0.25) {
    const x = (timeOfDay - 0.15) / 0.1
    return 1 - x * x * (3 - 2 * x)
  }
  if (timeOfDay < 0.75) return 0
  if (timeOfDay < 0.85) {
    const x = (timeOfDay - 0.75) / 0.1
    return x * x * (3 - 2 * x)
  }
  return 1
}

export function SkyDome() {
  const meshRef = useRef<THREE.Mesh>(null)
  const timeOfDay = useSceneStore((s) => s.timeOfDay)

  const dayTop = useMemo(() => new THREE.Color(DAY.top), [])
  const dayMid = useMemo(() => new THREE.Color(DAY.middle), [])
  const dayBot = useMemo(() => new THREE.Color(DAY.bottom), [])
  const duskTop = useMemo(() => new THREE.Color(DUSK.top), [])
  const duskMid = useMemo(() => new THREE.Color(DUSK.middle), [])
  const duskBot = useMemo(() => new THREE.Color(DUSK.bottom), [])

  const uniforms = useMemo(
    () => ({
      topColor: { value: new THREE.Color(DAY.top) },
      middleColor: { value: new THREE.Color(DAY.middle) },
      bottomColor: { value: new THREE.Color(DAY.bottom) },
      exponent: { value: 0.8 },
    }),
    [],
  )

  useEffect(() => {
    const t = timeToT(timeOfDay)
    uniforms.topColor.value.copy(dayTop).lerp(duskTop, t)
    uniforms.middleColor.value.copy(dayMid).lerp(duskMid, t)
    uniforms.bottomColor.value.copy(dayBot).lerp(duskBot, t)
    const mat = meshRef.current?.material as THREE.ShaderMaterial | undefined
    if (mat) mat.uniformsNeedUpdate = true
  }, [timeOfDay, uniforms, dayTop, dayMid, dayBot, duskTop, duskMid, duskBot])

  return (
    <mesh ref={meshRef} scale={[SKY_RADIUS, SKY_RADIUS, SKY_RADIUS]} renderOrder={-1}>
      <sphereGeometry args={[1, 64, 16]} />
      <shaderMaterial
        side={THREE.BackSide}
        fog={false}
        depthWrite={false}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
      />
    </mesh>
  )
}
