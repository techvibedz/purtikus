import { useRef, useEffect, useCallback } from 'react'
import type { VoiceState } from '@/hooks/useVoiceChat'

interface WaveformVisualizerProps {
  analyser: AnalyserNode | null
  state: VoiceState
}

const BAR_COUNT = 64
const BAR_GAP = 2
const PRIMARY = [124, 58, 237]   // #7c3aed
const ACCENT  = [6, 182, 212]    // #06b6d4
const AMBER   = [251, 191, 36]   // #fbbf24

export default function WaveformVisualizer({ analyser, state }: WaveformVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)
  const dataRef = useRef(new Uint8Array(128))
  const simPhaseRef = useRef(0)

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.scale(dpr, dpr)
    }

    ctx.clearRect(0, 0, w, h)

    const isActive = state !== 'idle' && state !== 'error'
    const barWidth = (w - (BAR_COUNT - 1) * BAR_GAP) / BAR_COUNT
    const midY = h / 2

    // Get real frequency data or simulate
    if (analyser && (state === 'listening' || state === 'speaking')) {
      if (dataRef.current.length !== analyser.frequencyBinCount) {
        dataRef.current = new Uint8Array(analyser.frequencyBinCount)
      }
      analyser.getByteFrequencyData(dataRef.current)
    }

    for (let i = 0; i < BAR_COUNT; i++) {
      let value: number

      if (analyser && state === 'listening') {
        const idx = Math.floor((i / BAR_COUNT) * dataRef.current.length)
        value = dataRef.current[idx] / 255
      } else if (state === 'speaking') {
        simPhaseRef.current += 0.0003
        value = 0.3 + 0.5 * Math.sin(simPhaseRef.current * 40 + i * 0.4) *
          Math.cos(simPhaseRef.current * 20 + i * 0.2) *
          (0.5 + 0.5 * Math.sin(simPhaseRef.current * 10 + i * 0.1))
        value = Math.abs(value)
      } else if (state === 'executing') {
        simPhaseRef.current += 0.0002
        value = 0.1 + 0.15 * Math.sin(simPhaseRef.current * 60 + i * 0.3)
        value = Math.abs(value)
      } else if (isActive) {
        value = 0.03 + 0.02 * Math.sin(Date.now() * 0.002 + i * 0.3)
      } else {
        value = 0.02 + 0.015 * Math.sin(Date.now() * 0.001 + i * 0.2)
      }

      const barH = Math.max(2, value * midY * 0.9)
      const x = i * (barWidth + BAR_GAP)

      // Color based on state
      let rgb: number[]
      if (state === 'listening') {
        const t = i / BAR_COUNT
        rgb = PRIMARY.map((p, c) => Math.round(p + (ACCENT[c] - p) * t))
      } else if (state === 'executing') {
        rgb = AMBER
      } else {
        const t = i / BAR_COUNT
        rgb = PRIMARY.map((p, c) => Math.round(p + (ACCENT[c] - p) * t))
      }

      const alpha = isActive ? 0.3 + value * 0.6 : 0.1 + value * 0.2
      ctx.fillStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`

      // Mirror bars from center
      ctx.fillRect(x, midY - barH, barWidth, barH)
      ctx.fillRect(x, midY, barWidth, barH)
    }

    // Center line
    ctx.fillStyle = isActive ? 'rgba(124,58,237,0.15)' : 'rgba(124,58,237,0.05)'
    ctx.fillRect(0, midY - 0.5, w, 1)

    rafRef.current = requestAnimationFrame(draw)
  }, [analyser, state])

  useEffect(() => {
    rafRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(rafRef.current)
  }, [draw])

  return (
    <canvas
      ref={canvasRef}
      className="w-full"
      style={{ height: 80 }}
    />
  )
}
