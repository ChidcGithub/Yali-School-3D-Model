import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { Line2 } from 'three/examples/jsm/lines/Line2'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial'
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry'
import { useSceneStore } from '@/store/sceneStore'
import {
  TILE_NAMES,
  downloadTileTexts,
  parseTile,
  setTileBaseFromProxy,
  type TileTexts,
} from '@/three/tiles'

// TEMP: visualizes the airwall boundary as a translucent red filled box with
// thin flowing red dashed edges. Removed once airwall values are hardcoded.
// Two layers:
//  1. A translucent red BoxGeometry face fill so the boundary reads as a
//     volume (visible from any distance, not just thin lines).
//  2. Thin (2px) flowing red dashed edges via Line2 + LineMaterial. WebGL
//     ignores linewidth for plain LineBasicMaterial, so Line2 is required for
//     real screen-space pixel widths. dashOffset decremented each frame so
//     dashes flow along the edges like a scanning alert border.
function AirwallBox({ bx, by, bz }: { bx: { min: number; max: number }; by: { min: number; max: number }; bz: { min: number; max: number } }) {
  const { size } = useThree()
  const center = useMemo(() => new THREE.Vector3(), [])
  const faceRef = useRef<THREE.Mesh>(null)
  const faceMatRef = useRef<THREE.MeshBasicMaterial>(null)

  const { line2, material, geometry } = useMemo(() => {
    const geo = new LineSegmentsGeometry()
    const mat = new LineMaterial({
      color: new THREE.Color('#FF1A1A'),
      linewidth: 2, // screen pixels (thin)
      dashed: true,
      dashSize: 25,
      gapSize: 15,
      transparent: true,
      opacity: 0.9,
      depthTest: true,
    })
    mat.resolution.set(size.width, size.height)
    const l = new Line2(geo, mat)
    return { line2: l, material: mat, geometry: geo }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Keep material resolution in sync with viewport (controls linewidth scaling).
  useEffect(() => {
    material.resolution.set(size.width, size.height)
  }, [size, material])

  // Rebuild edge + face geometry when bounds change.
  useEffect(() => {
    const { min: x0, max: x1 } = bx
    const { min: y0, max: y1 } = by
    const { min: z0, max: z1 } = bz
    // Face fill box
    if (faceRef.current) {
      faceRef.current.geometry.dispose()
      faceRef.current.geometry = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0)
      faceRef.current.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)
    }
    // Edge wireframe
    const v = [
      [x0, y0, z0], [x1, y0, z0], [x0, y1, z0], [x1, y1, z0],
      [x0, y0, z1], [x1, y0, z1], [x0, y1, z1], [x1, y1, z1],
    ]
    const edges: number[][] = [
      [0, 1], [0, 2], [1, 3], [2, 3], // bottom
      [4, 5], [4, 6], [5, 7], [6, 7], // top
      [0, 4], [1, 5], [2, 6], [3, 7], // verticals
    ]
    const positions: number[] = []
    for (const [a, b] of edges) positions.push(...v[a], ...v[b])
    geometry.setPositions(positions)
    line2.computeLineDistances()
    center.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)
  }, [bx, by, bz, geometry, line2, center])

  // Flow the dashes + slow pulse + distance fade.
  const NEAR = 200
  const FAR = 600
  useFrame((state, delta) => {
    material.dashOffset -= delta * 80
    const t = state.clock.elapsedTime
    const pulse = 0.8 + 0.2 * Math.sin(t * Math.PI * 2 * 0.02)
    const dist = state.camera.position.distanceTo(center)
    const fade = THREE.MathUtils.clamp(1 - (dist - NEAR) / (FAR - NEAR), 0, 1)
    const o = pulse * fade
    material.opacity = o
    if (faceMatRef.current) faceMatRef.current.opacity = o * 0.25
  })

  useEffect(() => {
    return () => {
      geometry.dispose()
      material.dispose()
    }
  }, [geometry, material])

  return (
    <group>
      <mesh ref={faceRef}>
        <meshBasicMaterial
          ref={faceMatRef}
          color="#FF1A1A"
          transparent
          opacity={0.1}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>
      <primitive object={line2} />
    </group>
  )
}

// Byte-progress flush cadence: 18 concurrent downloads each fire hundreds of
// chunks/sec, so we buffer and flush to the store at most 10x/sec.
const PROGRESS_FLUSH_MS = 100

