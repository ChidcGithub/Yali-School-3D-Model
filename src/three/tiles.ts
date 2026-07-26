import * as THREE from 'three'
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'

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

// Tile download base URL. The origin is the hosting server (localhost in dev,
// GitHub Pages in prod). A user-supplied GitHub proxy can override it at
// runtime for faster downloads in regions where GitHub is slow — the user
// pastes a proxy prefix that points at the repo's raw file tree.
//
// GitHub raw path for this repo's tile data:
//   https://raw.githubusercontent.com/ChidcGithub/Yali-School-3D-Model/main/Models/OBJ/Data
// A proxy prefix replaces the host, e.g.:
//   https://<proxy-host>/https://raw.githubusercontent.com/ChidcGithub/Yali-School-3D-Model/main/Models/OBJ/Data
// The user enters just the prefix (everything before the raw URL); we append
// the raw path here so they don't have to.
const GITHUB_RAW_BASE =
  'https://raw.githubusercontent.com/ChidcGithub/Yali-School-3D-Model/main/Models/OBJ/Data'
const ORIGIN_BASE = `${import.meta.env.BASE_URL}Models/OBJ/Data`

let activeTileBase = ORIGIN_BASE

export function getTileBase(): string {
  return activeTileBase
}
// Build the tile base from a user-entered proxy prefix. Empty string = origin.
export function setTileBaseFromProxy(proxyPrefix: string): void {
  const trimmed = proxyPrefix.trim()
  if (trimmed === '') {
    activeTileBase = ORIGIN_BASE
  } else {
    // Strip a trailing slash so concatenation doesn't double up.
    activeTileBase = `${trimmed.replace(/\/$/, '')}/${GITHUB_RAW_BASE}`
  }
}

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
//
// The Cache instance is opened ONCE and shared — calling caches.open() per
// request serializes on an internal lock, which blocks the next tile's cache
// check and therefore its fetch. With a shared instance, cache.put() writes
// run concurrently in the background without stalling the download pipeline.
let cachePromise: Promise<Cache | null> | null = null
function getCache(): Promise<Cache | null> {
  if (typeof caches === 'undefined') return Promise.resolve(null)
  if (!cachePromise) {
    cachePromise = caches.open(CACHE_NAME).catch(() => null)
  }
  return cachePromise
}

async function getCachedText(url: string): Promise<string | null> {
  const cache = await getCache()
  if (!cache) return null
  try {
    const cached = await cache.match(url)
    return cached ? await cached.text() : null
  } catch {
    return null
  }
}

// Fire-and-forget: writes to the cache in the background so it never blocks the
// download → parse → mount pipeline. Errors are swallowed.
function setCachedText(url: string, text: string): void {
  void getCache().then((cache) => {
    if (!cache) return
    const res = new Response(text, { headers: { 'Content-Type': 'text/plain' } })
    cache.put(url, res).catch(() => {})
  })
}

export interface TileTexts {
  mtl: string
  obj: string
  // The base URL that successfully downloaded these files. parseTile uses it
  // as the resource path for texture loading so textures come from the same
  // source that delivered the mesh (not a dead proxy).
  base: string
}

// Downloads .mtl + .obj text for a tile, persisting to the Cache API so the
// next visit loads from disk. The .obj is the dominant payload (tens of MB),
// so its byte progress is forwarded to onProgress; the .mtl is a few hundred
// bytes and not worth streaming. Cache hits resolve instantly and report 100%.
//
// Download and parse are deliberately separate: this function only fetches
// text, so all 18 tiles can download concurrently without main-thread parse
// work blocking the network. Parsing happens later, serially, in parseTile.
//
// Fallback: if a proxy is set and the fetch fails (common with flaky mirrors),
// the retry automatically falls back to the origin URL so a bad proxy never
// hard-blocks loading — it just slows it down.
export async function downloadTileTexts(
  tileName: string,
  onProgress?: (received: number, total: number) => void,
): Promise<TileTexts> {
  // Build the candidate base URLs: proxy first (if set), then origin as the
  // fallback. Each retry advances to the next candidate.
  const proxyBase = getTileBase()
  const candidates = proxyBase === ORIGIN_BASE ? [ORIGIN_BASE] : [proxyBase, ORIGIN_BASE]

  let lastErr: unknown
  for (let ci = 0; ci < candidates.length; ci++) {
    const base = candidates[ci]
    const isLastCandidate = ci === candidates.length - 1
    try {
      return await withRetry(
        `${tileName}${candidates.length > 1 ? ` (${base === ORIGIN_BASE ? 'origin' : 'proxy'})` : ''}`,
        async () => {
          const dir = `${base}/${tileName}`
          const mtlUrl = `${dir}/${tileName}.mtl`
          const objUrl = `${dir}/${tileName}.obj`

          // Check cache for both files first — a full hit skips the network.
          const [cachedMtl, cachedObj] = await Promise.all([getCachedText(mtlUrl), getCachedText(objUrl)])
          if (cachedMtl != null && cachedObj != null) {
            const total = cachedMtl.length + cachedObj.length
            onProgress?.(total, total)
            return { mtl: cachedMtl, obj: cachedObj, base }
          }

          // .mtl is tiny — fetch without progress, cache if fetched fresh.
          let mtlText: string
          if (cachedMtl != null) {
            mtlText = cachedMtl
          } else {
            mtlText = await fetchTextWithProgress(mtlUrl)
            setCachedText(mtlUrl, mtlText)
          }

          // .obj is the big one — stream it for byte-level progress, cache after.
          let objText: string
          if (cachedObj != null) {
            objText = cachedObj
            const total = mtlText.length + objText.length
            onProgress?.(total, total)
          } else {
            objText = await fetchTextWithProgress(objUrl, (received, total) => {
              onProgress?.(received, total)
            })
            setCachedText(objUrl, objText)
          }

          return { mtl: mtlText, obj: objText, base }
        },
        // Fewer retries per candidate when there's a fallback available, so we
        // don't waste time hammering a dead proxy before moving to origin.
        isLastCandidate ? 5 : 2,
        500,
      )
    } catch (e) {
      lastErr = e
      if (!isLastCandidate) {
        console.warn(`[tiles] ${tileName}: proxy failed, falling back to origin`)
      }
    }
  }
  throw lastErr
}

