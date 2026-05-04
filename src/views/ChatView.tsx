import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquare, Zap, ChevronDown, ChevronUp, Ear, Monitor, MonitorOff } from 'lucide-react'
import AIOrb from '@/components/AIOrb'
import WaveformVisualizer from '@/components/WaveformVisualizer'
import StatusBar from '@/components/StatusBar'
import ConversationPanel from '@/components/ConversationPanel'
import QuickActions from '@/components/QuickActions'
import { useVoiceChat } from '@/hooks/useVoiceChat'
import { useApiKey } from '@/hooks/useApiKey'
import { useWakeWord } from '@/hooks/useWakeWord'

export default function ChatView() {
  const { apiKey } = useApiKey()
  const {
    voiceState, error, lastToolCall, messages,
    micLevel, screenSharing, getAnalyser, toggle, start, toggleScreenShare,
  } = useVoiceChat(apiKey)

  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null)
  const [showLog, setShowLog] = useState(true)

  // Wake word activates voice chat when idle
  const handleWake = useCallback(() => {
    if (voiceState === 'idle' || voiceState === 'error') {
      start()
    }
  }, [voiceState, start])

  const wakeWordEnabled = (voiceState === 'idle' || voiceState === 'error') && !!apiKey
  const { isListening: wakeListening, detected: wakeDetected, isSupported: wakeSupported } = useWakeWord(handleWake, wakeWordEnabled)

  // Refresh analyser reference when state changes
  useEffect(() => {
    if (voiceState === 'listening' || voiceState === 'speaking') {
      const a = getAnalyser()
      if (a && a !== analyser) setAnalyser(a)
    } else if (voiceState === 'idle') {
      setAnalyser(null)
    }
  }, [voiceState, getAnalyser, analyser])

  const isActive = voiceState !== 'idle' && voiceState !== 'error'

  return (
    <div className="flex flex-col h-full cmd-grid-bg overflow-hidden">
      {/* ── Status Bar ── */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <StatusBar state={voiceState} micLevel={micLevel} lastToolCall={lastToolCall} error={error} />
      </motion.div>

      {/* ── Orb + Waveform (visual centerpiece) ── */}
      <div className="flex-1 flex flex-col items-center justify-center min-h-0">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.15 }}
        >
          <AIOrb state={voiceState} onToggle={toggle} micLevel={micLevel} />
        </motion.div>

        {/* Screen share toggle — shown during active session */}
        <AnimatePresence>
          {isActive && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={toggleScreenShare}
              className={`mt-3 flex items-center gap-2 px-4 py-2 rounded-full border transition-all text-xs font-mono tracking-wide ${
                screenSharing
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.15)]'
                  : 'border-white/10 bg-white/[0.03] text-white/30 hover:text-white/60 hover:border-white/20'
              }`}
            >
              {screenSharing ? <Monitor size={14} /> : <MonitorOff size={14} />}
              {screenSharing ? 'SCREEN SHARING ON' : 'SHARE SCREEN'}
            </motion.button>
          )}
        </AnimatePresence>

        {/* API key warning */}
        <AnimatePresence>
          {!apiKey && voiceState === 'idle' && (
            <motion.p
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-white/25 text-[10px] mt-4 tracking-wider font-mono"
            >
              SET API KEY IN SETTINGS TO BEGIN
            </motion.p>
          )}
        </AnimatePresence>

        {/* Wake word indicator */}
        <AnimatePresence>
          {wakeSupported && wakeListening && voiceState === 'idle' && apiKey && (
            <motion.div
              initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/5"
            >
              <Ear size={10} className="text-accent/40" />
              <span className="text-[10px] text-white/25 font-mono tracking-wider">
                {wakeDetected
                  ? `WAKE: "${wakeDetected}" — ACTIVATING...`
                  : 'SAY "مرحبا" OR "HEY ASSISTANT"'}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Waveform */}
        <motion.div
          className="w-full max-w-lg mt-2 px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <WaveformVisualizer analyser={analyser} state={voiceState} />
        </motion.div>
      </div>

      {/* ── Bottom Section: Log + Quick Actions ── */}
      <div className="flex-shrink-0 flex flex-col gap-2 mt-1">
        {/* Conversation Log Header */}
        <div className="flex items-center justify-between px-1">
          <button
            onClick={() => setShowLog(!showLog)}
            className="flex items-center gap-1.5 text-[10px] text-white/25 hover:text-white/40 transition-colors font-mono tracking-widest uppercase"
          >
            <MessageSquare size={10} />
            <span>Conversation Log ({messages.length})</span>
            {showLog ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
          </button>
          {isActive && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex items-center gap-1 text-[10px] text-emerald-400/40 font-mono"
            >
              <div className="w-1 h-1 bg-emerald-400/50 rounded-full animate-pulse" />
              LIVE
            </motion.div>
          )}
        </div>

        {/* Conversation Panel */}
        <AnimatePresence>
          {showLog && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="flex-1 min-h-0 glass rounded-lg overflow-hidden"
            >
              <div className="h-full max-h-[220px] overflow-y-auto px-2">
                <ConversationPanel messages={messages} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex items-center gap-1.5 mb-2 px-1">
            <Zap size={10} className="text-white/20" />
            <span className="text-[10px] text-white/20 font-mono tracking-widest uppercase">Quick Actions</span>
          </div>
          <QuickActions disabled={false} />
        </motion.div>
      </div>
    </div>
  )
}
