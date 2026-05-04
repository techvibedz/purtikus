// ---------------------------------------------------------------------------
//  Screen capture service — sends periodic JPEG frames to Gemini
//  Uses Electron's desktopCapturer via IPC for reliable screen access
// ---------------------------------------------------------------------------

export class ScreenCaptureService {
  private intervalId: ReturnType<typeof setInterval> | null = null
  private sending = false
  private _active = false

  /** Frames per second to capture (1 = one frame per second) */
  private fps: number

  constructor(fps = 1) {
    this.fps = Math.max(0.25, Math.min(5, fps))
  }

  get active(): boolean {
    return this._active
  }

  /** Start capturing the screen and sending frames via Gemini IPC */
  start(): void {
    if (this._active) return
    this._active = true

    const intervalMs = Math.round(1000 / this.fps)

    console.log(`[ScreenCapture] Starting at ${this.fps} fps (${intervalMs}ms interval)`)

    this.intervalId = setInterval(() => {
      this.captureAndSend()
    }, intervalMs)

    // Send first frame immediately
    this.captureAndSend()
  }

  /** Stop capturing */
  stop(): void {
    this._active = false
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    console.log('[ScreenCapture] Stopped')
  }

  private async captureAndSend(): Promise<void> {
    if (!this._active || this.sending) return

    const gemini = window.electron?.gemini
    if (!gemini) return

    this.sending = true
    try {
      const result = await gemini.captureFrame()
      if (result.ok && result.data) {
        gemini.sendVideo(result.data)
      }
    } catch (err) {
      console.warn('[ScreenCapture] Frame error:', err)
    }
    this.sending = false
  }
}
