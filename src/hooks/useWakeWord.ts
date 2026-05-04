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
  onWakeRef.current = onWake

  const isSupported = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

  const createRecognition = useCallback((): SpeechRecognition | null => {
    if (!isSupported) return null

    const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognitionCtor) return null
    const recognition = new SpeechRecognitionCtor()

    recognition.continuous = true
    recognition.interimResults = true
    recognition.maxAlternatives = 3
    // Use empty string to let the browser auto-detect language (supports Arabic + English)
    recognition.lang = ''

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        for (let j = 0; j < event.results[i].length; j++) {
          const transcript = event.results[i][j].transcript.toLowerCase().trim()

          for (const wake of ALL_WAKE_WORDS) {
            if (transcript.includes(wake.toLowerCase())) {
              setDetected(wake)
              onWakeRef.current()
              // Stop listening after wake word detected — voice chat takes over
              recognition.stop()
              setTimeout(() => setDetected(null), 3000)
              return
            }
          }
        }
      }
    }

    recognition.onerror = (event) => {
      // 'no-speech' and 'aborted' are expected — just restart
      if (event.error === 'no-speech' || event.error === 'aborted') return
      console.warn('[WakeWord] error:', event.error)
    }

    recognition.onend = () => {
      // Auto-restart if we should still be listening
      if (recognitionRef.current === recognition && isListening) {
        try { recognition.start() } catch { /* already started */ }
      }
    }

    return recognition
  }, [isSupported, isListening])

  const startListening = useCallback(() => {
    if (!isSupported || recognitionRef.current) return

    const rec = createRecognition()
    if (!rec) return

    recognitionRef.current = rec
    try {
      rec.start()
      setIsListening(true)
    } catch {
      console.warn('[WakeWord] Failed to start')
    }
  }, [isSupported, createRecognition])

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.onend = null
      recognitionRef.current.stop()
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
