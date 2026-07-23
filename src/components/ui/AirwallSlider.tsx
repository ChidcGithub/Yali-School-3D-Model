import { useSceneStore } from '@/store/sceneStore'

// TEMP debug panel for tuning the airwall boundary — independent min/max per
// axis, range -3000..3000. Once values are found, they'll be hardcoded in
// sceneStore and this component deleted.
export function AirwallSlider() {
  const airwallX = useSceneStore((s) => s.airwallX)
  const airwallY = useSceneStore((s) => s.airwallY)
  const airwallZ = useSceneStore((s) => s.airwallZ)
  const setAirwall = useSceneStore((s) => s.setAirwall)
  const camX = useSceneStore((s) => s.camX)
  const camY = useSceneStore((s) => s.camY)
  const camZ = useSceneStore((s) => s.camZ)
  const tgtX = useSceneStore((s) => s.tgtX)
  const tgtY = useSceneStore((s) => s.tgtY)
  const tgtZ = useSceneStore((s) => s.tgtZ)
  const tileProgress = useSceneStore((s) => s.tileProgress)
  const totalTiles = useSceneStore((s) => s.totalTiles)
  const readyCount = Object.values(tileProgress).filter((t) => t.status === 'ready').length
  const errCount = Object.values(tileProgress).filter((t) => t.status === 'error').length

  const fmt = (n: number) => (n >= 0 ? ' ' : '') + n.toFixed(0).padStart(4, ' ')

  // Each axis is a {min, max} pair. Sliders are -3000..3000, independent.
  const axes: { id: 'x' | 'y' | 'z'; label: string; color: string; min: number; max: number }[] = [
    { id: 'x', label: 'X', color: 'text-red-400', min: airwallX.min, max: airwallX.max },
    { id: 'y', label: 'Y', color: 'text-green-400', min: airwallY.min, max: airwallY.max },
    { id: 'z', label: 'Z', color: 'text-blue-400', min: airwallZ.min, max: airwallZ.max },
  ]

  return (
    <div className="pointer-events-auto fixed bottom-4 left-1/2 z-50 -translate-x-1/2 bg-ink-900/95 px-4 py-3">
      <div className="mb-2 font-mono text-[9px] uppercase tracking-metro text-fog/50">
        AIRWALL · MIN/MAX PER AXIS
      </div>
      <div className="flex gap-4">
        {axes.map((a) => (
          <div key={a.id} className="flex flex-col items-center gap-1">
            <span className={`font-mono text-[10px] font-bold ${a.color}`}>{a.label}</span>
            <label className="flex items-center gap-1 font-mono text-[9px] text-fog/60">
              <span>min</span>
              <input
                type="range"
                min={-3000}
                max={3000}
                step={10}
                value={a.min}
                onChange={(e) => setAirwall(a.id, { min: Number(e.target.value), max: a.max })}
                className="h-1 w-20 cursor-pointer appearance-none bg-ink-600 accent-amber"
              />
              <span className="w-8 tabular-nums text-fog/80">{a.min}</span>
            </label>
            <label className="flex items-center gap-1 font-mono text-[9px] text-fog/60">
              <span>max</span>
              <input
                type="range"
                min={-3000}
                max={3000}
                step={10}
                value={a.max}
                onChange={(e) => setAirwall(a.id, { min: a.min, max: Number(e.target.value) })}
                className="h-1 w-20 cursor-pointer appearance-none bg-ink-600 accent-amber"
              />
              <span className="w-8 tabular-nums text-fog/80">{a.max}</span>
            </label>
          </div>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-0.5 font-mono text-[9px] tabular-nums">
        <div className="text-fog/50">CAM</div>
        <div className="text-fog/50">TGT</div>
        <div>
          <span className="text-red-400/60">x</span>
          <span className="text-fog/80">{fmt(camX)}</span>
        </div>
        <div>
          <span className="text-red-400/60">x</span>
          <span className="text-fog/80">{fmt(tgtX)}</span>
        </div>
        <div>
          <span className="text-green-400/60">y</span>
          <span className="text-fog/80">{fmt(camY)}</span>
        </div>
        <div>
          <span className="text-green-400/60">y</span>
          <span className="text-fog/80">{fmt(tgtY)}</span>
        </div>
        <div>
          <span className="text-blue-400/60">z</span>
          <span className="text-fog/80">{fmt(camZ)}</span>
        </div>
        <div>
          <span className="text-blue-400/60">z</span>
          <span className="text-fog/80">{fmt(tgtZ)}</span>
        </div>
      </div>
      <div className="mt-1 font-mono text-[9px] text-fog/50">
        TILES: <span className="text-fog/80">{readyCount}</span>/{totalTiles}
        {errCount > 0 && <span className="text-red-400"> (err:{errCount})</span>}
      </div>
    </div>
  )
}
