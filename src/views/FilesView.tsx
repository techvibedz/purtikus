import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Folder, File, ArrowUp, Home, Loader2, AlertCircle } from 'lucide-react'

interface FileEntry {
  name: string
  path: string
  isDirectory: boolean
  size: number
  modified: string | null
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

export default function FilesView() {
  const [cwd, setCwd] = useState('C:\\Users')
  const [files, setFiles] = useState<FileEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const browse = useCallback(async (dir: string) => {
    setLoading(true)
    setError(null)
    try {
      const result = await window.electron?.pc.listFiles(dir)
      if (Array.isArray(result)) {
        const sorted = (result as FileEntry[]).sort((a, b) => {
          if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1
          return a.name.localeCompare(b.name)
        })
        setFiles(sorted)
        setCwd(dir)
      } else {
        setError((result as unknown as { error?: string })?.error || 'Failed to list files')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    // Start at user's home
    window.electron?.pc.systemInfo().then((info) => {
      if (info?.homeDir) browse(info.homeDir)
      else browse('C:\\Users')
    }).catch(() => browse('C:\\Users'))
  }, [browse])

  const goUp = () => {
    const parent = cwd.replace(/\\[^\\]+$/, '') || 'C:\\'
    if (parent !== cwd) browse(parent)
  }

  const goHome = () => {
    window.electron?.pc.systemInfo().then((info) => {
      browse(info?.homeDir || 'C:\\Users')
    })
  }

  return (
    <div className="flex flex-col h-full">
      <h1 className="text-2xl font-bold neon-text-blue mb-2">Files</h1>

      {/* Breadcrumb / path bar */}
      <div className="flex items-center gap-2 mb-4">
        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={goHome}
          className="p-2 rounded-lg glass text-white/40 hover:text-white/80 transition-colors">
          <Home size={14} />
        </motion.button>
        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={goUp}
          className="p-2 rounded-lg glass text-white/40 hover:text-white/80 transition-colors">
          <ArrowUp size={14} />
        </motion.button>
        <div className="flex-1 glass rounded-lg px-3 py-2 text-xs text-white/50 font-mono truncate">
          {cwd}
        </div>
      </div>

      {error && (
        <div className="glass rounded-lg px-4 py-3 mb-4 flex items-center gap-2 border border-red-500/20">
          <AlertCircle size={14} className="text-red-400" />
          <span className="text-sm text-red-300">{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 size={24} className="text-white/20 animate-spin" />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-1">
          {files.map((f, i) => (
            <motion.button
              key={f.path}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: Math.min(i * 0.015, 0.3) }}
              onClick={() => f.isDirectory && browse(f.path)}
              className={`w-full glass rounded-lg px-3 py-2.5 flex items-center gap-3 text-left transition-all ${
                f.isDirectory ? 'cursor-pointer hover:border-neon-blue/30 hover:bg-white/[0.04]' : 'cursor-default'
              }`}
            >
              {f.isDirectory
                ? <Folder size={16} className="text-neon-blue/60 shrink-0" />
                : <File size={16} className="text-white/25 shrink-0" />
              }
              <span className="flex-1 text-sm text-white/70 truncate">{f.name}</span>
              <span className="text-[10px] text-white/20 font-mono shrink-0">
                {f.isDirectory ? 'DIR' : formatSize(f.size)}
              </span>
            </motion.button>
          ))}
          {files.length === 0 && !error && (
            <div className="text-center py-12 text-white/20 text-sm">Empty directory</div>
          )}
        </div>
      )}
    </div>
  )
}
