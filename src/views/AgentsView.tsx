import { motion } from 'framer-motion'
import { Brain, Code, FileText, Image, Music, Globe } from 'lucide-react'

const agents = [
  { name: 'Code Assistant', desc: 'Write, debug, and refactor code', icon: <Code size={24} />, color: 'from-blue-500/20 to-cyan-500/20' },
  { name: 'Writer', desc: 'Draft articles, emails, and content', icon: <FileText size={24} />, color: 'from-purple-500/20 to-pink-500/20' },
  { name: 'Image Analyst', desc: 'Describe and analyze images', icon: <Image size={24} />, color: 'from-orange-500/20 to-yellow-500/20' },
  { name: 'Researcher', desc: 'Deep-dive into any topic', icon: <Globe size={24} />, color: 'from-green-500/20 to-emerald-500/20' },
  { name: 'Music Helper', desc: 'Lyrics, chords, and theory', icon: <Music size={24} />, color: 'from-red-500/20 to-rose-500/20' },
  { name: 'Reasoning', desc: 'Complex logic and problem solving', icon: <Brain size={24} />, color: 'from-violet-500/20 to-indigo-500/20' },
]

export default function AgentsView() {
  return (
    <div>
      <h1 className="text-2xl font-bold neon-text-violet mb-2">Agents</h1>
      <p className="text-white/40 text-sm mb-8">Specialized AI agents for different tasks</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map((agent, i) => (
          <motion.div
            key={agent.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            whileHover={{ y: -4, scale: 1.02 }}
            className="glass rounded-xl p-5 cursor-pointer group hover:shadow-neon-glow transition-shadow"
          >
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${agent.color} border border-glass-border flex items-center justify-center mb-4 group-hover:shadow-neon-violet transition-shadow`}>
              <span className="text-white/70 group-hover:text-white transition-colors">
                {agent.icon}
              </span>
            </div>
            <h3 className="text-white/90 font-semibold mb-1">{agent.name}</h3>
            <p className="text-white/40 text-sm">{agent.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
