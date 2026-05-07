export type BubbleSoundHandle = {
  stop: () => void
}

/**
 * 轻量“咕嘟咕嘟”煮水声（WebAudio 合成）
 * - 不依赖音频文件
 * - 需要在用户手势回调中调用（浏览器自动播放策略）
 */
export function startBubbleSound(): BubbleSoundHandle | null {
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AudioCtx) return null

  const ctx = new AudioCtx()

  // 白噪声：模拟水声底噪
  const bufferSize = 2 * ctx.sampleRate
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const out = noiseBuffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) out[i] = Math.random() * 2 - 1
  const noise = ctx.createBufferSource()
  noise.buffer = noiseBuffer
  noise.loop = true

  // 低通 + 轻微带通，让声音更像“水里冒泡”
  const low = ctx.createBiquadFilter()
  low.type = 'lowpass'
  low.frequency.value = 520
  low.Q.value = 0.6

  const band = ctx.createBiquadFilter()
  band.type = 'bandpass'
  band.frequency.value = 260
  band.Q.value = 0.9

  // 音量包络：随机“咕嘟”脉冲
  const gain = ctx.createGain()
  gain.gain.value = 0.0

  // 轻微颤动（让“咕嘟”更有起伏）
  const lfo = ctx.createOscillator()
  lfo.type = 'sine'
  lfo.frequency.value = 2.2
  const lfoGain = ctx.createGain()
  lfoGain.gain.value = 0.06

  noise.connect(low)
  low.connect(band)
  band.connect(gain)
  gain.connect(ctx.destination)

  lfo.connect(lfoGain)
  lfoGain.connect(gain.gain)

  noise.start()
  lfo.start()

  let stopped = false
  let timer: number | null = null

  const schedulePulse = () => {
    if (stopped) return
    const now = ctx.currentTime
    const amp = 0.12 + Math.random() * 0.16
    const dur = 0.05 + Math.random() * 0.07
    const gap = 0.12 + Math.random() * 0.22

    // 快速起，慢速落
    gain.gain.cancelScheduledValues(now)
    gain.gain.setValueAtTime(gain.gain.value, now)
    gain.gain.linearRampToValueAtTime(amp, now + 0.012)
    gain.gain.exponentialRampToValueAtTime(0.0008, now + dur)

    timer = window.setTimeout(schedulePulse, Math.floor(gap * 1000))
  }

  schedulePulse()

  return {
    stop: () => {
      stopped = true
      if (timer !== null) window.clearTimeout(timer)
      try {
        noise.stop()
      } catch {
        // ignore
      }
      try {
        lfo.stop()
      } catch {
        // ignore
      }
      // 给一点点时间让尾音衰减
      const closeAt = ctx.currentTime + 0.08
      gain.gain.setTargetAtTime(0.0, ctx.currentTime, 0.03)
      window.setTimeout(() => ctx.close().catch(() => {}), Math.ceil((closeAt - ctx.currentTime) * 1000))
    },
  }
}

