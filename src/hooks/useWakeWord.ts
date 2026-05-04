interface UseWakeWordReturn {
  isListening: boolean
  isSupported: boolean
  detected: string | null
  startListening: () => void
  stopListening: () => void
}

export function useWakeWord(_onWake: () => void, _enabled = true): UseWakeWordReturn {
  // Wake word disabled — SpeechRecognition API causes "The user aborted a request"
  // errors in Electron's Chromium due to network-dependent Google speech services.
  // TODO: Re-enable if a local wake word engine (e.g. Porcupine) is added.
  return {
    isListening: false,
    isSupported: false,
    detected: null,
    startListening: () => {},
    stopListening: () => {},
  }
}
