import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  MessageSquare, Clock, Trash2, ArrowLeft, Search,
  Cog, CheckCircle2, XCircle, Info, Mic, Volume2, TrashIcon,
} from 'lucide-react'
import {
  loadSessions, deleteSession, clearAllHistory,
  relativeTime, formatDuration,
  type ConversationSession,
} from '@/services/history-store'
import type { ChatMessage } from '@/components/ConversationPanel'

/** Detect if text contains Arabic/RTL characters */
const ARABIC_RE = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/
function isRTL(text: string): boolean { return ARABIC_RE.test(text) }

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function MessageBubble({ msg }: { msg: ChatMessage }) {
  if (msg.role === 'system') {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1 justify-center">
        <Info size={9} className="text-white/20" />
        <span className="text-[10px] text-white/20 font-mono">{msg.content}</span>
        <span className="text-[8px] text-white/10 font-mono">{formatTime(msg.timestamp)}</span>
      </div>
    )
  }

  if (msg.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] bg-accent/10 border border-accent/20 rounded-xl rounded-tr-sm px-3 py-2">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Mic size={10} className="text-accent/60" />
            <span className="text-[9px] text-accent/50 font-mono">{formatTime(msg.timestamp)}</span>
          </div>
          <p className="text-accent/80 text-xs" dir={isRTL(msg.content) ? 'rtl' : undefined}>
            {msg.content}
          </p>
        </div>
      </div>
    )
  }

  // AI message
  return (
    <div className="flex justify-start">
      <div className="max-w-[80%] bg-primary/10 border border-primary/20 rounded-xl rounded-tl-sm px-3 py-2">
        <div className="flex items-center gap-1.5 mb-0.5">
          {msg.type === 'tool' ? (
            <Cog size={10} className="text-amber-400/60" />
          ) : msg.type === 'tool_result' ? (
            msg.success ? <CheckCircle2 size={10} className="text-emerald-400/60" /> : <XCircle size={10} className="text-red-400/60" />
          ) : (
            <Volume2 size={10} className="text-primary/60" />
          )}
          <span className="text-[9px] text-primary/50 font-mono">{formatTime(msg.timestamp)}</span>
        </div>
        <p
          className={`text-xs ${
            msg.type === 'tool' ? 'text-amber-400/70 font-mono' :
            msg.type === 'tool_result' ? (msg.success ? 'text-emerald-400/70' : 'text-red-400/70') :
            'text-primary/80'
          }`}
          dir={isRTL(msg.content) ? 'rtl' : undefined}
        >
          {msg.content}
        </p>
      </div>
    </div>
  )
}

