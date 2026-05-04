import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Suppress transient AbortError rejections (AudioContext, SpeechRecognition, fetch)
window.addEventListener('unhandledrejection', (e) => {
  const msg = String(e.reason?.message || e.reason || '')
  if (msg.toLowerCase().includes('abort')) {
    e.preventDefault()
  }
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
