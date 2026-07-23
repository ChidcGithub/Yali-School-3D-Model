// Tianditu WMTS tile helpers — coordinate transforms, URL building, tile
// fetching with Cache API persistence.

console.log('[mapTiles] module loaded')

const TIANDITU_KEY = 'df0e02dee65638ae3114edb704fc2f8c'

// Geographic anchor from Models/OBJ/metadata.xml <SRS>
const ANCHOR_LAT = 28.17219
const ANCHOR_LON = 112.98458

// SRSOrigin from metadata — the model's local origin (0,0,0) sits at this ENU
// offset, so OBJ vertex coords stay in a manageable numeric range.
const SRS_OX = -444 // ENU east offset of model origin
const SRS_OY = -510 // ENU north offset of model origin

const METERS_PER_DEG_LAT = 111319.5
const COS_ANCHOR = Math.cos(ANCHOR_LAT * (Math.PI / 180))
const METERS_PER_DEG_LON = METERS_PER_DEG_LAT * COS_ANCHOR

// ---- Coordinate transforms -------------------------------------------------

// three.js world → geographic. The model group is rotated -π/2 around X, so:
//   world_x = local_x   world_y = local_z   world_z = -local_y
// where local_xyz are the OBJ vertex coordinates.
// ENU = (local_x - 444, local_y - 510, local_z + 28), giving:
export function worldToGeo(wx: number, _wy: number, wz: number) {
  const enx = wx + SRS_OX   // ENU east
  const eny = -wz + SRS_OY   // ENU north (world_z = -local_y)
  const lat = ANCHOR_LAT + eny / METERS_PER_DEG_LAT
  const lon = ANCHOR_LON + enx / METERS_PER_DEG_LON
  return { lat, lon }
}

// geographic → three.js world (inverse of worldToGeo). The Y (elevation)
// component is not recoverable from lat/lon alone; caller supplies it.
export function geoToWorld(lat: number, lon: number, wy: number) {
  const enx = (lon - ANCHOR_LON) * METERS_PER_DEG_LON  // ENU east
  const eny = (lat - ANCHOR_LAT) * METERS_PER_DEG_LAT  // ENU north
  const wx = enx - SRS_OX
  const wz = -(eny - SRS_OY)
  return { x: wx, y: wy, z: wz }
}

// ---- Web Mercator tile helpers ---------------------------------------------

export function lonToTileX(lon: number, zoom: number): number {
  const n = Math.pow(2, zoom)
  return Math.floor(((lon + 180) / 360) * n)
}

export function latToTileY(lat: number, zoom: number): number {
  const n = Math.pow(2, zoom)
  const latRad = (lat * Math.PI) / 180
  return Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n,
  )
}

// Top-left corner of a tile in geographic coords.
export function tileXToLon(tx: number, zoom: number): number {
  const n = Math.pow(2, zoom)
  return (tx / n) * 360 - 180
}

export function tileYToLat(ty: number, zoom: number): number {
  const n = Math.pow(2, zoom)
  return (Math.atan(Math.sinh(Math.PI * (1 - (2 * ty) / n))) * 180) / Math.PI
}

// Full tile bounds {north, south, west, east}.
export function tileBounds(tx: number, ty: number, zoom: number) {
  return {
    north: tileYToLat(ty, zoom),
    south: tileYToLat(ty + 1, zoom),
    west: tileXToLon(tx, zoom),
    east: tileXToLon(tx + 1, zoom),
  }
}

// ---- Tianditu WMTS URLs ----------------------------------------------------

// layer: 'img' = satellite image, 'cia' = Chinese annotation overlay
export function getTileUrl(
  layer: 'img' | 'cia',
  tx: number,
  ty: number,
  zoom: number,
): string {
  const sub = Math.abs(tx + ty) % 8
  return `https://t${sub}.tianditu.gov.cn/DataServer?T=${layer}_w&x=${tx}&y=${ty}&l=${zoom}&tk=${TIANDITU_KEY}`
}

// ---- Cache API helpers -----------------------------------------------------

const MAP_CACHE_NAME = 'yali-maptiles-v1'

let mapCachePromise: Promise<Cache | null> | null = null
function getMapCache(): Promise<Cache | null> {
  if (typeof caches === 'undefined') return Promise.resolve(null)
  if (!mapCachePromise) {
    mapCachePromise = caches.open(MAP_CACHE_NAME).catch(() => null)
  }
  return mapCachePromise
}

// Load a tile blob from cache, returning null on miss or error.
async function getCachedBlob(url: string): Promise<Blob | null> {
  const cache = await getMapCache()
  if (!cache) return null
  try {
    const res = await cache.match(url)
    if (!res) return null
    return res.blob()
  } catch {
    return null
  }
}

// Write a blob to cache (fire-and-forget, errors silently swallowed).
function setCachedBlob(url: string, blob: Blob): void {
  void getMapCache().then((cache) => {
    if (!cache) return
    const res = new Response(blob)
    cache.put(url, res).catch(() => {})
  })
}

// ---- Tile fetching ---------------------------------------------------------

export interface TileImage {
  tx: number
  ty: number
  zoom: number
  image: HTMLImageElement
}

// Fetch a single tile as an HTMLImageElement, with cache-first strategy and
// retry on failure.
export async function fetchTileImage(
  layer: 'img' | 'cia',
  tx: number,
  ty: number,
  zoom: number,
): Promise<HTMLImageElement> {
  const url = getTileUrl(layer, tx, ty, zoom)
  console.log('[mapTiles] fetching %s/%d/%d/%d → %s', layer, zoom, tx, ty, url.substring(0, 80))

  // Attempt cache read
  try {
    const cachedBlob = await getCachedBlob(url)
    if (cachedBlob) {
      console.log('[mapTiles] cache hit for %d/%d/%d', zoom, tx, ty)
      const objectUrl = URL.createObjectURL(cachedBlob)
      return loadImage(objectUrl).finally(() => URL.revokeObjectURL(objectUrl))
    }
  } catch {
    // Fall through to network
  }

  // Network fetch with retry
  let lastErr: unknown
  for (let attempt = 0; attempt <= 2; attempt++) {
    try {
      console.log('[mapTiles] fetch attempt %d for %d/%d/%d', attempt + 1, zoom, tx, ty)
      const res = await fetch(url, { cache: 'no-cache' })
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }
      const blob = await res.blob()
      console.log('[mapTiles] fetched %d/%d/%d: %d bytes', zoom, tx, ty, blob.size)
      setCachedBlob(url, blob) // fire-and-forget
      const objectUrl = URL.createObjectURL(blob)
      return loadImage(objectUrl).finally(() => URL.revokeObjectURL(objectUrl))
    } catch (e) {
      lastErr = e
      console.warn('[mapTiles] attempt %d failed for %d/%d/%d: %s', attempt + 1, zoom, tx, ty, (e as Error)?.message ?? e)
      if (attempt < 2) {
        await new Promise((r) => setTimeout(r, 500 * (attempt + 1)))
      }
    }
  }
  throw lastErr
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`))
    img.src = src
  })
}
