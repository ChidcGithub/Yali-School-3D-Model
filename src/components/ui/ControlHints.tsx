import { useEffect, useState } from 'react'
import { Mouse, X } from 'lucide-react'
import { useSceneStore } from '@/store/sceneStore'
import { cn } from '@/lib/utils'

export function ControlHints() {
  const showHints = useSceneStore((s) => s.showHints)
  const dismissHints = useSceneStore((s) => s.dismissHints)
  const [collapsed, setCollapsed] = useState(false)

  // Auto-dismiss after a while.
  useEffect(() => {
    if (!showHints) return
    const t = setTimeout(() => dismissHints(), 9000)
    return () => clearTimeout(t)
  }, [showHints, dismissHints])

  if (!showHints) return null

  const rows = [
    { label: '左键拖拽', desc: '旋转视角' },
    { label: '右键拖拽', desc: '平移' },
    { label: '滚轮', desc: '缩放' },
  ]

  return (
    <div className="absolute bottom-5 right-5 z-20">
      <div className="glass rounded-sm px-4 py-3">
        <div className="mb-2 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-mono text-[9px] tracking-widest text-fog/60">
            <Mouse size={12} className="text-amber" />
            CONTROLS
          </div>
          <button
            onClick={dismissHints}
            className="text-fog/40 hover:text-amber"
            aria-label="关闭提示"
          >
            <X size={12} />
          </button>
        </div>
        {!collapsed && (
          <div className="space-y-1">
            {rows.map((r) => (
              <div
                key={r.label}
                className="flex w-44 items-center justify-between font-mono text-[10px]"
              >
                <span className="text-ink-50">{r.label}</span>
                <span className="text-fog/55">{r.desc}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
