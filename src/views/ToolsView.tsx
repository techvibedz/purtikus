import { useState } from 'react'
import { motion } from 'framer-motion'
import { Terminal, Calculator, Camera, FolderOpen, Globe, Monitor, Check, Loader2 } from 'lucide-react'

interface Tool {
  name: string
  desc: string
  icon: React.ReactNode
  action: () => Promise<string>
}

const tools: Tool[] = [
  {
    name: 'Open Terminal',
    desc: 'Launch Windows Terminal or PowerShell',
    icon: <Terminal size={20} />,
    action: async () => {
      const r = await window.electron?.pc.openApp('terminal')
      return r?.ok ? 'Terminal opened' : (r?.error || 'Failed')
    },
  },
  {
    name: 'Calculator',
    desc: 'Open Windows Calculator',
    icon: <Calculator size={20} />,
    action: async () => {
      const r = await window.electron?.pc.openApp('calculator')
      return r?.ok ? 'Calculator opened' : (r?.error || 'Failed')
    },
  },
  {
    name: 'Screenshot',
    desc: 'Capture your entire screen',
    icon: <Camera size={20} />,
    action: async () => {
      const r = await window.electron?.pc.screenshot()
      return r?.ok ? `Saved to ${(r as { path?: string }).path}` : (r?.error || 'Failed')
    },
  },
  {
    name: 'File Explorer',
    desc: 'Open Windows File Explorer',
    icon: <FolderOpen size={20} />,
    action: async () => {
      const r = await window.electron?.pc.openApp('explorer')
      return r?.ok ? 'Explorer opened' : (r?.error || 'Failed')
    },
  },
  {
    name: 'Google',
    desc: 'Open Google in your browser',
    icon: <Globe size={20} />,
    action: async () => {
      const r = await window.electron?.pc.openUrl('https://google.com')
      return r?.ok ? 'Browser opened' : (r?.error || 'Failed')
    },
  },
  {
    name: 'System Info',
    desc: 'View system information',
    icon: <Monitor size={20} />,
    action: async () => {
      const info = await window.electron?.pc.systemInfo()
      if (!info) return 'Not available'
      return `${info.hostname} | ${info.cpuModel} | ${info.totalMemGB}GB RAM | ${info.freeMemGB}GB free`
    },
  },
]

export default function ToolsView() {
  const [running, setRunning] = useState<string | null>(null)
  const [result, setResult] = useState<{ name: string; msg: string } | null>(null)

  const handleRun = async (tool: Tool) => {
    setRunning(tool.name)
    setResult(null)
    try {
      const msg = await tool.action()
      setResult({ name: tool.name, msg })
    } catch (err) {
      setResult({ name: tool.name, msg: err instanceof Error ? err.message : 'Error' })
    }
    setRunning(null)
  }

  return (
    <div>
      <h1 className="text-2xl font-bold neon-text-blue mb-2">Tools</h1>
      <p className="text-white/40 text-sm mb-8">Quick access to system utilities</p>

      {result && (
        <motion.div
          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="glass rounded-lg px-4 py-3 mb-4 flex items-center gap-2"
        >
          <Check size={14} className="text-emerald-400" />
          <span className="text-sm text-white/70"><strong>{result.name}:</strong> {result.msg}</span>
        </motion.div>
      )}

      <div className="space-y-2">
        {tools.map((tool, i) => (
          <motion.button
            key={tool.name}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06 }}
            whileHover={{ x: 6 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleRun(tool)}
            disabled={running === tool.name}
            className="w-full glass rounded-lg px-4 py-3 flex items-center gap-4 cursor-pointer group hover:shadow-neon-blue/10 transition-shadow text-left"
          >
            <span className="text-white/40 group-hover:text-neon-blue transition-colors">
              {running === tool.name ? <Loader2 size={20} className="animate-spin" /> : tool.icon}
            </span>
            <div>
              <h3 className="text-white/80 font-medium text-sm">{tool.name}</h3>
              <p className="text-white/30 text-xs">{tool.desc}</p>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  )
}
