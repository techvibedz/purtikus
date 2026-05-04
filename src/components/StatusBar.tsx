import { motion } from 'framer-motion'
import { Wifi, WifiOff, Mic, Cog, Volume2, AlertCircle, Radio } from 'lucide-react'
import type { VoiceState } from '@/hooks/useVoiceChat'

interface StatusBarProps {
  state: VoiceState
  micLevel: number
  lastToolCall: string | null
  error: string | null
}

const stateInfo: Record<VoiceState, { label: string; color: string; icon: React.ReactNode }> = {
  idle:       { label: 'OFFLINE',      color: 'text-white/30', icon: <WifiOff size={12} /> },
  connecting: { label: 'CONNECTING',   color: 'text-amber-400', icon: <Radio size={12} className="animate-pulse" /> },
  listening:  { label: 'LISTENING',    color: 'text-accent',   icon: <Mic size={12} /> },
  speaking:   { label: 'AI SPEAKING',  color: 'text-primary',  icon: <Volume2 size={12} /> },
  executing:  { label: 'EXECUTING',    color: 'text-amber-400', icon: <Cog size={12} className="animate-spin" /> },
  error:      { label: 'ERROR',        color: 'text-red-400',  icon: <AlertCircle size={12} /> },
}

export default function StatusBar({ state, micLevel, lastToolCall, error }: StatusBarProps) {
  const info = stateInfo[state]
  const isOnline = state !== 'idle' && state !== 'error'

  return (
    <div className="flex items-center gap-4 px-4 py-2 glass rounded-lg text-[11px] font-mono tracking-wider">
      {/* Connection indicator */}
      <div className={`flex items-center gap-1.5 ${info.color}`}>
        <motion.div
          className={`w-1.5 h-1.5 rounded-full ${
            isOnline ? 'bg-emerald-400' : state === 'error' ? 'bg-red-400' : 'bg-white/20'
          }`}
          animate={isOnline ? { opacity: [1, 0.4, 1] } : {}}
          transition={{ duration: 2, repeat: Infinity }}
        />
        {info.icon}
        <span>{info.label}</span>
      </div>

      {/* Separator */}
      <div className="w-px h-3 bg-white/10" />

      {/* Mic level */}
      <div className="flex items-center gap-1.5 text-white/40">
        <Mic size={10} />
        <div className="w-16 h-1.5 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-accent to-primary"
            animate={{ width: `${Math.max(2, micLevel * 100)}%` }}
            transition={{ duration: 0.1 }}
          />
        </div>
      </div>

      {/* Separator */}
      <div className="w-px h-3 bg-white/10" />

      {/* Current action */}
      <div className="flex-1 truncate">
        {lastToolCall ? (
          <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-amber-400/70">
            <Cog size={10} className="inline mr-1 animate-spin" />
            {lastToolCall}
          </motion.span>
        ) : error ? (
          <span className="text-red-400/60">{error}</span>
        ) : isOnline ? (
          <span className="text-white/20">Ready</span>
        ) : (
          <span className="text-white/15">Tap the orb to connect</span>
        )}
      </div>

      {/* Session indicator */}
      {isOnline && (
        <div className="flex items-center gap-1 text-white/20">
          <Wifi size={10} />
          <span>Gemini 2.5</span>
        </div>
      )}
    </div>
  )
}
