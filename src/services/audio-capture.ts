// Inline AudioWorklet processor — avoids file path issues in Electron production
const WORKLET_CODE = `
class PCMProcessor extends AudioWorkletProcessor {
  constructor() { super(); this._targetRate = 16000; }
  process(inputs) {
    const input = inputs[0];
    if (input && input.length > 0 && input[0].length > 0) {
      const channelData = input[0];
      const ratio = sampleRate / this._targetRate;
      const outputLength = Math.floor(channelData.length / ratio);
      const int16 = new Int16Array(outputLength);
      for (let i = 0; i < outputLength; i++) {
        const srcIdx = Math.floor(i * ratio);
        const s = Math.max(-1, Math.min(1, channelData[srcIdx]));
        int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }
      this.port.postMessage(int16.buffer, [int16.buffer]);
    }
    return true;
  }
}
registerProcessor('pcm-processor', PCMProcessor);
`
const workletBlob = new Blob([WORKLET_CODE], { type: 'application/javascript' })
const workletUrl = URL.createObjectURL(workletBlob)

export class AudioCaptureService {
  private audioCtx: AudioContext | null = null
  private workletNode: AudioWorkletNode | null = null
  private stream: MediaStream | null = null
  private onPcmChunk: ((base64: string) => void) | null = null
  private analyserNode: AnalyserNode | null = null

  async start(onPcmChunk: (base64: string) => void): Promise<void> {
    this.onPcmChunk = onPcmChunk

    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate: 48000,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    })

    this.audioCtx = new AudioContext({ sampleRate: 48000 })
    await this.audioCtx.audioWorklet.addModule(workletUrl)

    const source = this.audioCtx.createMediaStreamSource(this.stream)
    this.workletNode = new AudioWorkletNode(this.audioCtx, 'pcm-processor')

    // AnalyserNode for real-time visualization
    this.analyserNode = this.audioCtx.createAnalyser()
    this.analyserNode.fftSize = 256
    this.analyserNode.smoothingTimeConstant = 0.8

    this.workletNode.port.onmessage = (event: MessageEvent<ArrayBuffer>) => {
      const pcmBuffer = event.data
      const base64 = this.arrayBufferToBase64(pcmBuffer)
      this.onPcmChunk?.(base64)
    }

    source.connect(this.workletNode)
    source.connect(this.analyserNode)
    this.workletNode.connect(this.audioCtx.destination)
  }

  /** Get the AnalyserNode for waveform visualization */
  getAnalyser(): AnalyserNode | null {
    return this.analyserNode
  }

  /** Get current mic level as 0-1 */
  getLevel(): number {
    if (!this.analyserNode) return 0
    const data = new Uint8Array(this.analyserNode.frequencyBinCount)
    this.analyserNode.getByteFrequencyData(data)
    let sum = 0
    for (let i = 0; i < data.length; i++) sum += data[i]
    return sum / (data.length * 255)
  }

  stop(): void {
    this.onPcmChunk = null

    if (this.workletNode) {
      this.workletNode.disconnect()
      this.workletNode = null
    }

    if (this.analyserNode) {
      this.analyserNode.disconnect()
      this.analyserNode = null
    }

    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop())
      this.stream = null
    }

    if (this.audioCtx) {
      this.audioCtx.close()
      this.audioCtx = null
    }
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
  }
}
