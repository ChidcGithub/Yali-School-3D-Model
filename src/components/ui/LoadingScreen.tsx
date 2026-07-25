import { useMemo, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { useSceneStore } from '@/store/sceneStore'
import { TILE_NAMES } from '@/three/tiles'
import { cn } from '@/lib/utils'
import emblemUrl from '@/assets/emblem.png'

// Number of downloaded tiles required before the SKIP button appears. Matches
// the centering threshold in TileModels so the scene is centered by the time
// the user can enter.
const SKIP_THRESHOLD = 3

// Metro splash — pure black, a single amber brand tile that pulses, then bold
// uppercase typography, a byte-weighted overall progress bar, a per-tile status
// grid, a SKIP button once enough tiles have downloaded to enter the page, and
// a proxy input for accelerating downloads via a user-supplied GitHub mirror.
export function LoadingScreen() {
  const tileProgress = useSceneStore((s) => s.tileProgress)
  const totalTiles = useSceneStore((s) => s.totalTiles)
  const error = useSceneStore((s) => s.loadError)
  const isLoaded = useSceneStore((s) => s.isLoaded)
  const skip = useSceneStore((s) => s.skip)
  const proxyUrl = useSceneStore((s) => s.proxyUrl)
  const setProxyUrl = useSceneStore((s) => s.setProxyUrl)
  const [proxyInput, setProxyInput] = useState(proxyUrl)

  const { pct, readyCount, downloadedCount, totalReceived, totalBytes } = useMemo(() => {
    let received = 0
    let bytes = 0
    let ready = 0
    let downloaded = 0
    for (const p of Object.values(tileProgress)) {
      received += p.received
      bytes += p.total
      if (p.status === 'ready') ready += 1
      if (p.status === 'downloaded' || p.status === 'parsing' || p.status === 'ready') downloaded += 1
    }
    return {
      pct: bytes > 0 ? Math.min(100, Math.round((received / bytes) * 100)) : 0,
      readyCount: ready,
      downloadedCount: downloaded,
      totalReceived: received,
      totalBytes: bytes,
    }
  }, [tileProgress])

  const canSkip = downloadedCount >= SKIP_THRESHOLD && !isLoaded

  return (
    <div
      className={cn(
        'absolute inset-0 z-50 flex flex-col items-center justify-center bg-black transition-opacity duration-500',
        isLoaded ? 'pointer-events-none opacity-0' : 'opacity-100',
      )}
    >
      {/* Brand tile — pulsing emblem */}
      <div className="animate-metro-rise" style={{ animationDelay: '0ms' }}>
        <div className="flex h-28 w-28 items-center justify-center">
          <img src={emblemUrl} alt="YALI" className="h-full w-full object-contain animate-amber-pulse" />
        </div>
      </div>

      {/* Title */}
      <div className="animate-metro-rise mt-8 text-center" style={{ animationDelay: '80ms' }}>
        <div className="text-[32px] font-light uppercase tracking-metro text-white">
          YALI School
        </div>
        <div className="mt-2 font-mono text-[10px] uppercase tracking-metro text-fog">
          3D CAMPUS RECONSTRUCTION
        </div>
        <div className="mt-4 font-mono text-[9px] uppercase tracking-metro text-fog/40">
          BY{' '}
          <a href="https://github.com/ChidcGithub" target="_blank" rel="noopener noreferrer" className="text-amber/70 hover:text-amber transition-colors">
            CHIDCGITHUB
          </a>
          {' · '}
          <a href="https://github.com/ChidcGithub/Yali-School-3D-Model" target="_blank" rel="noopener noreferrer" className="text-amber/70 hover:text-amber transition-colors">
            PROJECT REPO
          </a>
        </div>
      </div>

      {error ? (
        <div
          className="animate-metro-rise mt-10 max-w-md px-6 text-center font-mono text-xs text-red-400"
          style={{ animationDelay: '160ms' }}
        >
          LOAD FAILED: {error}
        </div>
      ) : (
        <div className="animate-metro-rise mt-10 w-80" style={{ animationDelay: '160ms' }}>
          {/* Overall progress — byte-weighted across all concurrent downloads. */}
          <div className="font-mono text-[10px] uppercase tracking-metro text-fog/60">
            OVERALL · {readyCount}/{totalTiles || 18} READY
          </div>
          <div className="mt-1 h-1 w-full bg-ink-700">
            <div
              className="h-full bg-amber transition-[width] duration-300 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-metro text-fog">
            <span className="tabular-nums">
              {fmtBytes(totalReceived)} <span className="text-fog/60">/</span> {fmtBytes(totalBytes)}
            </span>
            <span className="tabular-nums text-amber">{pct}%</span>
          </div>

          {/* Per-tile status grid — one cell per tile, colored by state. */}
          <div className="mt-5 grid grid-cols-9 gap-1">
            {TILE_NAMES.map((name) => {
              const p = tileProgress[name]
              const st = p?.status ?? 'pending'
              const tp = p && p.total > 0 ? Math.min(100, Math.round((p.received / p.total) * 100)) : 0
              return (
                <div
                  key={name}
                  title={`${name} · ${st}${p && p.total > 0 ? ` · ${tp}%` : ''}`}
                  className={cn(
                    'h-3 w-full transition-colors duration-150',
                    st === 'ready' && 'bg-amber',
                    st === 'parsing' && 'bg-amber-soft animate-pulse',
                    st === 'downloaded' && 'bg-amber-dim',
                    st === 'downloading' && 'bg-ink-600',
                    st === 'pending' && 'bg-ink-800',
                    st === 'error' && 'bg-red-500/70',
                  )}
                  style={
                    st === 'downloading' && tp > 0
                      ? { backgroundImage: `linear-gradient(to right, #223b6c ${tp}%, #333333 ${tp}%)` }
                      : undefined
                  }
                />
              )
            })}
          </div>

          {/* SKIP button — appears once SKIP_THRESHOLD tiles have downloaded. */}
          <div className="mt-6 flex h-9 items-center justify-center">
            {canSkip ? (
              <button
                onClick={skip}
                className="metro-tile-accent group flex items-center gap-2 px-5 py-2 font-mono text-[11px] font-semibold uppercase tracking-metro text-black transition-transform hover:scale-[1.02]"
              >
                SKIP · ENTER
                <ChevronRight size={14} strokeWidth={2.5} className="transition-transform group-hover:translate-x-0.5" />
              </button>
            ) : (
              <div className="font-mono text-[10px] uppercase tracking-metro text-fog/40">
                {downloadedCount}/{SKIP_THRESHOLD} TILES TO SKIP
              </div>
            )}
          </div>

          {/* GitHub proxy input — user pastes a mirror prefix to accelerate
              downloads. Empty = use the hosting origin directly. */}
          <div className="mt-4">
            <div className="mb-1 flex items-center justify-between font-mono text-[9px] uppercase tracking-metro text-fog/40">
              <span>GITHUB PROXY</span>
              <span className={cn('tabular-nums', proxyUrl ? 'text-amber' : 'text-fog/40')}>
                {proxyUrl ? 'CUSTOM' : 'ORIGIN'}
              </span>
            </div>
            <div className="flex gap-1">
              <input
                type="text"
                value={proxyInput}
                onChange={(e) => setProxyInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && proxyInput.trim() !== proxyUrl) {
                    setProxyUrl(proxyInput.trim())
                  }
                }}
                placeholder="https://your-proxy.example"
                spellCheck={false}
                className="min-w-0 flex-1 bg-ink-800 px-2 py-1.5 font-mono text-[10px] text-fog placeholder:text-fog/30 focus:outline-none focus:bg-ink-700"
              />
              <button
                onClick={() => {
                  if (proxyInput.trim() !== proxyUrl) setProxyUrl(proxyInput.trim())
                }}
                disabled={proxyInput.trim() === proxyUrl}
                className={cn(
                  'px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-metro transition-colors',
                  proxyInput.trim() === proxyUrl
                    ? 'cursor-not-allowed bg-ink-800 text-fog/30'
                    : 'bg-amber text-white hover:bg-amber-soft',
                )}
              >
                SET
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="absolute bottom-4 w-full text-center font-mono text-[9px] text-fog/25">
        v1.94.82
        {' · '}
        <button
          onClick={async () => {
            try {
              await Promise.all([
                caches.delete('yali-tiles-v1'),
                caches.delete('yali-maptiles-v1'),
              ])
              window.location.reload()
            } catch { window.location.reload() }
          }}
          className="text-fog/25 hover:text-red-400 transition-colors uppercase"
        >
          CLEAR CACHE
        </button>
      </div>
    </div>
  )
}

function fmtBytes(n: number): string {
  if (n <= 0) return '0 B'
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}
