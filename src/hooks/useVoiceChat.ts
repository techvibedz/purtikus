import { useState, useRef, useCallback, useEffect } from 'react'
import { GeminiLiveService, type ConnectionState } from '@/services/gemini-live'
import { AudioCaptureService } from '@/services/audio-capture'
import { AudioPlaybackService } from '@/services/audio-playback'
import { ScreenCaptureService } from '@/services/screen-capture'
import { executeToolCalls, type FunctionCall } from '@/services/gemini-tools'
import { saveSession } from '@/services/history-store'
import type { ChatMessage } from '@/components/ConversationPanel'

export type VoiceState = 'idle' | 'connecting' | 'listening' | 'speaking' | 'executing' | 'error'

interface UseVoiceChatReturn {
  voiceState: VoiceState
  error: string | null
  lastToolCall: string | null
  messages: ChatMessage[]
  micLevel: number
  screenSharing: boolean
  getAnalyser: () => AnalyserNode | null
  start: () => void
  stop: () => void
  toggle: () => void
  toggleScreenShare: () => void
}

let msgCounter = 0
function makeId() { return `msg_${++msgCounter}_${Date.now()}` }

export function useVoiceChat(apiKey: string): UseVoiceChatReturn {
  const [voiceState, setVoiceState] = useState<VoiceState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [lastToolCall, setLastToolCall] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [micLevel, setMicLevel] = useState(0)

  const [screenSharing, setScreenSharing] = useState(false)

  const geminiRef = useRef<GeminiLiveService | null>(null)
  const captureRef = useRef<AudioCaptureService | null>(null)
  const playbackRef = useRef<AudioPlaybackService | null>(null)
  const screenRef = useRef<ScreenCaptureService | null>(null)
  const isSpeakingRef = useRef(false)
  const levelIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const addMessage = useCallback((msg: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    setMessages((prev) => [...prev, { ...msg, id: makeId(), timestamp: Date.now() }])
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      captureRef.current?.stop()
      screenRef.current?.stop()
      geminiRef.current?.disconnect()
      playbackRef.current?.destroy()
      if (levelIntervalRef.current) clearInterval(levelIntervalRef.current)
    }
  }, [])

  const getAnalyser = useCallback((): AnalyserNode | null => {
    return captureRef.current?.getAnalyser() ?? null
  }, [])

  /** Execute tool calls from Gemini, send results back */
  const handleToolCalls = useCallback(async (calls: FunctionCall[]) => {
    console.log('[ToolCalls] Received:', calls.map(c => `${c.name}(${JSON.stringify(c.args)})`))
    const names = calls.map((c) => c.name).join(', ')
    setLastToolCall(names)
    setVoiceState('executing')

    for (const call of calls) {
      const argsStr = Object.entries(call.args).map(([k, v]) => `${k}: ${v}`).join(', ')
      addMessage({ role: 'ai', content: `${call.name}(${argsStr})`, type: 'tool' })
    }

    try {
      const responses = await executeToolCalls(calls)
      console.log('[ToolCalls] Results:', responses.map(r => `${r.id}: ${JSON.stringify(r.response).slice(0, 100)}`))
      geminiRef.current?.sendToolResponse(responses)
      console.log('[ToolCalls] Sent responses back to Gemini')

      for (const resp of responses) {
        const ok = (resp.response as { ok?: boolean }).ok !== false
        const detail = ok ? 'Success' : ((resp.response as { error?: string }).error ?? 'Failed')
        addMessage({ role: 'ai', content: detail, type: 'tool_result', success: ok })
      }
    } catch (err) {
      console.error('[ToolCalls] Error:', err)
      const msg = err instanceof Error ? err.message : 'Tool execution failed'
      setError(msg)
      addMessage({ role: 'ai', content: msg, type: 'tool_result', success: false })
    }

    setVoiceState('listening')
    setTimeout(() => setLastToolCall(null), 3000)
  }, [addMessage])

  const startingRef = useRef(false)

  const start = useCallback(async () => {
    if (!apiKey) {
      setError('API key not set. Go to Settings → API Keys.')
      setVoiceState('error')
      return
    }

    if (startingRef.current) return
    startingRef.current = true

    setError(null)
    setLastToolCall(null)
    setMessages([])
    setVoiceState('connecting')
    addMessage({ role: 'system', content: 'Validating API key...', type: 'status' })

    try {
    // Quick API key check before opening WebSocket
    const keyTest = await GeminiLiveService.testApiKey(apiKey)
    if (!keyTest.ok) {
      setError(keyTest.error || 'Invalid API key')
      addMessage({ role: 'system', content: keyTest.error || 'Invalid API key', type: 'error' })
      setVoiceState('error')
      startingRef.current = false
      return
    }

    addMessage({ role: 'system', content: 'API key valid — connecting to Gemini Live...', type: 'status' })

    // Clean up any previous instance
    if (geminiRef.current) {
      geminiRef.current.disconnect()
      geminiRef.current = null
    }

    if (!playbackRef.current) {
      playbackRef.current = new AudioPlaybackService()
    }

    geminiRef.current = new GeminiLiveService(apiKey, {
      onStateChange: (state: ConnectionState) => {
        if (state === 'connected') {
          addMessage({ role: 'system', content: 'Connected — microphone active', type: 'status' })
          startCapture()
        } else if (state === 'disconnected' && !isSpeakingRef.current) {
          // noop
        } else if (state === 'error') {
          setVoiceState('error')
        }
      },
      onAudioData: (pcmBase64: string) => {
        if (!isSpeakingRef.current) {
          addMessage({ role: 'ai', content: 'Responding...', type: 'voice' })
        }
        isSpeakingRef.current = true
        setVoiceState('speaking')
        playbackRef.current?.playChunk(pcmBase64)
      },
      onTurnComplete: () => {
        isSpeakingRef.current = false
        setVoiceState('listening')
      },
      onInterrupted: () => {
        isSpeakingRef.current = false
        playbackRef.current?.stop()
        setVoiceState('listening')
        addMessage({ role: 'system', content: 'Interrupted', type: 'status' })
      },
      onToolCall: (calls: FunctionCall[]) => {
        handleToolCalls(calls)
      },
      onError: (message: string) => {
        setError(message)
        addMessage({ role: 'system', content: message, type: 'error' })
      },
    })

    await geminiRef.current.connect()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Connection failed'
      if (!msg.includes('abort')) {
        setError(msg)
        addMessage({ role: 'system', content: msg, type: 'error' })
        setVoiceState('error')
      }
    } finally {
      startingRef.current = false
    }
  }, [apiKey, handleToolCalls, addMessage])

  const startCapture = useCallback(async () => {
    try {
      captureRef.current = new AudioCaptureService()
      await captureRef.current.start((base64: string) => {
        geminiRef.current?.sendAudio(base64)
      })
      setVoiceState('listening')

      // Poll mic level for status bar
      levelIntervalRef.current = setInterval(() => {
        const lv = captureRef.current?.getLevel() ?? 0
        setMicLevel(lv)
      }, 80)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Microphone access denied'
      setError(msg)
      setVoiceState('error')
      geminiRef.current?.disconnect()
    }
  }, [])

  const stop = useCallback(() => {
    if (levelIntervalRef.current) {
      clearInterval(levelIntervalRef.current)
      levelIntervalRef.current = null
    }
    captureRef.current?.stop()
    captureRef.current = null
    screenRef.current?.stop()
    screenRef.current = null
    setScreenSharing(false)
    playbackRef.current?.stop()
    geminiRef.current?.disconnect()
    geminiRef.current = null
    isSpeakingRef.current = false
    setVoiceState('idle')
    setMicLevel(0)
    setError(null)
    setLastToolCall(null)

    // Save session to history before adding "Session ended"
    setMessages((prev) => {
      const endMsg: ChatMessage = { id: makeId(), role: 'system', content: 'Session ended', type: 'status', timestamp: Date.now() }
      const full = [...prev, endMsg]
      saveSession(full)
      return full
    })
  }, [])

  const toggle = useCallback(() => {
    if (voiceState === 'idle' || voiceState === 'error') {
      start()
    } else {
      stop()
    }
  }, [voiceState, start, stop])

  const toggleScreenShare = useCallback(() => {
    if (screenRef.current?.active) {
      screenRef.current.stop()
      screenRef.current = null
      setScreenSharing(false)
      addMessage({ role: 'system', content: 'Screen sharing stopped', type: 'status' })
    } else {
      screenRef.current = new ScreenCaptureService(1) // 1 FPS
      screenRef.current.start()
      setScreenSharing(true)
      addMessage({ role: 'system', content: 'Screen sharing active — AI can see your screen', type: 'status' })
    }
  }, [addMessage])

  return { voiceState, error, lastToolCall, messages, micLevel, screenSharing, getAnalyser, start, stop, toggle, toggleScreenShare }
}
