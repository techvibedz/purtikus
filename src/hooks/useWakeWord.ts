import { useRef, useCallback, useEffect, useState } from 'react'

const WAKE_WORDS_AR = ['مرحبا', 'مرحبا بك', 'يا بورتيكوس']
const WAKE_WORDS_EN = ['hey assistant', 'hey purtikus', 'ok purtikus']
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
  onWakeRef.current = onWake

  const isSupported = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

  const scheduleRestart = useCallback((rec: SpeechRecognition, delayMs: number) => {
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current)
    restartTimerRef.current = setTimeout(() => {
      restartTimerRef.current = null
      if (recognitionRef.current === rec) {
        try { rec.start() } catch { /* already started */ }
      }
    }, delayMs)
  }, [])

  const createRecognition = useCallback((): SpeechRecognition | null => {
    if (!isSupported) return null

    const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognitionCtor) return null
    const recognition = new SpeechRecognitionCtor()

    recognition.continuous = true
    recognition.interimResults = true
    recognition.maxAlternatives = 3
    recognition.lang = 'en-US'

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      errorCountRef.current = 0 // Reset on successful result
      for (let i = event.resultIndex; i < event.results.length; i++) {
        for (let j = 0; j < event.results[i].length; j++) {
          const transcript = event.results[i][j].transcript.toLowerCase().trim()

          for (const wake of ALL_WAKE_WORDS) {
            if (transcript.includes(wake.toLowerCase())) {
              setDetected(wake)
              onWakeRef.current()
              recognition.stop()
              setTimeout(() => setDetected(null), 3000)
              return
            }
          }
        }
      }
    }

    recognition.onerror = (event) => {
      if (event.error === 'no-speech' || event.error === 'aborted') return
      errorCountRef.current++
      // Only log first occurrence
      if (errorCountRef.current === 1) {
        console.warn('[WakeWord] error:', event.error)
      }
      // After too many errors, give up (will retry on next enable toggle)
      if (errorCountRef.current > 5) {
        console.warn('[WakeWord] Too many errors, pausing wake word detection')
        recognition.onend = null
        try { recognition.stop() } catch { /* ignore */ }
        recognitionRef.current = null
        setIsListening(false)
      }
    }

    recognition.onend = () => {
      if (recognitionRef.current === recognition) {
        // Backoff: if errors keep happening, delay restart
        const delay = errorCountRef.current > 0 ? Math.min(10000, 2000 * errorCountRef.current) : 300
        scheduleRestart(recognition, delay)
      }
    }

    return recognition
  }, [isSupported, scheduleRestart])

  const startListening = useCallback(() => {
    if (!isSupported || recognitionRef.current) return
    errorCountRef.current = 0

    const rec = createRecognition()
    if (!rec) return

    recognitionRef.current = rec
    try {
      rec.start()
      setIsListening(true)
    } catch {
      // SpeechRecognition not available in this environment
    }
  }, [isSupported, createRecognition])

  const stopListening = useCallback(() => {
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current)
      restartTimerRef.current = null
    }
    if (recognitionRef.current) {
      recognitionRef.current.onend = null
      try { recognitionRef.current.stop() } catch { /* ignore */ }
      recognitionRef.current = null
    }
    setIsListening(false)
  }, [])

  // Auto-start/stop based on enabled prop
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
