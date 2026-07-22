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

// Cache API store name. Bump the version suffix to invalidate stale entries
// after a model or code change. The browser persists this across visits, so
// returning users get instant tile loads without re-downloading tens of MB.
const CACHE_NAME = 'yali-tiles-v1'

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
// When onProgress is supplied and Content-Length is known, the response body is
// streamed so the caller can report byte-level download progress.
async function fetchTextWithProgress(
  url: string,
  onProgress?: (received: number, total: number) => void,
): Promise<string> {
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  const total = Number(res.headers.get('Content-Length')) || 0
  if (!onProgress || !res.body || total === 0) {
    return res.text()
  }
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  const chunks: Uint8Array[] = []
  let received = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    if (value) {
      chunks.push(value)
      received += value.length
      onProgress(received, total)
    }
  }
  let text = ''
  for (const c of chunks) text += decoder.decode(c, { stream: true })
  text += decoder.decode() // flush
  return text
}

// Cache API helpers. Failures (quota exceeded, private mode, etc.) are silent:
// we fall back to a normal network fetch, so caching is a pure optimization.
async function getCachedText(url: string): Promise<string | null> {
  if (typeof caches === 'undefined') return null
  try {
    const cache = await caches.open(CACHE_NAME)
    const cached = await cache.match(url)
    return cached ? await cached.text() : null
  } catch {
    return null
  }
}

async function setCachedText(url: string, text: string): Promise<void> {
  if (typeof caches === 'undefined') return
  try {
    const cache = await caches.open(CACHE_NAME)
    const res = new Response(text, { headers: { 'Content-Type': 'text/plain' } })
    await cache.put(url, res)
  } catch {
    // Quota exceeded or storage unavailable — skip caching, keep loading.
  }
}

export interface TileTexts {
  mtl: string
  obj: string
}

// Downloads .mtl + .obj text for a tile, persisting to the Cache API so the
// next visit loads from disk. The .obj is the dominant payload (tens of MB),
// so its byte progress is forwarded to onProgress; the .mtl is a few hundred
// bytes and not worth streaming. Cache hits resolve instantly and report 100%.
//
// Download and parse are deliberately separate: this function only fetches
// text, so all 18 tiles can download concurrently without main-thread parse
// work blocking the network. Parsing happens later, serially, in parseTile.
export async function downloadTileTexts(
  tileName: string,
  onProgress?: (received: number, total: number) => void,
): Promise<TileTexts> {
  return withRetry(tileName, async () => {
    const dir = `${TILE_BASE}/${tileName}`
    const mtlUrl = `${dir}/${tileName}.mtl`
    const objUrl = `${dir}/${tileName}.obj`

    // Check cache for both files first — a full hit skips the network entirely.
    const [cachedMtl, cachedObj] = await Promise.all([getCachedText(mtlUrl), getCachedText(objUrl)])
    if (cachedMtl != null && cachedObj != null) {
      const total = cachedMtl.length + cachedObj.length
      onProgress?.(total, total)
      return { mtl: cachedMtl, obj: cachedObj }
    }

    // .mtl is tiny — fetch without progress, cache if we fetched it fresh.
    let mtlText: string
    if (cachedMtl != null) {
      mtlText = cachedMtl
    } else {
      mtlText = await fetchTextWithProgress(mtlUrl)
      await setCachedText(mtlUrl, mtlText)
    }

    // .obj is the big one — stream it for byte-level progress, cache after.
    let objText: string
    if (cachedObj != null) {
      objText = cachedObj
      const total = mtlText.length + objText.length
      onProgress?.(total, total)
    } else {
      objText = await fetchTextWithProgress(objUrl, (received, total) => {
        // mtl is negligible; report obj bytes directly as the tile's progress.
        onProgress?.(received, total)
      })
      await setCachedText(objUrl, objText)
    }

    return { mtl: mtlText, obj: objText }
  })
}

// Parses already-downloaded tile text into a THREE.Group. OBJLoader.parse runs
// synchronously on the main thread (multi-second blocks for 50MB meshes), so
// callers MUST run this serially — never parse two tiles at once, or the main
// thread stalls and in-flight fetches can be aborted by the browser.
export function parseTile(tileName: string, texts: TileTexts): THREE.Group {
  const dir = `${TILE_BASE}/${tileName}`
  const mtlLoader = new MTLLoader()
  mtlLoader.setResourcePath(`${dir}/`)
  const materials = mtlLoader.parse(texts.mtl, `${dir}/`)
  materials.preload()

  const objLoader = new OBJLoader()
  objLoader.setMaterials(materials)
  const group = objLoader.parse(texts.obj)
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
}
