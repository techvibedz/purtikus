import { useState, useEffect } from 'react'
import { Minus, Square, X, Copy } from 'lucide-react'

export default function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    window.electron?.isMaximized().then(setIsMaximized)
    window.electron?.onMaximizeChange(setIsMaximized)
  }, [])

  return (
    <div className="drag-region flex items-center justify-between h-9 bg-deep-black/80 border-b border-glass-border px-3 select-none shrink-0">
      {/* App title */}
      <div className="flex items-center gap-2 no-drag">
        <div className="w-4 h-4 rounded-full bg-gradient-to-br from-neon-blue to-neon-violet shadow-neon-violet" />
        <span className="text-xs font-semibold tracking-wider text-white/80 uppercase">
          Purtikus
        </span>
      </div>

      {/* Window controls */}
      <div className="flex items-center no-drag">
        <button
          onClick={() => window.electron?.minimize()}
          className="flex items-center justify-center w-10 h-9 hover:bg-white/10 transition-colors"
          aria-label="Minimize"
        >
          <Minus size={14} className="text-white/60" />
        </button>
        <button
          onClick={() => window.electron?.maximize()}
          className="flex items-center justify-center w-10 h-9 hover:bg-white/10 transition-colors"
          aria-label="Maximize"
        >
          {isMaximized ? (
            <Copy size={12} className="text-white/60" />
          ) : (
            <Square size={12} className="text-white/60" />
          )}
        </button>
        <button
          onClick={() => window.electron?.close()}
          className="flex items-center justify-center w-10 h-9 hover:bg-red-500/80 transition-colors"
          aria-label="Close"
        >
          <X size={14} className="text-white/60" />
        </button>
      </div>
    </div>
  )
}
