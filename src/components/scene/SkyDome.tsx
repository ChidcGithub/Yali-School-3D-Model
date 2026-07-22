import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { useSceneStore } from '@/store/sceneStore'

// 天空遮罩：BackSide 大球，顶/中/底三段渐变。
// bottom 必须与 Lighting 的 fog 色一致 —— 这样远处模型淡入 fog 时与天空
// 地平线无缝融合，即是"距离外模糊处理"的视觉边界。
const SKY = {
  day: {
    top: '#3D5A80', // 天顶：较深的蓝
    middle: '#9BB5C9', // 中天：淡蓝
    bottom: '#C9D2DA', // 地平线：雾灰（= Lighting day.fog）
  },
  dusk: {
    top: '#0A0814', // 天顶：近黑紫
    middle: '#4A3B5C', // 中天：暗紫（= Lighting dusk.hemiSky）
    bottom: '#332B48', // 地平线：雾紫（= Lighting dusk.fog）
  },
} as const

// 略小于相机 far(6000)，远大于 maxDistance(1800)，相机无论如何都在球心附近，
// 天空始终覆盖整个视野外围，不会穿出球壁。
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
    // 归一化后的 y 分量给出天顶→地平线→地下 的 -1..1 高度系数
    float h = normalize(vDir).y;
    // 上半球渐变系数（exponent 控制地平线带宽度）
    float t = pow(clamp(h, 0.0, 1.0), exponent);
    vec3 col;
    if (t < 0.5) {
      col = mix(bottomColor, middleColor, t * 2.0);
    } else {
      col = mix(middleColor, topColor, (t - 0.5) * 2.0);
    }
    // 地平线以下统一用地平线色（相机 maxPolarAngle < π/2，仅作保险）
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

  // 昼夜切换时只更新 uniform 颜色，不重建材质。
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
