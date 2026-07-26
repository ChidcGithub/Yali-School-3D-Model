import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { useSceneStore } from '@/store/sceneStore'
import {
  TILE_NAMES,
  downloadTileTexts,
  downloadTileGLB,
  parseTile,
  setTileBaseFromProxy,
  type TileTexts,
} from '@/three/tiles'

const IS_SAFARI = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)

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
          const parsed = parseTile(item.name, item.texts)
          if (cancelled) return
          // Incremental mount — the campus grows as each tile finishes parsing.
          setTiles((prev) => [...prev, parsed])
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

    // Safari: load GLB tiles in small batches to avoid exhausting
    // iOS Safari's ~6 per-host connection limit.
    if (IS_SAFARI) {
      const dl = async (name: string) => {
        try {
          const group = await downloadTileGLB(name)
          if (cancelled) return
          progressBuf[name] = { received: 1, total: 1 }
          setTileReady(name)
          setTiles((prev) => [...prev, group])
          settled += 1
          maybeFinish()
        } catch (e) {
          if (cancelled) return
          console.warn(`[tiles] GLB failed for ${name}:`, e)
          setTileError(name)
          settled += 1
          maybeFinish()
        }
      }

      const runBatch = async () => {
        for (let i = 0; i < names.length && !cancelled; i += 3) {
          const batch = names.slice(i, i + 3)
          batch.forEach((n) => setTileDownloading(n))
          await Promise.all(batch.map(dl))
        }
      }
      runBatch().catch((e) => {
        if (!cancelled) setLoadError(`Error: ${(e as Error)?.message ?? e}`)
      })
    } else {
      // Fire every download at once — no client-side concurrency limit.
    const downloadTasks = names.map(async (name) => {
      setTileDownloading(name)
      try {
        const texts = await downloadTileTexts(name, (received, total) => {
          if (cancelled) return
          progressBuf[name] = { received, total }
        })
        if (cancelled) return
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
    }

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
    <group ref={groupRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      {tiles.map((g) => (
        <primitive key={g.name} object={g} />
      ))}
    </group>
  )
}
