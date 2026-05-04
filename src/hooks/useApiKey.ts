import { useState, useCallback } from 'react'

const STORAGE_KEY = 'purtikus_gemini_api_key'

export function useApiKey() {
  const [apiKey, setApiKeyState] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY) ?? ''
  })

  const setApiKey = useCallback((key: string) => {
    const trimmed = key.trim()
    setApiKeyState(trimmed)
    if (trimmed) {
      localStorage.setItem(STORAGE_KEY, trimmed)
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [])

  return { apiKey, setApiKey, hasKey: apiKey.length > 0 }
}
