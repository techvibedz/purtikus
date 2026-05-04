import { useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, Volume2, Cog, Info, CheckCircle2, XCircle } from 'lucide-react'

export interface ChatMessage {
  id: string
  role: 'user' | 'ai' | 'system'
  content: string
  timestamp: number
  type?: 'voice' | 'tool' | 'status' | 'error' | 'tool_result'
  success?: boolean
}

interface ConversationPanelProps {
  messages: ChatMessage[]
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

/** Detect if text contains Arabic/RTL characters */
const ARABIC_RE = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/
function isRTL(text: string): boolean {
  return ARABIC_RE.test(text)
}

export default function ConversationPanel({ messages }: ConversationPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages.length])

  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-white/15 text-xs font-mono tracking-wider">
        CONVERSATION LOG EMPTY
      </div>
    )
  }

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-1.5 px-1 py-2">
      <AnimatePresence initial={false}>
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={`flex ${msg.role === 'user' ? 'justify-end' : msg.role === 'system' ? 'justify-center' : 'justify-start'}`}
          >
            {msg.role === 'user' && (
              <div className="max-w-[80%] flex items-start gap-2">
                <div className="bg-accent/10 border border-accent/20 rounded-xl rounded-tr-sm px-3 py-2">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Mic size={10} className="text-accent/60" />
                    <span className="text-[9px] text-accent/50 font-mono">{formatTime(msg.timestamp)}</span>
                  </div>
                  <p
                    className="text-accent/80 text-xs"
                    dir={isRTL(msg.content) ? 'rtl' : undefined}
                    style={isRTL(msg.content) ? { fontFamily: "'Cairo', sans-serif" } : undefined}
                  >{msg.content}</p>
                </div>
              </div>
            )}

            {msg.role === 'ai' && (
              <div className="max-w-[80%] flex items-start gap-2">
                <div className="bg-primary/10 border border-primary/20 rounded-xl rounded-tl-sm px-3 py-2">
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
                    style={isRTL(msg.content) ? { fontFamily: "'Cairo', sans-serif" } : undefined}
                  >
                    {msg.content}
                  </p>
                </div>
              </div>
            )}

            {msg.role === 'system' && (
              <div className="flex items-center gap-1.5 px-3 py-1">
                <Info size={9} className="text-white/20" />
                <span className="text-[10px] text-white/20 font-mono">{msg.content}</span>
                <span className="text-[8px] text-white/10 font-mono">{formatTime(msg.timestamp)}</span>
              </div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
