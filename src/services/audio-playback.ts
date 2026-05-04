const OUTPUT_SAMPLE_RATE = 24000

export class AudioPlaybackService {
  private audioCtx: AudioContext | null = null
  private nextPlayTime = 0
  private gainNode: GainNode | null = null
  private activeSources: AudioBufferSourceNode[] = []

  constructor() {
    this.ensureContext()
  }

  playChunk(pcmBase64: string): void {
    this.ensureContext()
    if (!this.audioCtx || !this.gainNode) return

    const pcmBuffer = this.base64ToArrayBuffer(pcmBase64)
    const int16 = new Int16Array(pcmBuffer)
    const float32 = new Float32Array(int16.length)

    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / 32768
    }

    const audioBuffer = this.audioCtx.createBuffer(1, float32.length, OUTPUT_SAMPLE_RATE)
    audioBuffer.copyToChannel(float32, 0)

    const source = this.audioCtx.createBufferSource()
    source.buffer = audioBuffer
    source.connect(this.gainNode)

    const now = this.audioCtx.currentTime
    const startTime = Math.max(now + 0.01, this.nextPlayTime)
    source.start(startTime)
    this.nextPlayTime = startTime + audioBuffer.duration

    this.activeSources.push(source)
    source.onended = () => {
      const idx = this.activeSources.indexOf(source)
      if (idx !== -1) this.activeSources.splice(idx, 1)
    }
  }

  stop(): void {
    for (const source of this.activeSources) {
      try { source.stop() } catch { /* already stopped */ }
    }
    this.activeSources = []
    this.nextPlayTime = 0
  }

  destroy(): void {
    this.stop()
    if (this.audioCtx) {
      this.audioCtx.close()
      this.audioCtx = null
    }
    this.gainNode = null
  }

  private ensureContext(): void {
    if (!this.audioCtx || this.audioCtx.state === 'closed') {
      this.audioCtx = new AudioContext()
      this.gainNode = this.audioCtx.createGain()
      this.gainNode.gain.value = 1.0
      this.gainNode.connect(this.audioCtx.destination)
      this.nextPlayTime = 0
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => { /* ignore AbortError */ })
    }
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return bytes.buffer
  }
}
