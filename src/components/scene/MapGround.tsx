import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useSceneStore } from '@/store/sceneStore'
import {
  worldToGeo,
  geoToWorld,
  lonToTileX,
  latToTileY,
  tileBounds,
  getTileUrl,
} from '../../three/mapTiles'

const MAP_Y = 25
const ZOOM = 15
const TILE_PX = 256

const MAP_X_MIN = -1000
const MAP_X_MAX = 1800
const MAP_Z_MIN = -2100
const MAP_Z_MAX = 1100

export function MapGround() {
  const meshRef = useRef<THREE.Mesh>(null)
  const [texReady, setTexReady] = useState(false)

  const grid = useMemo(() => {
    const sw = worldToGeo(MAP_X_MIN, MAP_Y, MAP_Z_MAX)
    const ne = worldToGeo(MAP_X_MAX, MAP_Y, MAP_Z_MIN)

    const tx0 = lonToTileX(sw.lon, ZOOM)
    const tx1 = lonToTileX(ne.lon, ZOOM)
    const ty0 = latToTileY(ne.lat, ZOOM)
    const ty1 = latToTileY(sw.lat, ZOOM)

    const { north, west } = tileBounds(tx0, ty0, ZOOM)
    const { south, east } = tileBounds(tx1, ty1, ZOOM)

    const nw = geoToWorld(north, west, MAP_Y)
    const se = geoToWorld(south, east, MAP_Y)

    return {
      tx0, ty0, tx1, ty1,
      cols: tx1 - tx0 + 1,
      rows: ty1 - ty0 + 1,
      wx0: nw.x, wx1: se.x, wz0: nw.z, wz1: se.z,
    }
  }, [])

  const { tx0, ty0, tx1, ty1, cols, rows, wx0, wx1, wz0, wz1 } = grid

  useEffect(() => {
    let cancelled = false

    const canvas = document.createElement('canvas')
    canvas.width = cols * TILE_PX
    canvas.height = rows * TILE_PX
    const ctx = canvas.getContext('2d')!

    // Draw a test pattern — red grid — so we can verify the texture pipeline
    ctx.fillStyle = '#884444'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.strokeStyle = '#FF0000'
    ctx.lineWidth = 4
    for (let c = 0; c <= cols; c++) {
      ctx.beginPath()
      ctx.moveTo(c * TILE_PX, 0)
      ctx.lineTo(c * TILE_PX, canvas.height)
      ctx.stroke()
    }
    for (let r = 0; r <= rows; r++) {
      ctx.beginPath()
      ctx.moveTo(0, r * TILE_PX)
      ctx.lineTo(canvas.width, r * TILE_PX)
      ctx.stroke()
    }

    // Create texture and apply to mesh immediately
    const tex = new THREE.CanvasTexture(canvas)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.minFilter = THREE.LinearMipmapLinearFilter
    tex.magFilter = THREE.LinearFilter
    if (meshRef.current) {
      const mat = meshRef.current.material as THREE.MeshBasicMaterial
      mat.map = tex
      mat.needsUpdate = true
    }
    setTexReady(true)

    // Now load actual tiles in the background
    async function loadTiles() {
      const tasks: Promise<{ img: HTMLImageElement; col: number; row: number } | null>[] = []
      for (let ty = ty0; ty <= ty1; ty++) {
        for (let tx = tx0; tx <= tx1; tx++) {
          const url = getTileUrl('img', tx, ty, ZOOM)
          const col = tx - tx0
          const row = ty - ty0
          tasks.push(
            fetch(url)
              .then((r) => (r.ok ? r.blob() : Promise.reject(new Error(`HTTP ${r.status}`))))
              .then((blob) => {
                const u = URL.createObjectURL(blob)
                return new Promise<HTMLImageElement>((resolve, reject) => {
                  const img = new Image()
                  img.onload = () => { URL.revokeObjectURL(u); resolve(img) }
                  img.onerror = () => { URL.revokeObjectURL(u); reject(new Error('img fail')) }
                  img.src = u
                })
              })
              .then((img) => ({ img, col, row }))
              .catch(() => null),
          )
        }
      }
      const results = await Promise.all(tasks)
      if (cancelled) return
      for (const r of results) {
        if (r) ctx.drawImage(r.img, r.col * TILE_PX, r.row * TILE_PX)
      }
      tex.needsUpdate = true
    }

    loadTiles()

    return () => {
      cancelled = true
      tex.dispose()
    }
  }, [tx0, ty0, tx1, ty1, cols, rows])

  // Smoothly tint the map based on time of day — no abrupt switch.
  const timeOfDay = useSceneStore((s) => s.timeOfDay)
  useEffect(() => {
    if (!meshRef.current) return
    const mat = meshRef.current.material as THREE.MeshBasicMaterial
    // Same smoothstep as SkyDome/Lighting: day→0, night→1, smooth in between
    let t: number
    if (timeOfDay < 0.15) {
      t = 1 // deep night
    } else if (timeOfDay < 0.25) {
      const x = (timeOfDay - 0.15) / 0.1
      t = 1 - x * x * (3 - 2 * x) // dawn transition
    } else if (timeOfDay < 0.75) {
      t = 0 // full day
    } else if (timeOfDay < 0.85) {
      const x = (timeOfDay - 0.75) / 0.1
      t = x * x * (3 - 2 * x) // dusk transition
    } else {
      t = 1 // deep night
    }
    const dayColor = new THREE.Color('#ffffff')
    const nightColor = new THREE.Color('#152B40')
    mat.color.copy(dayColor).lerp(nightColor, t)
  }, [timeOfDay, texReady])

  const pw = wx1 - wx0
  const pd = wz1 - wz0
  const cx = (wx0 + wx1) / 2
  const cz = (wz0 + wz1) / 2

  if (pw <= 0 || pd <= 0) return null

  return (
    <mesh
      ref={meshRef}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[cx, MAP_Y, cz]}
      renderOrder={0}
    >
      <planeGeometry args={[pw, pd]} />
      <meshBasicMaterial side={THREE.DoubleSide} />
    </mesh>
  )
}
