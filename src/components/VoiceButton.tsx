import { motion, AnimatePresence } from 'framer-motion'
import { Mic, MicOff, Loader2, Volume2, Cog } from 'lucide-react'
import type { VoiceState } from '@/hooks/useVoiceChat'

interface VoiceButtonProps {
  state: VoiceState
  onToggle: () => void
  error: string | null
  lastToolCall?: string | null
}

const stateConfig: Record<VoiceState, { color: string; bg: string; shadow: string; label: string }> = {
  idle: {
    color: 'text-white/60',
    bg: 'bg-white/5',
    shadow: '',
    label: 'Start voice',
  },
  connecting: {
    color: 'text-neon-violet',
    bg: 'bg-neon-violet/10',
    shadow: 'shadow-neon-violet',
    label: 'Connecting...',
  },
  listening: {
    color: 'text-neon-blue',
    bg: 'bg-neon-blue/10',
    shadow: 'shadow-neon-blue',
    label: 'Listening...',
  },
  speaking: {
    color: 'text-neon-violet',
    bg: 'bg-neon-violet/15',
    shadow: 'shadow-neon-violet',
    label: 'Speaking...',
  },
  executing: {
    color: 'text-amber-400',
    bg: 'bg-amber-400/10',
    shadow: 'shadow-[0_0_15px_rgba(251,191,36,0.3)]',
    label: 'Executing...',
  },
  error: {
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    shadow: '',
    label: 'Error — tap to retry',
  },
}

export default function VoiceButton({ state, onToggle, error, lastToolCall }: VoiceButtonProps) {
  const config = stateConfig[state]
  const isActive = state === 'listening' || state === 'speaking' || state === 'connecting' || state === 'executing'

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Main button */}
      <div className="relative">
        {/* Pulse rings for active states */}
        <AnimatePresence>
          {state === 'listening' && (
            <>
              <motion.div
                key="ring1"
                className="absolute inset-0 rounded-full border-2 border-neon-blue/30"
                initial={{ scale: 1, opacity: 0.6 }}
                animate={{ scale: 2.2, opacity: 0 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
              />
              <motion.div
                key="ring2"
                className="absolute inset-0 rounded-full border-2 border-neon-blue/20"
                initial={{ scale: 1, opacity: 0.4 }}
                animate={{ scale: 2.8, opacity: 0 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeOut', delay: 0.5 }}
              />
            </>
          )}
          {state === 'speaking' && (
            <>
              <motion.div
                key="speak-ring1"
                className="absolute inset-0 rounded-full border-2 border-neon-violet/30"
                initial={{ scale: 1, opacity: 0.6 }}
                animate={{ scale: 1.8, opacity: 0 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
              />
              <motion.div
                key="speak-ring2"
                className="absolute inset-0 rounded-full border-2 border-neon-violet/20"
                initial={{ scale: 1, opacity: 0.4 }}
                animate={{ scale: 2.2, opacity: 0 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut', delay: 0.3 }}
              />
            </>
          )}
          {state === 'executing' && (
            <>
              <motion.div
                key="exec-ring1"
                className="absolute inset-0 rounded-full border-2 border-amber-400/30"
                initial={{ scale: 1, opacity: 0.6 }}
                animate={{ scale: 1.6, opacity: 0 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'easeOut' }}
              />
              <motion.div
                key="exec-ring2"
                className="absolute inset-0 rounded-full border-2 border-amber-400/20"
                initial={{ scale: 1, opacity: 0.4 }}
                animate={{ scale: 2.0, opacity: 0 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'easeOut', delay: 0.2 }}
              />
            </>
          )}
        </AnimatePresence>

        <motion.button
          onClick={onToggle}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          className={`
            relative z-10 w-16 h-16 rounded-full flex items-center justify-center
            border border-glass-border transition-all duration-300
            ${config.bg} ${config.shadow}
          `}
        >
          {state === 'connecting' ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            >
              <Loader2 size={24} className={config.color} />
            </motion.div>
          ) : state === 'executing' ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            >
              <Cog size={24} className={config.color} />
            </motion.div>
          ) : state === 'speaking' ? (
            <motion.div
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ duration: 0.8, repeat: Infinity }}
            >
              <Volume2 size={24} className={config.color} />
            </motion.div>
          ) : isActive ? (
            <Mic size={24} className={config.color} />
          ) : state === 'error' ? (
            <MicOff size={24} className={config.color} />
          ) : (
            <Mic size={24} className={config.color} />
          )}
        </motion.button>
      </div>

      {/* Status label */}
      <motion.span
        key={state}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className={`text-xs font-medium ${config.color}`}
      >
        {config.label}
      </motion.span>

      {/* Tool call indicator */}
      <AnimatePresence>
        {lastToolCall && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-400/10 border border-amber-400/20"
          >
            <Cog size={10} className="text-amber-400/70" />
            <span className="text-amber-400/70 text-[10px] font-medium">
              {lastToolCall}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error message */}
      <AnimatePresence>
        {error && state === 'error' && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="text-red-400/70 text-xs text-center max-w-[240px] leading-relaxed"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}
