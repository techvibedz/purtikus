class PCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super()
    this._targetRate = 16000
  }

  process(inputs) {
    const input = inputs[0]
    if (input && input.length > 0 && input[0].length > 0) {
      const channelData = input[0]
      const ratio = sampleRate / this._targetRate
      const outputLength = Math.floor(channelData.length / ratio)
      const int16 = new Int16Array(outputLength)

      for (let i = 0; i < outputLength; i++) {
        const srcIdx = Math.floor(i * ratio)
        const s = Math.max(-1, Math.min(1, channelData[srcIdx]))
        int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff
      }

      this.port.postMessage(int16.buffer, [int16.buffer])
    }
    return true
  }
}

registerProcessor('pcm-processor', PCMProcessor)
