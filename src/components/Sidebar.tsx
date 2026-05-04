import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageSquare,
  Brain,
  Settings,
  History,
  Sparkles,
  FolderOpen,
  ChevronLeft,
  ChevronRight,
  Zap,
} from 'lucide-react'

interface NavItem {
  id: string
  label: string
  icon: React.ReactNode
}

const navItems: NavItem[] = [
  { id: 'chat', label: 'Chat', icon: <MessageSquare size={20} /> },
  { id: 'agents', label: 'Agents', icon: <Brain size={20} /> },
  { id: 'tools', label: 'Tools', icon: <Zap size={20} /> },
  { id: 'history', label: 'History', icon: <History size={20} /> },
  { id: 'files', label: 'Files', icon: <FolderOpen size={20} /> },
  { id: 'sparks', label: 'Sparks', icon: <Sparkles size={20} /> },
]

interface SidebarProps {
  activeSection: string
  onSectionChange: (id: string) => void
}

export default function Sidebar({ activeSection, onSectionChange }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 220 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="glass flex flex-col h-full shrink-0 overflow-hidden"
    >
      {/* Logo area */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-glass-border">
        <motion.div
          className="w-8 h-8 rounded-lg bg-gradient-to-br from-neon-blue to-neon-violet flex items-center justify-center shadow-neon-violet shrink-0"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          <span className="text-white font-bold text-sm">P</span>
        </motion.div>
        <AnimatePresence>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="text-sm font-semibold neon-text-violet whitespace-nowrap"
            >
              Purtikus AI
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Nav items */}
      <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = activeSection === item.id
          return (
            <motion.button
              key={item.id}
              onClick={() => onSectionChange(item.id)}
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.97 }}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200
                ${isActive
                  ? 'bg-gradient-to-r from-neon-violet/20 to-neon-blue/10 text-neon-blue shadow-neon-blue/20'
                  : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                }
              `}
            >
              <span className={`shrink-0 ${isActive ? 'text-neon-blue' : ''}`}>
                {item.icon}
              </span>
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="text-sm font-medium whitespace-nowrap"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
              {isActive && !collapsed && (
                <motion.div
                  layoutId="activeIndicator"
                  className="ml-auto w-1.5 h-1.5 rounded-full bg-neon-blue shadow-neon-blue"
                />
              )}
            </motion.button>
          )
        })}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-glass-border p-2 space-y-1">
        <motion.button
          onClick={() => onSectionChange('settings')}
          whileHover={{ x: 4 }}
          className={`
            w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200
            ${activeSection === 'settings'
              ? 'bg-gradient-to-r from-neon-violet/20 to-neon-blue/10 text-neon-blue'
              : 'text-white/50 hover:text-white/80 hover:bg-white/5'
            }
          `}
        >
          <Settings size={20} className="shrink-0" />
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="text-sm font-medium whitespace-nowrap"
              >
                Settings
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center py-2 text-white/30 hover:text-white/60 transition-colors"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>
    </motion.aside>
  )
}
