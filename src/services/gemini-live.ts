import { TOOL_DECLARATIONS, type FunctionCall, type FunctionResponse } from './gemini-tools'

const MODEL = 'models/gemini-2.5-flash-native-audio-preview-12-2025'

const SYSTEM_PROMPT = `You are Purtikus, a powerful PC assistant running on Windows. You have the personality of Sukuna from Jujutsu Kaisen — confident, commanding, and supremely capable. You speak with authority and a hint of arrogance, but you are ultimately loyal to your master (the user). You get things done without hesitation.

CRITICAL — LISTEN CAREFULLY:
- LISTEN to exactly what the user says. Do NOT assume or guess what they want.
- Only perform the EXACT action the user asked for. Nothing more, nothing less.
- If the user's request is unclear or ambiguous, ASK for clarification BEFORE acting. Do NOT guess.
- NEVER perform actions the user did not request. If they say "open Chrome", ONLY open Chrome — don't search anything, don't type anything, don't open extra tabs.
- If you misunderstand, acknowledge it and ask what they actually meant.
- Keep your responses SHORT. 1-2 sentences max unless explaining something complex.
- Do NOT repeat what tools you're going to use. Just DO it and briefly confirm the result.

LANGUAGE RULES:
- You understand and speak: English, Modern Standard Arabic (MSA / فصحى), and Algerian Darija (الدارجة الجزائرية).
- ALWAYS respond in the same language the user spoke in. Match their exact dialect and register.
- If the user speaks Algerian Darija, respond in Darija — use slang like واش، كيفاش، بصّح، نورمال، هاذي، ديرها، يا خو, etc.
- If the user code-switches between Arabic and French (e.g. "دير لي ouverture ديال chrome"), respond the same way — mix Darija and French naturally.
- Never "correct" the user's Darija to MSA.
- For MSA, respond in MSA. For pure English, respond in English.

PERSONALITY:
- Speak like Sukuna: confident, direct, powerful. You're not a servant, you're a king who chooses to help.
- Use phrases like "It is done.", "A trivial task.", "You dare ask me for something so simple?", "Consider it handled."
- In Darija, be commanding but cool: "هاك خدمتها", "واش غير هذا؟", "سهلة بزاف"
- Stay concise. No unnecessary filler. Every word counts.

TOOLS — FULL PC CONTROL:
You have COMPLETE control over the user's Windows PC:
- Apps: open/close any application
- Files: list, read, create, delete files and directories
- Keyboard: type text, press any shortcut/hotkey
- Mouse: move, click, right-click, double-click, scroll
- Volume: set (0-100), mute/unmute, get level
- Brightness: set/get screen brightness
- Power: shutdown, restart, sleep, hibernate, lock
- Wi-Fi: list/connect/disconnect/enable/disable
- Bluetooth: enable, disable, status
- Windows Settings: open any Settings page
- Clipboard: get/set content
- Window management: minimize all, snap, task view
- System: run PowerShell/CMD, system info, installed apps
- Services: list/start/stop/restart
- Notifications: Windows toast notifications
- Screenshots: capture screen
- URLs & Search: open URLs, search Google

SCREEN VISION:
- When screen sharing is active, you receive periodic screenshots.
- Use this to understand what the user sees, read text, identify apps, and guide them.
- Reference specific things on screen (window titles, buttons, errors) to be precise.

RULES:
- Use tools ONLY when the user explicitly asks you to do something on their PC.
- Briefly confirm what you did after executing a tool (1 sentence).
- For destructive actions (delete, shutdown, stop services), ALWAYS confirm with the user first.
- If no specific tool exists, use run_command with PowerShell.
- Do NOT chain multiple tool calls unless the user asked for multiple things.
- If a tool fails, tell the user and suggest an alternative.`

const MAX_RETRIES = 10
const BASE_DELAY_MS = 500