// Concurrent download + serial parse loader.
//
// All 18 tiles are requested simultaneously (the browser multiplexes across its
// per-host connection limit on its own). Download is pure I/O — no main-thread
// work — so concurrency is safe and fast. Each download's byte progress is
// buffered and flushed to the store in a single batched update.
//
// OBJLoader.parse, by contrast, is synchronous and blocks the main thread for
// multiple seconds on a 50MB mesh. If two parses ran at once the main thread
// would stall and the browser would abort in-flight fetches. So finished
// downloads are pushed to a serial parse queue; each parse yields to the
// browser before and after so frames and pending downloads can progress.
//
// Parsed groups are mounted incrementally — the campus visibly grows as tiles
// finish. A frozen centering offset (computed once) ensures tiles added later
// land in their correct world positions without shifting the view.
export function TileModels() {
  const [tiles, setTiles] = useState<THREE.Group[]>([])
  const groupRef = useRef<THREE.Group>(null)

  const reloadKey = useSceneStore((s) => s.reloadKey)
  const proxyUrl = useSceneStore((s) => s.proxyUrl)
  const airwallX = useSceneStore((s) => s.airwallX)
  const airwallY = useSceneStore((s) => s.airwallY)
  const airwallZ = useSceneStore((s) => s.airwallZ)
  const initTiles = useSceneStore((s) => s.initTiles)
  const setTileDownloading = useSceneStore((s) => s.setTileDownloading)
  const setTileDownloaded = useSceneStore((s) => s.setTileDownloaded)
  const setTileParsing = useSceneStore((s) => s.setTileParsing)
  const setTileReady = useSceneStore((s) => s.setTileReady)
  const setTileError = useSceneStore((s) => s.setTileError)
  const batchSetProgress = useSceneStore((s) => s.batchSetProgress)
  const setLoaded = useSceneStore((s) => s.setLoaded)
  const setLoadError = useSceneStore((s) => s.setLoadError)

  useEffect(() => {
    let cancelled = false
    // Sync the active tile base to the user's proxy before any fetch.
    setTileBaseFromProxy(proxyUrl)

    // Reset local state for a clean reload.
    setTiles([])

    const names = TILE_NAMES as readonly string[]
    initTiles([...names])

    // Throttled byte-progress buffer shared by all concurrent downloads.
    const progressBuf: Record<string, { received: number; total: number }> = {}
    const flushId = window.setInterval(() => {
      const keys = Object.keys(progressBuf)
      if (keys.length === 0) return
      const snapshot: Record<string, { received: number; total: number }> = {}
      for (const k of keys) {
        snapshot[k] = progressBuf[k]
        delete progressBuf[k]
      }
      batchSetProgress(snapshot)
    }, PROGRESS_FLUSH_MS)

    // Serial parse queue — see header comment for why parsing must not overlap.
    const parseQueue: { name: string; texts: TileTexts }[] = []
    let parsing = false
    let settled = 0 // tiles that reached a terminal state (ready or error)

    const maybeFinish = () => {
      if (cancelled) return
      // Auto-enter the page when every tile has settled, in case the user
      // never hit SKIP. setLoaded is idempotent if they did.
      if (settled >= names.length) setLoaded()
    }

    const drainParse = async () => {
      if (parsing) return
      parsing = true
      while (parseQueue.length > 0 && !cancelled) {
        const item = parseQueue.shift()!
        setTileParsing(item.name)
        // Yield before the heavy synchronous parse so pending renders and
        // download-progress flushes can land first.
        await new Promise((r) => setTimeout(r, 0))
        if (cancelled) return
        try {
          const g = parseTile(item.name, item.texts)
          if (cancelled) return
          // Incremental mount — the campus grows as each tile finishes parsing.
          setTiles((prev) => [...prev, g])
          setTileReady(item.name)
        } catch (e) {
          console.warn(`[tiles] parse failed for ${item.name}:`, e)
          setTileError(item.name)
        }
        settled += 1
        // Yield after parse so the frame can paint the new geometry before the
        // next parse blocks the main thread again.
        await new Promise((r) => setTimeout(r, 0))
      }
      parsing = false
      maybeFinish()
    }

    const enqueueParse = (name: string, texts: TileTexts) => {
      parseQueue.push({ name, texts })
      void drainParse()
    }

    // Fire every download at once — no client-side concurrency limit.
    const downloadTasks = names.map(async (name) => {
      setTileDownloading(name)
      try {
        const texts = await downloadTileTexts(name, (received, total) => {
          if (cancelled) return
          progressBuf[name] = { received, total }
        })
        if (cancelled) return
        // Pin this tile to 100% so the UI doesn't lag the flush interval.
        const full = texts.obj.length + texts.mtl.length
        progressBuf[name] = { received: full, total: full }
        setTileDownloaded(name)
        enqueueParse(name, texts)
      } catch (e) {
        if (cancelled) return
        console.warn(`[tiles] download failed for ${name}:`, e)
        setTileError(name)
        settled += 1
        maybeFinish()
      }
    })

    Promise.all(downloadTasks).catch((e) => {
      if (!cancelled) setLoadError(`Download error: ${(e as Error)?.message ?? e}`)
    })

    return () => {
      cancelled = true
      window.clearInterval(flushId)
    }
  }, [
    reloadKey,
    proxyUrl,
    initTiles,
    setTileDownloading,
    setTileDownloaded,
    setTileParsing,
    setTileReady,
    setTileError,
    batchSetProgress,
    setLoaded,
    setLoadError,
  ])

  // No centering — the model stays at its raw OBJ coordinates. Only the
  // Z-up → Y-up rotation is applied. The camera initial pose and airwall
  // bounds are authored against the model's actual world position, so any
  // centering offset would shift the model away from where the user tuned it.
  // The group is pinned at position [0,0,0] with rotation only.

  return (
    <>
      <group ref={groupRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        {tiles.map((g) => (
          <primitive key={g.name} object={g} />
        ))}
      </group>
      {/* Airwall + debug markers live OUTSIDE the model group so they stay
          fixed in world space regardless of the centering offset. The model
          may shift during centering, but the airwall boundary does not. */}
      <axesHelper args={[1500]} />
      <AirwallBox bx={airwallX} by={airwallY} bz={airwallZ} />
    </>
  )
}
