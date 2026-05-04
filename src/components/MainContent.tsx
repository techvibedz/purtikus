import { motion, AnimatePresence } from 'framer-motion'
import ChatView from '@/views/ChatView'
import AgentsView from '@/views/AgentsView'
import ToolsView from '@/views/ToolsView'
import HistoryView from '@/views/HistoryView'
import FilesView from '@/views/FilesView'
import SparksView from '@/views/SparksView'
import SettingsView from '@/views/SettingsView'

interface MainContentProps {
  activeSection: string
}

const views: Record<string, React.ReactNode> = {
  chat: <ChatView />,
  agents: <AgentsView />,
  tools: <ToolsView />,
  history: <HistoryView />,
  files: <FilesView />,
  sparks: <SparksView />,
  settings: <SettingsView />,
}

export default function MainContent({ activeSection }: MainContentProps) {
  return (
    <main className="flex-1 overflow-hidden relative">
      {/* Ambient glow effects */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-neon-violet/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-neon-blue/5 rounded-full blur-3xl pointer-events-none" />

      <AnimatePresence mode="wait">
        <motion.div
          key={activeSection}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="h-full overflow-y-auto p-6 relative z-10"
        >
          {views[activeSection] ?? <ChatView />}
        </motion.div>
      </AnimatePresence>
    </main>
  )
}