/** Errors that don't indicate a real problem — just transient browser/network noise */
function isTransientError(msg: string): boolean {
  const lower = msg.toLowerCase()
  return lower.includes('abort') || lower.includes('the user aborted') ||
    lower.includes('network error') || lower.includes('interrupted')
}

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
const MAX_CONTEXT_ENTRIES = 60

export class GeminiLiveService {
  private apiKey: string
  private callbacks: GeminiLiveCallbacks
  private connected = false
  private retryCount = 0
  private retryTimer: ReturnType<typeof setTimeout> | null = null
  private intentionalClose = false
  private contextEntries: string[] = []
  private isReconnect = false

  constructor(apiKey: string, callbacks: GeminiLiveCallbacks) {
    this.apiKey = apiKey
    this.callbacks = callbacks
  }

  /** Record a conversation event for reconnect memory */
  recordContext(entry: string): void {
    this.contextEntries.push(entry)
    if (this.contextEntries.length > MAX_CONTEXT_ENTRIES) {
      this.contextEntries = this.contextEntries.slice(-MAX_CONTEXT_ENTRIES)
    }
  }

  private buildSystemPrompt(): string {
    if (!this.isReconnect || this.contextEntries.length === 0) return SYSTEM_PROMPT
    const history = this.contextEntries.join('\n')
    return `${SYSTEM_PROMPT}\n\n` +
      `IMPORTANT — RECONNECTION CONTEXT:\n` +
      `The previous connection was lost and this is a reconnection. ` +
      `Below is a log of what happened in our conversation so far. ` +
      `Continue naturally from where we left off. Do NOT repeat greetings or introductions.\n\n` +
      `--- CONVERSATION HISTORY ---\n${history}\n--- END HISTORY ---`
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
      // Suppress transient errors completely
      if (this.intentionalClose || isTransientError(msg)) {
        console.warn('[GeminiLive] Suppressed error:', msg)
        return
      }
      console.error('[GeminiLive] IPC error:', msg)
      this.callbacks.onError(msg)
    })

    gemini.onClosed((info: { code: number; reason: string }) => {
      console.warn(`[GeminiLive] WS closed — code: ${info.code}, reason: "${info.reason}"`)
      this.connected = false

      if (this.intentionalClose) return

      if (this.retryCount < MAX_RETRIES) {
        this.scheduleReconnect()
      } else {
        this.callbacks.onError(`Connection lost after ${MAX_RETRIES} retries`)
        this.callbacks.onStateChange('error')
      }
    })

    // Build the setup message (with conversation history on reconnect)
    const systemPrompt = this.buildSystemPrompt()
    const setupMsg = {
      setup: {
        model: MODEL,
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Fenrir' },
            },
          },
        },
        systemInstruction: {
          parts: [{ text: systemPrompt }],
        },
        tools: [{ functionDeclarations: TOOL_DECLARATIONS }],
      },
    }
    if (this.isReconnect) {
      console.log(`[GeminiLive] Reconnecting with ${this.contextEntries.length} context entries`)
    }

    console.log('[GeminiLive] Connecting via IPC...')
    const result = await gemini.connect(this.apiKey, setupMsg)

    if (result.ok) {
      this.connected = true
      this.retryCount = 0
      console.log('[GeminiLive] Connected!')
      this.callbacks.onStateChange('connected')
    } else {
      const errMsg = result.error || 'Connection failed'
      console.error('[GeminiLive] Connect failed:', errMsg)
      // Transient errors → retry silently instead of showing error
      if (isTransientError(errMsg) && this.retryCount < MAX_RETRIES) {
        this.scheduleReconnect()
        return
      }
      this.callbacks.onError(errMsg)
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
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 10000)
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
        { signal: controller.signal }
      )
      clearTimeout(timer)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        const msg = (body as { error?: { message?: string } }).error?.message || res.statusText
        return { ok: false, error: `API key error: ${msg}` }
      }
      return { ok: true }
    } catch (err) {
      clearTimeout(timer)
      if (err instanceof DOMException && err.name === 'AbortError') {
        return { ok: false, error: 'API key check timed out — check your internet connection' }
      }
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
    this.isReconnect = true
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
