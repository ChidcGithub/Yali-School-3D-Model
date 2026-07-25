import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useSceneStore } from '@/store/sceneStore'

const SUN_RADIUS = 3500
const MOON_SIZE = 70
const STAR_RADIUS = 4600
const CYCLE_DURATION = 120
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

function nightFactor(t: number): number {
  if (t < 0.15) return 1
  if (t < 0.25) { const x = (t - 0.15) / 0.1; return 1 - x * x * (3 - 2 * x) }
  if (t < 0.75) return 0
  if (t < 0.85) { const x = (t - 0.75) / 0.1; return x * x * (3 - 2 * x) }
  return 1
}

// Shared glow texture — radial gradient from opaque center to transparent edge.
function makeGlowTex(color: string, aCenter: number, aMid: number): THREE.CanvasTexture {
  const s = 256
  const c = document.createElement('canvas')
  c.width = s; c.height = s
  const ctx = c.getContext('2d')!
  // Parse hex color to rgba components
  const r = parseInt(color.slice(0, 2), 16)
  const g = parseInt(color.slice(2, 4), 16)
  const b = parseInt(color.slice(4, 6), 16)
  const grad = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
  grad.addColorStop(0, `rgba(${r},${g},${b},${aCenter})`)
  grad.addColorStop(0.4, `rgba(${r},${g},${b},${aMid})`)
  grad.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, s, s)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

// ─── Sun (time driver only) ────────────────────────────────────────────
function Sun() {
  useFrame((_, delta) => {
    const store = useSceneStore.getState()
    if (!store.isLoaded) return
    let { timeOfDay, boostTarget } = store
    const baseSpeed = 1 / CYCLE_DURATION
    let speed = baseSpeed
    if (boostTarget !== null) {
      let d = boostTarget - timeOfDay
      if (d < 0) d += 1
      const step = baseSpeed * BOOST_SPEED * delta
      if (d <= step + 0.0001) { timeOfDay = boostTarget; boostTarget = null }
      else speed = baseSpeed * BOOST_SPEED
    }
    timeOfDay = (timeOfDay + speed * delta) % 1.0
    useSceneStore.setState({ timeOfDay, boostTarget })
  })

  return null
}

// ─── Moon ──────────────────────────────────────────────────────────────────────

function Moon() {
  const meshRef = useRef<THREE.Mesh>(null)
  const glow1Ref = useRef<THREE.Sprite>(null)
  const glow2Ref = useRef<THREE.Sprite>(null)
  const glow1Tex = useMemo(() => makeGlowTex('D8E4F8', 0.6, 0.18), [])
  const glow2Tex = useMemo(() => makeGlowTex('B8D0F0', 0.25, 0.06), [])

  useFrame(() => {
    const pos = sunPosition((useSceneStore.getState().timeOfDay + 0.5) % 1.0)
    const visible = pos.y > -MOON_SIZE
    if (meshRef.current) { meshRef.current.position.copy(pos); meshRef.current.visible = visible }
    if (glow1Ref.current) { glow1Ref.current.position.copy(pos); glow1Ref.current.visible = visible }
    if (glow2Ref.current) { glow2Ref.current.position.copy(pos); glow2Ref.current.visible = visible }
  })

  return (
    <>
      <mesh ref={meshRef}>
        <sphereGeometry args={[MOON_SIZE, 32, 16]} />
        <meshBasicMaterial color="#F4F6FE" toneMapped={false} fog={false} />
      </mesh>
      <sprite ref={glow1Ref} scale={[MOON_SIZE * 4, MOON_SIZE * 4, 1]}>
        <spriteMaterial map={glow1Tex} transparent depthWrite={false} depthTest={false} toneMapped={false} fog={false} />
      </sprite>
      <sprite ref={glow2Ref} scale={[MOON_SIZE * 8, MOON_SIZE * 8, 1]}>
        <spriteMaterial map={glow2Tex} transparent depthWrite={false} depthTest={false} toneMapped={false} fog={false} />
      </sprite>
    </>
  )
}

// ─── Stars ────────────────────────────────────────────────────────────────────

const starVert = /* glsl */ `
  varying vec3 vPos;
  void main() { vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
`

const starFrag = /* glsl */ `
  uniform float uNight, uTime;
  varying vec3 vPos;
  float hash(vec3 p){p=fract(p*vec3(443.8975,397.2973,491.1871));p+=dot(p.zxy,p.yxz+19.19);return fract(p.x*p.y*p.z);}
  void main(){
    // Strict threshold: only show stars when properly dark
    if(uNight<0.05)discard;
    vec3 d=normalize(vPos);float cs=0.08;
    vec3 cell=floor(d/cs+0.5);float h=hash(cell);
    if(h>0.35)discard;
    vec3 sp=(cell+0.5)*cs;float dist=length(d-sp)/cs;
    float b=smoothstep(0.15,0.0,dist);float a=b*uNight;
    if(a<0.01)discard;
    float sb=0.4+h*1.8;float tw=0.8+0.2*sin(uTime*2.5+h*80.0);
    vec3 col=mix(vec3(0.9,0.92,1.0),vec3(1.0,0.92,0.75),hash(cell+42.0));
    gl_FragColor=vec4(col*b*sb*tw*uNight,a);
  }
`

function StarField() {
  const ref = useRef<THREE.Mesh>(null)
  const matRef = useRef<THREE.ShaderMaterial>(null)
  const unis = useMemo(() => ({ uNight: { value: 0 }, uTime: { value: 0 } }), [])
  const t = useRef(0)

  useFrame((_, dt) => {
    t.current += dt
    const nf = nightFactor(useSceneStore.getState().timeOfDay)
    if (matRef.current) {
      matRef.current.uniforms.uNight.value = nf
      matRef.current.uniforms.uTime.value = t.current
    }
    // Double safety: hide the entire mesh during daytime
    if (ref.current) {
      ref.current.visible = nf > 0.01
      ref.current.rotation.y += dt * 0.03
    }
  })

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[STAR_RADIUS, 48, 24]} />
      <shaderMaterial ref={matRef} uniforms={unis} vertexShader={starVert} fragmentShader={starFrag}
        side={THREE.BackSide} transparent depthWrite={false} toneMapped={false} />
    </mesh>
  )
}

// ─── Export ───────────────────────────────────────────────────────────────────

export function SunMoon() {
  return <><Sun /><Moon /><StarField /></>
}