// Parses already-downloaded tile text into a THREE.Group. OBJLoader.parse runs
// synchronously on the main thread (multi-second blocks for 50MB meshes), so
// callers MUST run this serially — never parse two tiles at once, or the main
// thread stalls and in-flight fetches can be aborted by the browser.
export function parseTile(tileName: string, texts: TileTexts): THREE.Group {
  // Use the base that actually delivered the files, so textures resolve to
  // the same source (not a dead proxy that fell back to origin for the mesh).
  const dir = `${texts.base}/${tileName}`
  const mtlLoader = new MTLLoader()
  mtlLoader.setResourcePath(`${dir}/`)
  const materials = mtlLoader.parse(texts.mtl, `${dir}/`)
  materials.preload()

  const objLoader = new OBJLoader()
  objLoader.setMaterials(materials)
  const group = objLoader.parse(texts.obj)
  group.name = tileName

  // Photogrammetry meshes: ensure bounding data exists for frustum culling
  // and Box3 computation; add fresnel edge fade to soften hard polygon edges.
  group.traverse((child) => {
    const mesh = child as THREE.Mesh
    if (mesh.isMesh) {
      mesh.frustumCulled = true
      if (mesh.geometry) mesh.geometry.computeBoundingBox()
      const mat = mesh.material as THREE.MeshPhongMaterial | undefined
      if (mat) {
        mat.side = THREE.FrontSide
        mat.transparent = true
        mat.depthWrite = true
        mat.onBeforeCompile = (shader) => {
          shader.fragmentShader = shader.fragmentShader.replace(
            '#include <output_fragment>',
            `
            float _fresnel = 1.0 - abs(dot(normalize(vNormal), normalize(vViewDirection)));
            float _edgeFade = 1.0 - smoothstep(0.25, 0.65, _fresnel);
            gl_FragColor.a *= _edgeFade;
            #include <output_fragment>
            `
          )
        }
      }
    }
  })
  return group
}

// ─── GLB loader for Safari ──────────────────────────────────────────────────

const IOS_BASE = `${import.meta.env.BASE_URL}Models/optimized_for_IOS`

export async function downloadTileGLB(tileName: string): Promise<THREE.Group> {
  const url = `${IOS_BASE}/${tileName}.glb`

  let arrayBuffer: ArrayBuffer
  try {
    const cached = await getCachedBlob(url)
    if (cached) { arrayBuffer = await cached.arrayBuffer() }
    else {
      const res = await fetch(url, { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const blob = await res.blob()
      setCachedBlob(url, blob)
      arrayBuffer = await blob.arrayBuffer()
    }
  } catch (e) {
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const blob = await res.blob()
    arrayBuffer = await blob.arrayBuffer()
  }

  const loader = new GLTFLoader()
  loader.setMeshoptDecoder(MeshoptDecoder)
  const gltf = await loader.parseAsync(arrayBuffer, '')
  gltf.scene.name = tileName
  return gltf.scene
}

// Cache helpers for GLB blobs.
async function getCachedBlob(url: string): Promise<Blob | null> {
  const cache = await getCache()
  if (!cache) return null
  try {
    const res = await cache.match(url)
    return res ? res.blob() : null
  } catch { return null }
}

function setCachedBlob(url: string, blob: Blob): void {
  void getCache().then((cache) => {
    if (!cache) return
    cache.put(url, new Response(blob)).catch(() => {})
  })
}
