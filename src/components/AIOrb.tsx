import { motion, AnimatePresence } from 'framer-motion'
import type { VoiceState } from '@/hooks/useVoiceChat'

interface AIOrbProps {
  state: VoiceState
  onToggle: () => void
  micLevel?: number
}

const ringVariants = {
  idle: { rotate: 0, scale: 1, opacity: 0.15 },
  connecting: { rotate: 360, scale: 1, opacity: 0.3 },
  listening: { rotate: 360, scale: [1, 1.08, 1], opacity: 0.4 },
  speaking: { rotate: 360, scale: [1, 1.12, 1], opacity: 0.5 },
  executing: { rotate: 360, scale: [1, 1.05, 1], opacity: 0.4 },
  error: { rotate: 0, scale: 1, opacity: 0.2 },
}

export default function AIOrb({ state, onToggle, micLevel = 0 }: AIOrbProps) {
  const isActive = state !== 'idle' && state !== 'error'
  const orbSize = 140
  const dynamicScale = state === 'listening' ? 1 + micLevel * 0.15 : 1

  const gradientClass =
    state === 'listening' ? 'orb-gradient-listen' :
    state === 'executing' ? 'orb-gradient-exec' : 'orb-gradient'

  const shadowClass =
    state === 'listening' ? 'shadow-orb-listen' :
    state === 'speaking' ? 'shadow-orb-speak' :
    state === 'executing' ? 'shadow-orb-exec' : 'shadow-orb-idle'

  return (
    <div className="relative flex items-center justify-center" style={{ width: orbSize * 2, height: orbSize * 2 }}>
      {/* Outer ring 1 — slow rotation */}
      <motion.div
        className="absolute rounded-full border border-primary/10"
        style={{ width: orbSize * 1.8, height: orbSize * 1.8 }}
        animate={ringVariants[state]}
        transition={{ rotate: { duration: 20, repeat: Infinity, ease: 'linear' }, scale: { duration: 3, repeat: Infinity }, opacity: { duration: 0.5 } }}
      >
        {/* Dash marks */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
          <div key={deg} className="absolute w-1 h-3 bg-primary/20 rounded-full" style={{ top: 0, left: '50%', transform: `translateX(-50%) rotate(${deg}deg)`, transformOrigin: `0 ${orbSize * 0.9}px` }} />
        ))}
      </motion.div>

      {/* Outer ring 2 — counter-rotation */}
      <motion.div
        className="absolute rounded-full border border-accent/8"
        style={{ width: orbSize * 1.55, height: orbSize * 1.55 }}
        animate={{ rotate: state === 'idle' ? 0 : -360 }}
        transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
      >
        {[0, 60, 120, 180, 240, 300].map((deg) => (
          <div key={deg} className="absolute w-0.5 h-2 bg-accent/20 rounded-full" style={{ top: 0, left: '50%', transform: `translateX(-50%) rotate(${deg}deg)`, transformOrigin: `0 ${orbSize * 0.775}px` }} />
        ))}
      </motion.div>

      {/* Ripple rings (listening) */}
      <AnimatePresence>
        {state === 'listening' && (
          <>
            <motion.div key="rip1" className="absolute rounded-full border border-accent/25" style={{ width: orbSize, height: orbSize }}
              initial={{ scale: 1, opacity: 0.5 }} animate={{ scale: 2, opacity: 0 }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeOut' }} />
            <motion.div key="rip2" className="absolute rounded-full border border-accent/15" style={{ width: orbSize, height: orbSize }}
              initial={{ scale: 1, opacity: 0.3 }} animate={{ scale: 2.4, opacity: 0 }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeOut', delay: 0.8 }} />
          </>
        )}
        {state === 'speaking' && (
          <>
            <motion.div key="sp1" className="absolute rounded-full border-2 border-primary/30" style={{ width: orbSize, height: orbSize }}
              initial={{ scale: 1, opacity: 0.5 }} animate={{ scale: 1.6, opacity: 0 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }} />
            <motion.div key="sp2" className="absolute rounded-full border border-primary/20" style={{ width: orbSize, height: orbSize }}
              initial={{ scale: 1, opacity: 0.3 }} animate={{ scale: 1.9, opacity: 0 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut', delay: 0.4 }} />
          </>
        )}
      </AnimatePresence>

      {/* Core orb */}
      <motion.button
        onClick={onToggle}
        animate={{
          scale: state === 'speaking' ? [1, 1.06, 1] : state === 'connecting' ? [1, 1.03, 1] : dynamicScale,
        }}
        transition={{
          scale: state === 'speaking' ? { duration: 0.8, repeat: Infinity } : state === 'connecting' ? { duration: 1.2, repeat: Infinity } : { duration: 0.15 },
        }}
        whileHover={{ scale: isActive ? undefined : 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={`relative rounded-full cursor-pointer transition-shadow duration-500 ${gradientClass} ${shadowClass}`}
        style={{ width: orbSize, height: orbSize }}
      >
        {/* Inner highlight */}
        <div className="absolute inset-3 rounded-full bg-gradient-to-br from-white/10 to-transparent" />

        {/* Center icon area */}
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.span
            key={state}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-white/70 text-xs font-medium tracking-widest uppercase"
          >
            {state === 'idle' && 'START'}
            {state === 'connecting' && 'LINK'}
            {state === 'listening' && 'LIVE'}
            {state === 'speaking' && 'AI'}
            {state === 'executing' && 'RUN'}
            {state === 'error' && 'ERR'}
          </motion.span>
        </div>
      </motion.button>

      {/* State label below orb */}
      <motion.div
        className="absolute -bottom-2 left-1/2 -translate-x-1/2"
        key={state}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <span className={`text-[10px] tracking-[0.2em] uppercase font-medium ${
          state === 'listening' ? 'text-accent' :
          state === 'speaking' ? 'text-primary' :
          state === 'executing' ? 'text-amber-400' :
          state === 'error' ? 'text-red-400' : 'text-white/30'
        }`}>
          {state === 'idle' ? 'tap to begin' :
           state === 'connecting' ? 'establishing link...' :
           state === 'listening' ? 'listening' :
           state === 'speaking' ? 'responding' :
           state === 'executing' ? 'executing action' :
           'connection error'}
        </span>
      </motion.div>
    </div>
  )
}
