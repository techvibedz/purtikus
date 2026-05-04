import { motion } from 'framer-motion'
import { Globe, Camera, FolderOpen, Search, FileText, Monitor, Keyboard, Lock } from 'lucide-react'

interface QuickAction {
  label: string
  icon: React.ReactNode
  action: () => Promise<void>
  color: string
}

interface QuickActionsProps {
  disabled?: boolean
}

const actions: QuickAction[] = [
  {
    label: 'Chrome',
    icon: <Globe size={16} />,
    color: 'text-accent',
    action: async () => { await window.electron?.pc.openApp('chrome') },
  },
  {
    label: 'Screenshot',
    icon: <Camera size={16} />,
    color: 'text-primary',
    action: async () => { await window.electron?.pc.screenshot() },
  },
  {
    label: 'Explorer',
    icon: <FolderOpen size={16} />,
    color: 'text-accent',
    action: async () => { await window.electron?.pc.openApp('explorer') },
  },
  {
    label: 'Google',
    icon: <Search size={16} />,
    color: 'text-primary',
    action: async () => { await window.electron?.pc.openUrl('https://google.com') },
  },
  {
    label: 'Notepad',
    icon: <FileText size={16} />,
    color: 'text-accent',
    action: async () => { await window.electron?.pc.openApp('notepad') },
  },
  {
    label: 'System',
    icon: <Monitor size={16} />,
    color: 'text-primary',
    action: async () => { await window.electron?.pc.systemInfo() },
  },
  {
    label: 'Terminal',
    icon: <Keyboard size={16} />,
    color: 'text-accent',
    action: async () => { await window.electron?.pc.openApp('terminal') },
  },
  {
    label: 'Lock',
    icon: <Lock size={16} />,
    color: 'text-primary',
    action: async () => { await window.electron?.pc.pressShortcut('win+l') },
  },
]

export default function QuickActions({ disabled }: QuickActionsProps) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {actions.map((act, i) => (
        <motion.button
          key={act.label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04 }}
          whileHover={disabled ? {} : { scale: 1.05, y: -2 }}
          whileTap={disabled ? {} : { scale: 0.95 }}
          onClick={() => !disabled && act.action()}
          disabled={disabled}
          className={`
            flex flex-col items-center gap-1.5 py-3 px-2 rounded-lg
            border border-white/5 transition-all duration-200
            ${disabled
              ? 'opacity-30 cursor-not-allowed bg-white/[0.02]'
              : 'bg-white/[0.02] hover:bg-white/[0.06] hover:border-primary/20 cursor-pointer'}
          `}
        >
          <span className={disabled ? 'text-white/20' : act.color}>{act.icon}</span>
          <span className="text-[10px] font-medium text-white/40 tracking-wide">{act.label}</span>
        </motion.button>
      ))}
    </div>
  )
}