export default function HistoryView() {
  const [sessions, setSessions] = useState<ConversationSession[]>([])
  const [selected, setSelected] = useState<ConversationSession | null>(null)
  const [search, setSearch] = useState('')
  const [confirmClear, setConfirmClear] = useState(false)

  const refresh = useCallback(() => {
    setSessions(loadSessions())
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const handleDelete = (id: string) => {
    deleteSession(id)
    if (selected?.id === id) setSelected(null)
    refresh()
  }

  const handleClearAll = () => {
    if (!confirmClear) {
      setConfirmClear(true)
      setTimeout(() => setConfirmClear(false), 3000)
      return
    }
    clearAllHistory()
    setSelected(null)
    setConfirmClear(false)
    refresh()
  }

  const filtered = search
    ? sessions.filter(s =>
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.toolsUsed.some(t => t.toLowerCase().includes(search.toLowerCase())) ||
      s.messages.some(m => m.content.toLowerCase().includes(search.toLowerCase()))
    )
    : sessions

  // ── Detail view ──
  if (selected) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-3 mb-4">
          <motion.button
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={() => setSelected(null)}
            className="glass rounded-lg p-2 hover:border-neon-violet/30 transition-all"
          >
            <ArrowLeft size={16} className="text-white/50" />
          </motion.button>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-white/80 truncate">{selected.title}</h2>
            <div className="flex items-center gap-3 text-[10px] text-white/30 font-mono mt-0.5">
              <span>{new Date(selected.startedAt).toLocaleString()}</span>
              <span>{formatDuration(selected.startedAt, selected.endedAt)}</span>
              <span>{selected.messageCount} msgs</span>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={() => handleDelete(selected.id)}
            className="glass rounded-lg p-2 hover:border-red-500/30 transition-all"
          >
            <Trash2 size={14} className="text-red-400/50" />
          </motion.button>
        </div>

        {selected.toolsUsed.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {selected.toolsUsed.map(t => (
              <span key={t} className="text-[9px] font-mono bg-amber-400/10 text-amber-400/60 border border-amber-400/20 px-2 py-0.5 rounded-full">
                {t}
              </span>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto space-y-1.5 px-1 py-2 glass rounded-xl p-3">
          {selected.messages.map((msg) => (
            <MessageBubble key={msg.id} msg={msg} />
          ))}
        </div>
      </div>
    )
  }

  // ── List view ──
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-2xl font-bold neon-text-violet mb-1">History</h1>
          <p className="text-white/40 text-sm">
            {sessions.length === 0 ? 'No conversations yet' : `${sessions.length} conversation${sessions.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        {sessions.length > 0 && (
          <motion.button
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={handleClearAll}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all ${
              confirmClear
                ? 'bg-red-500/20 border border-red-500/40 text-red-400'
                : 'glass hover:border-red-500/20 text-white/30 hover:text-red-400/60'
            }`}
          >
            <TrashIcon size={12} />
            {confirmClear ? 'Click again to confirm' : 'Clear all'}
          </motion.button>
        )}
      </div>

      {sessions.length > 3 && (
        <div className="relative mb-4">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search history..."
            className="w-full glass rounded-lg pl-9 pr-4 py-2 text-sm text-white/70 placeholder:text-white/20 focus:outline-none focus:border-neon-violet/30 transition-all"
          />
        </div>
      )}

      {sessions.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-white/15">
          <MessageSquare size={40} className="mb-3 opacity-30" />
          <p className="text-xs font-mono tracking-wider">START A VOICE SESSION TO BUILD HISTORY</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-white/20 text-xs font-mono">
          NO MATCHES FOR &quot;{search}&quot;
        </div>
      ) : (
        <div className="space-y-2 flex-1 overflow-y-auto">
          {filtered.map((session, i) => (
            <motion.div
              key={session.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="glass rounded-lg px-4 py-3 cursor-pointer group hover:border-neon-violet/30 transition-all"
            >
              <div className="flex items-center justify-between" onClick={() => setSelected(session)}>
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <MessageSquare size={16} className="text-white/30 group-hover:text-neon-violet transition-colors shrink-0" />
                  <div className="min-w-0 flex-1">
                    <span className="text-white/70 text-sm group-hover:text-white/90 transition-colors block truncate">
                      {session.title}
                    </span>
                    {session.toolsUsed.length > 0 && (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {session.toolsUsed.slice(0, 4).map(t => (
                          <span key={t} className="text-[8px] font-mono text-amber-400/40 bg-amber-400/5 px-1.5 rounded">
                            {t}
                          </span>
                        ))}
                        {session.toolsUsed.length > 4 && (
                          <span className="text-[8px] font-mono text-white/20">+{session.toolsUsed.length - 4}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-3">
                  <div className="text-white/30 text-xs text-right">
                    <div className="flex items-center gap-1 justify-end">
                      <span>{session.messageCount} msgs</span>
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Clock size={10} />
                      <span className="text-[10px]">{relativeTime(session.startedAt)}</span>
                    </div>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                    onClick={(e) => { e.stopPropagation(); handleDelete(session.id) }}
                    className="p-1.5 rounded-md hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 size={12} className="text-red-400/40 hover:text-red-400/80" />
                  </motion.button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
