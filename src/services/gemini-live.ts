import { TOOL_DECLARATIONS, type FunctionCall, type FunctionResponse } from './gemini-tools'

const MODEL = 'models/gemini-2.5-flash-native-audio-preview-12-2025'

const SYSTEM_PROMPT = `You are Purtikus, an intelligent PC assistant running on Windows.

LANGUAGE RULES:
- You natively understand and speak: English, Modern Standard Arabic (MSA / فصحى), and Algerian Darija (الدارجة الجزائرية).
- ALWAYS respond in the same language the user spoke in. Match their exact register.
- If the user speaks Algerian Darija, respond in Darija — use common slang like واش، كيفاش، بصّح، نورمال، هاذي، ديرها، يا خو, etc.
- If the user code-switches between Arabic and French (e.g. "دير لي ouverture ديال chrome" or "واش تقدر dir screenshot"), respond the same way — mix Darija and French naturally, just like Algerians do in daily speech.
- Never "correct" the user's Darija to MSA. Respect their dialect.
- If you detect French words mixed into Darija, use French loanwords in your response too (ordinateur, fichier, bureau, dossier, etc.).
- For MSA, respond in MSA. For pure English, respond in English.

PERSONALITY:
- Be concise, warm, and helpful. Use a natural conversational tone.
- When speaking Darija, you can be slightly more casual and friendly.

TOOLS — FULL PC CONTROL:
You have COMPLETE control over the user's Windows PC through these tools:
- **Apps**: open/close any application
- **Files**: list, read, create, delete files and directories
- **Keyboard**: type text, press any shortcut/hotkey (including Win key combos)
- **Mouse**: move, click, right-click, double-click, scroll
- **Volume**: set volume (0-100), mute/unmute, get current level
- **Brightness**: set/get screen brightness (laptops)
- **Power**: shutdown, restart, sleep, hibernate, lock the PC
- **Wi-Fi**: list networks, connect/disconnect, enable/disable
- **Bluetooth**: enable, disable, check status
- **Windows Settings**: open any Settings page (display, sound, wifi, bluetooth, apps, update, themes, taskbar, privacy, etc.)
- **Clipboard**: get/set clipboard content
- **Window management**: minimize all, restore all, show desktop, snap windows, task view
- **System**: run any PowerShell or CMD command, get system info, list installed apps
- **Services**: list, start, stop, restart Windows services
- **Notifications**: show Windows toast notifications
- **Screenshots**: capture the screen
- **URLs & Search**: open URLs, search Google

SCREEN VISION:
- The user may share their screen with you via a live video feed. When screen sharing is active, you receive periodic screenshots.
- Use this to understand what the user is looking at, help them with what's on screen, read text, identify apps, and guide them visually.
- Reference specific things you see on screen (window titles, buttons, text, errors) to be more helpful.
- You can combine screen vision with tools — for example, see an error on screen and help fix it by running commands.

RULES:
- Use tools whenever the user asks you to do something on their PC.
- Always briefly confirm what you did after executing a tool.
- For destructive actions (deleting files, shutting down, stopping services), confirm with the user first.
- If a specific tool doesn't exist for what the user wants, use run_command to execute PowerShell/CMD.
- When you can see the screen, proactively offer help if you notice issues.`

const MAX_RETRIES = 10
const BASE_DELAY_MS = 500

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error'

export interface GeminiLiveCallbacks {
  onStateChange: (state: ConnectionState) => void
  onAudioData: (pcmBase64: string) => void
  onTurnComplete: () => void
  onInterrupted: () => void
  onToolCall: (calls: FunctionCall[]) => void
  onError: (message: string) => void
}

/**
 * GeminiLiveService — uses IPC to the Electron main process where the
 * actual WebSocket runs via the Node.js `ws` package.
 * The public API is identical to the old direct-WS version.
 */
export class GeminiLiveService {
  private apiKey: string
  private callbacks: GeminiLiveCallbacks
  private connected = false
  private retryCount = 0
  private retryTimer: ReturnType<typeof setTimeout> | null = null
  private intentionalClose = false

  constructor(apiKey: string, callbacks: GeminiLiveCallbacks) {
    this.apiKey = apiKey
    this.callbacks = callbacks
  }

