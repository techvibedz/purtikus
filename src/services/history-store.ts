// ---------------------------------------------------------------------------
//  Conversation history — persisted in localStorage
// ---------------------------------------------------------------------------
import type { ChatMessage } from '@/components/ConversationPanel'

const STORAGE_KEY = 'purtikus_history'
const MAX_SESSIONS = 100

export interface ConversationSession {
  id: string
  title: string
  startedAt: number
  endedAt: number
  messages: ChatMessage[]
  toolsUsed: string[]
  messageCount: number
}

/** Generate a human-readable title from conversation messages */
function generateTitle(messages: ChatMessage[]): string {
  // Find first meaningful AI or tool message
  const toolMsg = messages.find(m => m.type === 'tool')
  if (toolMsg) return toolMsg.content.length > 60 ? toolMsg.content.slice(0, 57) + '...' : toolMsg.content

  const aiMsg = messages.find(m => m.role === 'ai' && m.type !== 'tool_result')
  if (aiMsg) return aiMsg.content.length > 60 ? aiMsg.content.slice(0, 57) + '...' : aiMsg.content

  const statusMsg = messages.find(m => m.role === 'system' && m.content !== 'Session ended' && !m.content.includes('Validating'))
  if (statusMsg) return statusMsg.content

  return `Session ${new Date().toLocaleString()}`
}

/** Load all sessions from localStorage */
export function loadSessions(): ConversationSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/** Save a session to history */
export function saveSession(messages: ChatMessage[]): ConversationSession | null {
  // Don't save empty or trivially short sessions (just status messages)
  const meaningful = messages.filter(m => m.role !== 'system')
  if (meaningful.length === 0) return null

  const toolsUsed = [...new Set(
    messages.filter(m => m.type === 'tool').map(m => {
      const match = m.content.match(/^([a-z_]+)\(/)
      return match ? match[1] : m.content
    })
  )]

  const session: ConversationSession = {
    id: `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    title: generateTitle(messages),
    startedAt: messages[0]?.timestamp ?? Date.now(),
    endedAt: messages[messages.length - 1]?.timestamp ?? Date.now(),
    messages,
    toolsUsed,
    messageCount: messages.length,
  }

  const sessions = loadSessions()
  sessions.unshift(session) // newest first

  // Cap at MAX_SESSIONS
  if (sessions.length > MAX_SESSIONS) sessions.length = MAX_SESSIONS

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions))
  } catch {
    // If storage is full, remove oldest half and retry
    sessions.length = Math.floor(sessions.length / 2)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions))
  }

  return session
}

/** Delete a single session by ID */
export function deleteSession(sessionId: string): void {
  const sessions = loadSessions().filter(s => s.id !== sessionId)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions))
}

/** Clear all history */
export function clearAllHistory(): void {
  localStorage.removeItem(STORAGE_KEY)
}

/** Format relative time */
export function relativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  const weeks = Math.floor(days / 7)
  if (weeks < 5) return `${weeks}w ago`
  return new Date(timestamp).toLocaleDateString()
}

/** Format duration */
export function formatDuration(startMs: number, endMs: number): string {
  const secs = Math.round((endMs - startMs) / 1000)
  if (secs < 60) return `${secs}s`
  const mins = Math.floor(secs / 60)
  const remSecs = secs % 60
  return `${mins}m ${remSecs}s`
}
