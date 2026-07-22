import * as THREE from 'three'

export type Viewpoint = {
  id: string
  name: string
  description: string
  position: [number, number, number]
  target: [number, number, number]
  duration: number
}

type Def = {
  id: string
  name: string
  description: string
  azimuth: number // radians around campus center (in XZ plane)
  elevation: number // camera height factor of maxDim
  distance: number // camera distance factor of maxDim
  top?: boolean
}

// Ordered to form a pleasing auto-tour sequence.
const DEFS: Def[] = [
  { id: 'aerial', name: '低空巡影', description: '斜掠过校园东南的低空视角，先一览全貌。', azimuth: Math.PI * 0.25, elevation: 0.42, distance: 1.05 },
  { id: 'east', name: '东曦初照', description: '晨光自东方漫过教学楼的屋脊。', azimuth: 0, elevation: 0.6, distance: 0.95 },
  { id: 'south', name: '南庭远眺', description: '南向俯瞰操场与开阔庭院。', azimuth: Math.PI * 0.5, elevation: 0.6, distance: 0.95 },
  { id: 'overhead', name: '悬视中庭', description: '正俯校园几何中心，瓦片拼接尽收眼底。', azimuth: 0, elevation: 1.15, distance: 0.02, top: true },
  { id: 'west', name: '西岭衔霞', description: '黄昏霞光勾出校园西缘轮廓。', azimuth: Math.PI, elevation: 0.6, distance: 0.95 },
  { id: 'north', name: '北望学宫', description: '北向凝望主教学楼群。', azimuth: Math.PI * 1.5, elevation: 0.6, distance: 0.95 },
]

export function generateViewpoints(box: THREE.Box3): Viewpoint[] {
  const size = new THREE.Vector3()
  box.getSize(size)
  const center = new THREE.Vector3()
  box.getCenter(center)
  const maxDim = Math.max(size.x, size.z)

  return DEFS.map((d) => {
    const target: [number, number, number] = [center.x, center.y, center.z]
    let position: [number, number, number]
    if (d.top) {
      position = [center.x, maxDim * d.elevation, center.z + 0.01]
    } else {
      const px = center.x + Math.cos(d.azimuth) * maxDim * d.distance
      const pz = center.z + Math.sin(d.azimuth) * maxDim * d.distance
      position = [px, maxDim * d.elevation, pz]
    }
    return {
      id: d.id,
      name: d.name,
      description: d.description,
      position,
      target,
      duration: 2.6,
    }
  })
}

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}