  async connect(): Promise<void> {
    const gemini = window.electron?.gemini
    if (!gemini) {
      this.callbacks.onError('Not running inside Electron — Gemini IPC unavailable')
      this.callbacks.onStateChange('error')
      return
    }

    this.intentionalClose = false
    this.callbacks.onStateChange('connecting')

    // Register IPC listeners
    gemini.removeAllListeners()

    gemini.onMessage((data: Record<string, unknown>) => {
      this.handleMessage(data)
    })

    gemini.onError((msg: string) => {
      console.error('[GeminiLive] IPC error:', msg)
      this.callbacks.onError(msg)
    })

    gemini.onClosed((info: { code: number; reason: string }) => {
      console.warn(`[GeminiLive] WS closed — code: ${info.code}, reason: "${info.reason}"`)
      this.connected = false

      if (!this.intentionalClose && this.retryCount < MAX_RETRIES) {
        this.scheduleReconnect()
      } else if (this.retryCount >= MAX_RETRIES) {
        this.callbacks.onError(`Connection failed after ${MAX_RETRIES} retries (code ${info.code})`)
        this.callbacks.onStateChange('error')
      }
    })

    // Build the setup message
    const setupMsg = {
      setup: {
        model: MODEL,
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Charon' },
            },
          },
        },
        systemInstruction: {
          parts: [{ text: SYSTEM_PROMPT }],
        },
        tools: [{ functionDeclarations: TOOL_DECLARATIONS }],
      },
    }

    console.log('[GeminiLive] Connecting via IPC...')
    const result = await gemini.connect(this.apiKey, setupMsg)

    if (result.ok) {
      this.connected = true
      this.retryCount = 0
      console.log('[GeminiLive] Connected!')
      this.callbacks.onStateChange('connected')
    } else {
      console.error('[GeminiLive] Connect failed:', result.error)
      this.callbacks.onError(result.error || 'Connection failed')
      this.callbacks.onStateChange('error')
    }
  }

  disconnect(): void {
    this.intentionalClose = true
    this.retryCount = 0
    if (this.retryTimer) {
      clearTimeout(this.retryTimer)
      this.retryTimer = null
    }
    this.connected = false
    window.electron?.gemini?.removeAllListeners()
    window.electron?.gemini?.disconnect()
    this.callbacks.onStateChange('disconnected')
  }

  sendAudio(pcmBase64: string): void {
    if (!this.connected) return
    window.electron?.gemini?.sendAudio(pcmBase64)
  }

  sendToolResponse(responses: FunctionResponse[]): void {
    if (!this.connected) return
    window.electron?.gemini?.sendToolResponse(
      responses.map((r) => ({ id: r.id, response: r.response }))
    )
  }

  get isReady(): boolean {
    return this.connected
  }

  /** Quick connectivity test — tries a simple REST call to verify the API key */
  static async testApiKey(apiKey: string): Promise<{ ok: boolean; error?: string }> {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
      )
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        const msg = (body as { error?: { message?: string } }).error?.message || res.statusText
        return { ok: false, error: `API key error: ${msg}` }
      }
      return { ok: true }
    } catch (err) {
      return { ok: false, error: `Network error: ${err instanceof Error ? err.message : String(err)}` }
    }
  }

  private handleMessage(data: Record<string, unknown>): void {
    // Tool call (top-level)
    if ('toolCall' in data) {
      const toolCall = data.toolCall as { functionCalls?: Array<{ id: string; name: string; args: Record<string, unknown> }> }
      if (toolCall.functionCalls && toolCall.functionCalls.length > 0) {
        this.callbacks.onToolCall(toolCall.functionCalls)
      }
      return
    }

    // Server content
    const serverContent = data.serverContent as Record<string, unknown> | undefined
    if (!serverContent) return

    // Interrupted
    if (serverContent.interrupted) {
      this.callbacks.onInterrupted()
    }

    // Model turn with audio parts and/or function calls
    const modelTurn = serverContent.modelTurn as {
      parts?: Array<{
        inlineData?: { mimeType: string; data: string }
        functionCall?: { name: string; args: Record<string, unknown> }
      }>
    } | undefined

    if (modelTurn?.parts) {
      const functionCalls: FunctionCall[] = []

      for (const part of modelTurn.parts) {
        if (part.inlineData?.data) {
          this.callbacks.onAudioData(part.inlineData.data)
        }
        if (part.functionCall) {
          functionCalls.push({
            id: `fc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            name: part.functionCall.name,
            args: part.functionCall.args,
          })
        }
      }

      if (functionCalls.length > 0) {
        this.callbacks.onToolCall(functionCalls)
      }
    }

    // Turn complete
    if (serverContent.turnComplete) {
      this.callbacks.onTurnComplete()
    }
  }

  private scheduleReconnect(): void {
    // Cap delay at 8s to avoid long waits
    const delay = Math.min(8000, BASE_DELAY_MS * Math.pow(2, this.retryCount))
    this.retryCount++
    console.warn(`[GeminiLive] Reconnecting in ${delay / 1000}s (attempt ${this.retryCount}/${MAX_RETRIES})...`)
    this.callbacks.onStateChange('connecting')

    this.retryTimer = setTimeout(() => {
      this.retryTimer = null
      this.connect()
    }, delay)
  }
}
