// ---------------------------------------------------------------------------
//  Gemini Live WebSocket — runs in Electron main process (Node.js)
//  Bridges to renderer via IPC events
// ---------------------------------------------------------------------------
const WebSocket = require('ws')

const WS_BASE = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent'

let ws = null
let setupComplete = false
let keepAliveTimer = null

function startKeepAlive() {
  stopKeepAlive()
  keepAliveTimer = setInterval(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      // Use WebSocket protocol-level ping (doesn't interfere with Gemini API)
      try { ws.ping() } catch { /* ignore */ }
    }
  }, 15000) // every 15s
}

function stopKeepAlive() {
  if (keepAliveTimer) {
    clearInterval(keepAliveTimer)
    keepAliveTimer = null
  }
}

/**
 * Register IPC handlers that let the renderer control the Gemini WS.
 * @param {Electron.IpcMain} ipcMain
 * @param {() => Electron.BrowserWindow | null} getWindow
 */
function registerGeminiHandlers(ipcMain, getWindow) {
  // Send event to renderer
  function emit(channel, data) {
    const win = getWindow()
    if (win && !win.isDestroyed()) {
      win.webContents.send(channel, data)
    }
  }

  // ── Connect ──
  ipcMain.handle('gemini:connect', (_event, { apiKey, setupMsg }) => {
    // Cleanup previous
    if (ws) {
      try { ws.close() } catch { /* ignore */ }
      ws = null
    }
    setupComplete = false

    return new Promise((resolve) => {
      const url = `${WS_BASE}?key=${apiKey}`
      console.log('[GeminiWS] Connecting...')

      try {
        ws = new WebSocket(url)
      } catch (err) {
        console.error('[GeminiWS] Failed to create WebSocket:', err.message)
        resolve({ ok: false, error: err.message })
        return
      }

      const timeout = setTimeout(() => {
        console.warn('[GeminiWS] Connection timeout (15s)')
        if (ws) { try { ws.close() } catch { /* ignore */ } }
        ws = null
        resolve({ ok: false, error: 'Connection timeout' })
      }, 15000)

      ws.on('open', () => {
        console.log('[GeminiWS] WS opened, sending setup...')
        try {
          ws.send(JSON.stringify(setupMsg))
        } catch (err) {
          clearTimeout(timeout)
          resolve({ ok: false, error: 'Failed to send setup: ' + err.message })
        }
      })

      ws.on('pong', () => { /* connection alive */ })

      ws.on('message', (rawData) => {
        let data
        try {
          data = JSON.parse(rawData.toString())
        } catch {
          return
        }

        // Setup complete — resolve the connect promise
        if ('setupComplete' in data) {
          setupComplete = true
          clearTimeout(timeout)
          console.log('[GeminiWS] Setup complete!')
          startKeepAlive()
          resolve({ ok: true })
          return
        }

        // Log tool calls for debugging
        if ('toolCall' in data) {
          const tc = data.toolCall
          console.log('[GeminiWS] Tool call:', JSON.stringify(tc).slice(0, 300))
        }

        // Forward all other messages to renderer
        emit('gemini:message', data)
      })

      ws.on('error', (err) => {
        console.error('[GeminiWS] WS error:', err.message)
        emit('gemini:error', err.message)
      })

      ws.on('close', (code, reason) => {
        const reasonStr = reason ? reason.toString() : ''
        console.log(`[GeminiWS] WS closed — code: ${code}, reason: "${reasonStr}"`)
        setupComplete = false
        ws = null
        stopKeepAlive()
        emit('gemini:closed', { code, reason: reasonStr })
      })
    })
  })

  // ── Send audio ──
  ipcMain.on('gemini:audio', (_event, pcmBase64) => {
    if (!ws || ws.readyState !== WebSocket.OPEN || !setupComplete) return
    ws.send(JSON.stringify({
      realtimeInput: {
        audio: { mimeType: 'audio/pcm;rate=16000', data: pcmBase64 },
      },
    }))
  })

  // ── Send video frame (screen capture) ──
  ipcMain.on('gemini:video', (_event, jpegBase64) => {
    if (!ws || ws.readyState !== WebSocket.OPEN || !setupComplete) return
    ws.send(JSON.stringify({
      realtimeInput: {
        video: { mimeType: 'image/jpeg', data: jpegBase64 },
      },
    }))
  })

  // ── Send tool response ──
  ipcMain.on('gemini:tool-response', (_event, responses) => {
    if (!ws || ws.readyState !== WebSocket.OPEN || !setupComplete) {
      console.warn('[GeminiWS] Cannot send tool response — WS not ready')
      return
    }
    console.log('[GeminiWS] Sending tool response:', JSON.stringify(responses).slice(0, 300))
    ws.send(JSON.stringify({
      toolResponse: {
        functionResponses: responses,
      },
    }))
  })

  // ── Disconnect ──
  ipcMain.on('gemini:disconnect', () => {
    setupComplete = false
    stopKeepAlive()
    if (ws) {
      try { ws.close() } catch { /* ignore */ }
      ws = null
    }
  })

  // ── Check if ready ──
  ipcMain.handle('gemini:is-ready', () => {
    return setupComplete && ws && ws.readyState === WebSocket.OPEN
  })
}

module.exports = { registerGeminiHandlers }
