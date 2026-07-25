import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useSceneStore } from '@/store/sceneStore'

const CLOUD_MIN_Y = 600
const CLOUD_MAX_Y = 2000
const VOLUME_XZ = 3500

function warmTFactor(timeOfDay: number): number {
  const maxY = 3500 * Math.sin(Math.PI / 3)
  const el = -Math.cos(timeOfDay * Math.PI * 2) * (Math.PI / 3)
  const y = 3500 * Math.sin(el)
  const hr = THREE.MathUtils.clamp(y / maxY, 0, 1)
  return 1 - THREE.MathUtils.smoothstep(hr, 0, 0.15)
}

function nightFactor(t: number): number {
  if (t < 0.15) return 1
  if (t < 0.25) { const x = (t - 0.15) / 0.1; return 1 - x * x * (3 - 2 * x) }
  if (t < 0.75) return 0
  if (t < 0.85) { const x = (t - 0.75) / 0.1; return x * x * (3 - 2 * x) }
  return 1
}

const frag = `
  uniform vec3 uBoxMin;
  uniform vec3 uBoxMax;
  uniform vec3 uSunDir;
  uniform vec3 uTint;
  uniform float uTime;
  uniform float uNight;
  uniform float uWarmT;
  varying vec3 vWorldPos;

  float hash(vec3 p) {
    p = fract(p * vec3(443.8975, 397.2973, 491.1871));
    p += dot(p.zxy, p.yxz + 19.19);
    return fract(p.x * p.y * p.z);
  }

  float noise3D(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x),
          mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
      mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
          mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
  }

  float fbm(vec3 p) {
    float n = 0.0, amp = 0.5, total = 0.0;
    for (int o = 0; o < 5; o++) {
      float f = float(1 << o);
      n += noise3D(p * f) * amp;
      total += amp;
      amp *= 0.5;
    }
    return n / total;
  }

  float cloudDensity(vec3 pos) {
    // Wind movement from uTime
    vec3 wind = vec3(uTime * 0.04, 0.0, uTime * 0.025);
    vec3 samplePos = (pos + wind) * 0.0008;
    float n = fbm(samplePos);

    float h = (pos.y - uBoxMin.y) / (uBoxMax.y - uBoxMin.y);
    float heightShape = 1.0 - abs(h - 0.35) * 3.5;
    heightShape = clamp(heightShape, 0.0, 1.0);

    float topShape = smoothstep(0.5, 1.0, h);
    topShape = 1.0 - topShape * 0.6;

    // Boost density during dawn/dusk for dramatic cloudscapes
    float warmBoost = 1.0 + uWarmT * 1.5;
    // Fade at night
    float nightFade = 1.0 - uNight;
    if (nightFade < 0.01) return 0.0;

    float density = (n - 0.3) * 4.0 * heightShape * topShape * warmBoost * nightFade;
    return max(density, 0.0);
  }

  float phase(float cosTheta, float g) {
    float g2 = g * g;
    return (1.0 - g2) / (4.0 * 3.14159 * pow(1.0 + g2 - 2.0 * g * cosTheta, 1.5));
  }

  vec2 rayBox(vec3 ro, vec3 rd, vec3 boxMin, vec3 boxMax) {
    vec3 invDir = 1.0 / rd;
    vec3 t0s = (boxMin - ro) * invDir;
    vec3 t1s = (boxMax - ro) * invDir;
    vec3 tsmall = min(t0s, t1s);
    vec3 tbig = max(t0s, t1s);
    float tmin = max(max(tsmall.x, tsmall.y), tsmall.z);
    float tmax = min(min(tbig.x, tbig.y), tbig.z);
    return vec2(max(tmin, 0.0), max(tmax, 0.0));
  }

  void main() {
    vec3 ro = cameraPosition;
    vec3 rd = normalize(vWorldPos - ro);

    vec2 tHit = rayBox(ro, rd, uBoxMin, uBoxMax);
    if (tHit.x >= tHit.y) discard;

    float t = tHit.x;
    float stepSize = (tHit.y - tHit.x) / 20.0;
    float transmittance = 1.0;
    float scatteredLight = 0.0;

    for (int i = 0; i < 20; i++) {
      if (transmittance < 0.01) break;
      vec3 pos = ro + rd * t;
      float d = cloudDensity(pos);
      if (d > 0.001) {
        float absorption = d * stepSize * 0.00035;
        transmittance *= exp(-absorption);
        float cosTheta = dot(rd, uSunDir);
        float p = phase(cosTheta, 0.3);
        scatteredLight += d * stepSize * 0.0003 * p * transmittance;
      }
      t += stepSize;
    }

    float cloudAlpha = 1.0 - transmittance;
    float nightFade = 1.0 - uNight;
    if (nightFade < 0.01) discard;
    cloudAlpha *= nightFade;

    vec3 cloudColor = uTint * (scatteredLight * 1.5 + cloudAlpha * 0.5);
    gl_FragColor = vec4(cloudColor, cloudAlpha);
  }
`

const vert = `
  varying vec3 vWorldPos;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export function Clouds() {
  const meshRef = useRef<THREE.Mesh>(null)
  const matRef = useRef<THREE.ShaderMaterial>(null)
  const { camera } = useThree()

  const unis = useMemo(() => ({
    uBoxMin: { value: new THREE.Vector3() },
    uBoxMax: { value: new THREE.Vector3() },
    uSunDir: { value: new THREE.Vector3(0.3, 0.6, -0.5).normalize() },
    uTint: { value: new THREE.Color('#FFFFFF') },
    uTime: { value: 0 },
    uNight: { value: 0 },
    uWarmT: { value: 0 },
  }), [])

  useFrame((_, dt) => {
    const tod = useSceneStore.getState().timeOfDay
    const warmT = warmTFactor(tod)
    const nf = nightFactor(tod)
    if (matRef.current) {
      const m = matRef.current
      const cx = camera.position.x, cz = camera.position.z
      m.uniforms.uBoxMin.value.set(cx - VOLUME_XZ, CLOUD_MIN_Y, cz - VOLUME_XZ)
      m.uniforms.uBoxMax.value.set(cx + VOLUME_XZ, CLOUD_MAX_Y, cz + VOLUME_XZ)
      m.uniforms.uTime.value += dt
      m.uniforms.uNight.value = nf
      m.uniforms.uWarmT.value = warmT

      const dawn = new THREE.Color('#FFB888')
      const day = new THREE.Color('#FFFFFF')
      m.uniforms.uTint.value.copy(day).lerp(dawn, warmT)

      const el = -Math.cos(tod * Math.PI * 2) * (Math.PI / 3)
      const az = tod * Math.PI * 2
      m.uniforms.uSunDir.value.set(
        Math.sin(az) * Math.cos(el),
        Math.sin(el),
        -Math.cos(az) * Math.cos(el),
      )
    }
    if (meshRef.current) {
      meshRef.current.position.set(camera.position.x, (CLOUD_MIN_Y + CLOUD_MAX_Y) / 2, camera.position.z)
    }
  })

  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[VOLUME_XZ * 2, CLOUD_MAX_Y - CLOUD_MIN_Y, VOLUME_XZ * 2]} />
      <shaderMaterial
        ref={matRef}
        uniforms={unis}
        vertexShader={vert}
        fragmentShader={frag}
        side={THREE.BackSide}
        transparent
        depthWrite={false}
        toneMapped={false}
        fog={false}
      />
    </mesh>
  )
}
