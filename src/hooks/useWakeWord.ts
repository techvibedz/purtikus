import { useRef, useCallback, useEffect, useState } from 'react'

const WAKE_WORDS_EN = ['hey purtikus', 'hi purtikus', 'hey assistant', 'ok purtikus']
const WAKE_WORDS_AR = [
  'سلام عليكم بورتيكوس',
  'مرحبا بورتيكوس',
  'يا بورتيكوس',
  'سلام بورتيكوس',
]
const ALL_WAKE_WORDS = [...WAKE_WORDS_EN, ...WAKE_WORDS_AR]

interface UseWakeWordReturn {
  isListening: boolean
  isSupported: boolean
  detected: string | null
  startListening: () => void
  stopListening: () => void
}

export function useWakeWord(onWake: () => void, enabled = true): UseWakeWordReturn {
  const [isListening, setIsListening] = useState(false)
  const [detected, setDetected] = useState<string | null>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const onWakeRef = useRef(onWake)
  const errorCountRef = useRef(0)
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const stoppedRef = useRef(false)
  onWakeRef.current = onWake

  const isSupported = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

  const scheduleRestart = useCallback((rec: SpeechRecognition, delayMs: number) => {
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current)
    restartTimerRef.current = setTimeout(() => {
      restartTimerRef.current = null
      if (stoppedRef.current) return
      if (recognitionRef.current === rec) {
        try { rec.start() } catch { /* already running or disposed */ }
      }
    }, delayMs)
  }, [])

  const createRecognition = useCallback((): SpeechRecognition | null => {
    if (!isSupported) return null
    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!Ctor) return null

    const rec = new Ctor()
    rec.continuous = true
    rec.interimResults = true
    rec.maxAlternatives = 3
    rec.lang = 'en-US'

    rec.onresult = (event: SpeechRecognitionEvent) => {
      errorCountRef.current = 0
      for (let i = event.resultIndex; i < event.results.length; i++) {
        for (let j = 0; j < event.results[i].length; j++) {
          const transcript = event.results[i][j].transcript.toLowerCase().trim()
          for (const wake of ALL_WAKE_WORDS) {
            if (transcript.includes(wake.toLowerCase())) {
              setDetected(wake)
              // Bring window to front
              try { window.electron?.showWindow() } catch { /* ignore */ }
              onWakeRef.current()
              try { rec.stop() } catch { /* ignore */ }
              setTimeout(() => setDetected(null), 3000)
              return
            }
          }
        }
      }
    }

    rec.onerror = (event) => {
      // Silently ignore all errors — never propagate
      if (event.error === 'no-speech' || event.error === 'aborted') return
      errorCountRef.current++
      if (errorCountRef.current === 1) {
        console.warn('[WakeWord] error:', event.error, '(suppressing further)')
      }
      if (errorCountRef.current > 10) {
        console.warn('[WakeWord] Too many errors, pausing for 30s')
        rec.onend = null
        try { rec.stop() } catch { /* ignore */ }
        // Auto-retry after 30 seconds
        restartTimerRef.current = setTimeout(() => {
          restartTimerRef.current = null
          errorCountRef.current = 0
          if (!stoppedRef.current && recognitionRef.current === rec) {
            try { rec.start() } catch { /* ignore */ }
            rec.onend = () => {
              if (!stoppedRef.current && recognitionRef.current === rec) {
                const delay = errorCountRef.current > 0 ? Math.min(10000, 2000 * errorCountRef.current) : 300
                scheduleRestart(rec, delay)
              }
            }
          }
        }, 30000)
      }
    }

    rec.onend = () => {
      if (stoppedRef.current) return
      if (recognitionRef.current === rec) {
        const delay = errorCountRef.current > 0 ? Math.min(10000, 2000 * errorCountRef.current) : 300
        scheduleRestart(rec, delay)
      }
    }

    return rec
  }, [isSupported, scheduleRestart])

  const startListening = useCallback(() => {
    if (!isSupported || recognitionRef.current) return
    stoppedRef.current = false
    errorCountRef.current = 0

    const rec = createRecognition()
    if (!rec) return
    recognitionRef.current = rec
    try {
      rec.start()
      setIsListening(true)
    } catch {
      // Not available in this environment
    }
  }, [isSupported, createRecognition])

  const stopListening = useCallback(() => {
    stoppedRef.current = true
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current)
      restartTimerRef.current = null
    }
    if (recognitionRef.current) {
      recognitionRef.current.onend = null
      recognitionRef.current.onerror = null
      try { recognitionRef.current.stop() } catch { /* ignore */ }
      recognitionRef.current = null
    }
    setIsListening(false)
  }, [])

  useEffect(() => {
    if (enabled && isSupported) {
      startListening()
    } else {
      stopListening()
    }
    return () => stopListening()
  }, [enabled, isSupported, startListening, stopListening])

  return { isListening, isSupported, detected, startListening, stopListening }
}
