import * as THREE from 'three'
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'

// Tile directories under Models/OBJ/Data (scanned from the project folder).
export const TILE_NAMES = [
  'Tile_+000_+001',
  'Tile_+000_+002',
  'Tile_+000_+003',
  'Tile_+001_+000',
  'Tile_+001_+001',
  'Tile_+001_+002',
  'Tile_+001_+003',
  'Tile_+001_+004',
  'Tile_+002_+000',
  'Tile_+002_+001',
  'Tile_+002_+002',
  'Tile_+002_+003',
  'Tile_+002_+004',
  'Tile_+003_+000',
  'Tile_+003_+001',
  'Tile_+003_+002',
  'Tile_+003_+003',
  'Tile_+003_+004',
] as const

// BASE_URL is '/' in dev and the repo subpath (e.g. '/Yali-School-3D-Model/')
// when built for GitHub Pages, so model URLs resolve correctly in both.
export const TILE_BASE = `${import.meta.env.BASE_URL}Models/OBJ/Data`

// Served by Vite's publicDir via a directory junction `public/Models` -> `Models`
// (see vite.config.ts header comment).
// Retries with capped exponential backoff + jitter. The dev server can abort
// in-flight large OBJ fetches (net::ERR_ABORTED); a short backoff lets the
// connection settle so the retry succeeds. Each attempt is logged so retry
// activity is visible in the console during diagnosis.
async function withRetry<T>(label: string, fn: () => Promise<T>, retries = 5, delay = 500): Promise<T> {
  let lastErr: unknown
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await fn()
      if (attempt > 0) console.log(`[tiles] ${label} succeeded on attempt ${attempt + 1}`)
      return result
    } catch (e) {
      lastErr = e
      console.warn(`[tiles] ${label} attempt ${attempt + 1}/${retries + 1} failed: ${(e as Error)?.message ?? e}`)
      if (attempt < retries) {
        const jitter = Math.random() * 150
        await new Promise((r) => setTimeout(r, delay * (attempt + 1) + jitter))
      }
    }
  }
  throw lastErr
}

// Manual fetch with cache:'no-store' bypasses browser cache revalidation
// (the dev server sends Cache-Control: no-cache + ETag, whose conditional
// 304 path interacts badly with three's FileLoader under load). Every fetch is
// a fresh, unconditional 200 so retries are real downloads, not cached stubs.
async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  return res.text()
}

export async function loadTile(tileName: string): Promise<THREE.Group> {
  return withRetry(tileName, async () => {
    const dir = `${TILE_BASE}/${tileName}`

    const mtlText = await fetchText(`${dir}/${tileName}.mtl`)
    const mtlLoader = new MTLLoader()
    mtlLoader.setResourcePath(`${dir}/`)
    const materials = mtlLoader.parse(mtlText, `${dir}/`)
    materials.preload()

    const objText = await fetchText(`${dir}/${tileName}.obj`)
    const objLoader = new OBJLoader()
    objLoader.setMaterials(materials)
    const group = objLoader.parse(objText)
    group.name = tileName

    // Photogrammetry meshes: ensure bounding data exists for frustum culling
    // and Box3 computation; tweak material for slightly softer shading.
    group.traverse((child) => {
      const mesh = child as THREE.Mesh
      if (mesh.isMesh) {
        mesh.frustumCulled = true
        if (mesh.geometry) mesh.geometry.computeBoundingBox()
        const mat = mesh.material as THREE.MeshPhongMaterial | undefined
        if (mat) {
          mat.side = THREE.FrontSide
        }
      }
    })
    return group
  })
}
