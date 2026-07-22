import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { useSceneStore } from '@/store/sceneStore'
import { TILE_NAMES, loadTile } from '@/three/tiles'
import { generateViewpoints } from '@/three/viewpoints'

// Loads all OBJ tiles, re-centers the assembled model so the campus sits at the
// origin with ground at y=0, then publishes generated viewpoints to the store.
export function TileModels() {
  const [tiles, setTiles] = useState<THREE.Group[]>([])
  const groupRef = useRef<THREE.Group>(null)

  const setProgress = useSceneStore((s) => s.setProgress)
  const setLoaded = useSceneStore((s) => s.setLoaded)
  const setLoadError = useSceneStore((s) => s.setLoadError)
  const selectViewpoint = useSceneStore((s) => s.selectViewpoint)

  // Queue-based loader. Concurrency is deliberately 1: OBJLoader parses each
  // large OBJ synchronously on the main thread (multi-second blocks). With >1
  // worker, while one tile is parsing the main thread is blocked and the
  // browser starves/aborts the other in-flight fetches (net::ERR_ABORTED).
  // Serial download→parse guarantees no fetch is in flight during a parse.
  // A tile failing its retries does NOT cascade; a second pass retries fails.
  useEffect(() => {
    let cancelled = false
    let loaded = 0
    const collected: THREE.Group[] = new Array(TILE_NAMES.length)
    const LIMIT = 1

    async function runPass(indices: number[]): Promise<number[]> {
      const stillFailed: number[] = []
      let cursor = 0
      async function worker() {
        while (cursor < indices.length) {
          const i = indices[cursor++]
          try {
            const g = await loadTile(TILE_NAMES[i])
            if (cancelled) return
            collected[i] = g
            loaded += 1
            if (!cancelled) setProgress(loaded, TILE_NAMES.length)
          } catch {
            if (cancelled) return
            stillFailed.push(i)
          }
        }
      }
      await Promise.all(
        Array.from({ length: Math.min(LIMIT, indices.length) }, () => worker()),
      )
      return stillFailed
    }

    (async () => {
      const all = TILE_NAMES.map((_, i) => i)
      let failed = await runPass(all)
      // Recovery pass: by now most connections are idle, so retries that
      // aborted under contention earlier usually succeed.
      if (!cancelled && failed.length > 0) {
        failed = await runPass(failed)
      }
      if (cancelled) return
      const got = collected.filter(Boolean)
      if (got.length === 0) {
        setLoadError(
          `${failed.length} 个瓦片加载失败：${failed.map((i) => TILE_NAMES[i]).join(', ')}`,
        )
        return
      }
      if (failed.length > 0) {
        // Partial load: surface a non-fatal note but still render what we have.
        console.warn(`[tiles] ${failed.length} 个瓦片未能加载：`, failed.map((i) => TILE_NAMES[i]))
      }
      setTiles(got)
    })()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Once tiles are rendered into the group, recenter & generate viewpoints.
  useEffect(() => {
    if (tiles.length === 0 || !groupRef.current) return
    const grp = groupRef.current

    // OBJ ENU coords are Z-up; rotate so height maps to three.js Y-up.
    grp.rotation.set(-Math.PI / 2, 0, 0)
    grp.position.set(0, 0, 0)
    grp.updateWorldMatrix(true, true)

    // Ensure every geometry has bounding data for accurate Box3 / culling.
    grp.traverse((c) => {
      const m = c as THREE.Mesh
      if (m.isMesh && m.geometry) m.geometry.computeBoundingBox()
    })

    const box = new THREE.Box3().setFromObject(grp)
    const center = new THREE.Vector3()
    box.getCenter(center)
    // Center horizontally and drop ground to y = 0.
    grp.position.set(-center.x, -box.min.y, -center.z)
    grp.updateWorldMatrix(true, true)

    const centeredBox = new THREE.Box3().setFromObject(grp)
    const viewpoints = generateViewpoints(centeredBox)
    setLoaded(viewpoints)
    // Intro: fly into the first (aerial) viewpoint.
    if (viewpoints[0]) selectViewpoint(viewpoints[0].id)
  }, [tiles, setLoaded, selectViewpoint])

  return (
    <group ref={groupRef}>
      {tiles.map((g) => (
        <primitive key={g.name} object={g} />
      ))}
    </group>
  )
}
