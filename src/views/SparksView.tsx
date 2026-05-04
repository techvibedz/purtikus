import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Lightbulb, Wand2, Copy, Check } from 'lucide-react'

const prompts = [
  'Open Chrome and search for the weather in Algiers',
  'Take a screenshot of my desktop',
  'List all files on my Desktop',
  'Open Notepad and type a quick todo list',
  'واش تقدر تفتحلي Chrome؟',
  'دير لي screenshot ديال الشاشة',
  'Create a new text file on the Desktop with a grocery list',
  'Open the calculator app',
  'Search Google for "best restaurants in Oran"',
  'Press Ctrl+Shift+Esc to open Task Manager',
]

export default function SparksView() {
  const [copied, setCopied] = useState<string | null>(null)

  const handleCopy = async (prompt: string) => {
    await navigator.clipboard.writeText(prompt)
    setCopied(prompt)
    setTimeout(() => setCopied(null), 1500)
  }

  return (
    <div>
      <h1 className="text-2xl font-bold neon-text-violet mb-2">Sparks</h1>
      <p className="text-white/40 text-sm mb-8">Say these to Purtikus during a voice session — or click to copy</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {prompts.map((prompt, i) => (
          <motion.button
            key={prompt}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleCopy(prompt)}
            className="glass rounded-lg px-4 py-3 text-left text-sm text-white/60 hover:text-white/90 hover:border-neon-violet/30 transition-all flex items-start gap-3"
          >
            <Lightbulb size={14} className="text-neon-violet/50 mt-0.5 shrink-0" />
            <span className="flex-1">{prompt}</span>
            <AnimatePresence mode="wait">
              {copied === prompt ? (
                <motion.span key="check" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                  <Check size={12} className="text-emerald-400 shrink-0 mt-0.5" />
                </motion.span>
              ) : (
                <motion.span key="copy" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <Copy size={12} className="text-white/20 shrink-0 mt-0.5" />
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        ))}
      </div>

      {/* Feature cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass rounded-xl p-6"
        >
          <Sparkles size={24} className="text-neon-blue mb-3" />
          <h3 className="text-white/80 font-semibold mb-1">Voice Commands</h3>
          <p className="text-white/35 text-sm">Say any of these prompts during a voice session to control your PC</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass rounded-xl p-6"
        >
          <Wand2 size={24} className="text-neon-violet mb-3" />
          <h3 className="text-white/80 font-semibold mb-1">Multi-Language</h3>
          <p className="text-white/35 text-sm">Speak in English, Arabic, or Darija — Purtikus understands all three</p>
        </motion.div>
      </div>
    </div>
  )
}
