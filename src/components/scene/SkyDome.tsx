import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { useSceneStore } from '@/store/sceneStore'

// Sky dome: a large BackSide sphere with a three-stop top/middle/bottom gradient.
// bottom must match Lighting's fog color so distant models fade into the sky
// horizon seamlessly — this is the visual edge of the "distance fog" treatment.
const SKY = {
  day: {
    top: '#3D5A80', // zenith: deeper blue
    middle: '#9BB5C9', // mid-sky: pale blue
    bottom: '#C9D2DA', // horizon: fog gray (= Lighting day.fog)
  },
  dusk: {
    top: '#0A0814', // zenith: near-black purple
    middle: '#4A3B5C', // mid-sky: dark purple (= Lighting dusk.hemiSky)
    bottom: '#332B48', // horizon: foggy purple (= Lighting dusk.fog)
  },
} as const

// Slightly under the camera far plane (6000), well over maxDistance (1800).
// The camera always stays near the sphere center, so the sky always covers the
// outer field of view without breaking through the shell.
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
    // Normalized y gives a -1..1 zenith->horizon->nadir height factor.
    float h = normalize(vDir).y;
    // Upper-hemisphere gradient coefficient (exponent controls horizon band width).
    float t = pow(clamp(h, 0.0, 1.0), exponent);
    vec3 col;
    if (t < 0.5) {
      col = mix(bottomColor, middleColor, t * 2.0);
    } else {
      col = mix(middleColor, topColor, (t - 0.5) * 2.0);
    }
    // Below the horizon, fall back to the horizon color (camera maxPolarAngle < pi/2, kept as a safety net).
    col = h < 0.0 ? bottomColor : col;
    gl_FragColor = vec4(col, 1.0);
  }
`

export function SkyDome() {
  const atmosphere = useSceneStore((s) => s.atmosphere)

  const uniforms = useMemo(
    () => ({
      topColor: { value: new THREE.Color(SKY.day.top) },
      middleColor: { value: new THREE.Color(SKY.day.middle) },
      bottomColor: { value: new THREE.Color(SKY.day.bottom) },
      exponent: { value: 0.8 },
    }),
    [],
  )

  // On day/dusk switch, only update uniform colors — do not rebuild the material.
  useEffect(() => {
    const s = SKY[atmosphere]
    uniforms.topColor.value.set(s.top)
    uniforms.middleColor.value.set(s.middle)
    uniforms.bottomColor.value.set(s.bottom)
  }, [atmosphere, uniforms])

  return (
    <mesh scale={[SKY_RADIUS, SKY_RADIUS, SKY_RADIUS]} renderOrder={-1}>
      <sphereGeometry args={[1, 32, 16]} />
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
