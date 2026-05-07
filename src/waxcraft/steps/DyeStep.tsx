import type { Dispatch } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { CraftState } from '../types'
import type { Action } from '../state'
import styles from './DyeStep.module.css'
import { drawStamp } from '../patterns/stamps'

function drawPattern(canvas: HTMLCanvasElement, state: CraftState) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const w = canvas.width
  const h = canvas.height
  ctx.clearRect(0, 0, w, h)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  const wax = 'rgba(214, 160, 107, 0.95)'

  // 将画布路径缩放到布料区域
  const allPoints = [
    ...state.paths.flatMap((p) => p.points),
    ...state.stamps.map((s) => ({ x: s.x, y: s.y })),
  ]
  if (allPoints.length < 2 && state.stamps.length === 0) {
    // 默认心形（贴近视频）
    ctx.strokeStyle = wax
    ctx.lineWidth = 8
    ctx.beginPath()
    ctx.moveTo(w * 0.52, h * 0.7)
    ctx.bezierCurveTo(w * 0.22, h * 0.56, w * 0.28, h * 0.28, w * 0.5, h * 0.38)
    ctx.bezierCurveTo(w * 0.72, h * 0.28, w * 0.78, h * 0.56, w * 0.52, h * 0.7)
    ctx.stroke()
    return
  }

  const xs = allPoints.map((p) => p.x)
  const ys = allPoints.map((p) => p.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const pad = 28
  const scale = Math.min((w - pad * 2) / Math.max(1, maxX - minX), (h - pad * 2) / Math.max(1, maxY - minY))
  const ox = (w - (maxX - minX) * scale) / 2 - minX * scale
  const oy = (h - (maxY - minY) * scale) / 2 - minY * scale

  // 印章（蜡黄）
  for (const s of state.stamps) {
    drawStamp(ctx, s.kind, s.x * scale + ox, s.y * scale + oy, s.size * scale, wax)
  }

  for (const p of state.paths) {
    if (p.points.length < 2) continue
    ctx.strokeStyle = wax
    ctx.lineWidth = Math.max(4, p.width * 1.3)
    ctx.beginPath()
    ctx.moveTo(p.points[0].x * scale + ox, p.points[0].y * scale + oy)
    for (let i = 1; i < p.points.length; i++) {
      ctx.lineTo(p.points[i].x * scale + ox, p.points[i].y * scale + oy)
    }
    ctx.stroke()
  }
}

export function DyeStep({ state, dispatch }: { state: CraftState; dispatch: Dispatch<Action> }) {
  const runningRef = useRef(false)
  const patternRef = useRef<HTMLCanvasElement | null>(null)
  const [phase, setPhase] = useState<'idle' | 'dipping' | 'dyeing' | 'rising'>('idle')
  const fromRoundRef = useRef(0)
  const toRoundRef = useRef(1)

  useEffect(() => {
    const c = patternRef.current
    if (!c) return
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1))
    c.width = Math.floor(520 * dpr)
    c.height = Math.floor(520 * dpr)
    c.style.width = '100%'
    c.style.height = '100%'
    const ctx = c.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    drawPattern(c, state)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.paths.length, state.stamps.length])

  const bubbles = useMemo(() => {
    const n = phase === 'dyeing' ? 14 : 8
    return Array.from({ length: n }).map((_, i) => ({
      id: i,
      left: (i * 19) % 95,
      delay: (i % 7) * 0.25,
      size: 8 + (i % 4) * 3,
      dur: 2.0 + (i % 5) * 0.34,
    }))
  }, [phase])

  const start = () => {
    if (runningRef.current) return
    if (phase !== 'idle') return
    if (state.dyeRounds >= 3) return

    fromRoundRef.current = state.dyeRounds
    toRoundRef.current = Math.min(3, state.dyeRounds + 1)

    runningRef.current = true
    dispatch({ type: 'setDyePct', pct: 0 })
    setPhase('dipping')
  }

  const onClothTransitionEnd = () => {
    if (phase === 'dipping') {
      setPhase('dyeing')
      dispatch({ type: 'setDyePct', pct: 1 })
      const startAt = performance.now()
      const dur = 5200
      const tick = () => {
        const t = Math.min(1, (performance.now() - startAt) / dur)
        const pct = Math.round(t * 100)
        dispatch({ type: 'setDyePct', pct })
        if (t < 1) requestAnimationFrame(tick)
        else {
          // 染制完成：上升并固化颜色（加深一次）
          dispatch({ type: 'setDyeRounds', rounds: toRoundRef.current })
          dispatch({ type: 'setDyePct', pct: 0 })
          setPhase('rising')
        }
      }
      requestAnimationFrame(tick)
      return
    }

    if (phase === 'rising') {
      runningRef.current = false
      setPhase('idle')
    }
  }

  const submerged = phase === 'dipping' || phase === 'dyeing'
  const y = submerged ? 190 : 0

  const dyeOpacity = useMemo(() => {
    // 0~3 次染制，对应 0~1 的蓝色深度
    if (phase === 'dyeing') {
      const from = fromRoundRef.current
      const to = toRoundRef.current
      const shade = from + (to - from) * (state.dyePct / 100)
      return Math.max(0, Math.min(1, shade / 3))
    }
    return Math.max(0, Math.min(1, state.dyeRounds / 3))
  }, [phase, state.dyePct, state.dyeRounds])

  const canNext = state.dyeRounds > 0 && phase === 'idle'

  return (
    <div className={styles.wrap}>
      <div className={styles.hint}>
        点击布料开始染制（可重复 {Math.max(0, 3 - state.dyeRounds)} 次加深）
      </div>
      <div className={styles.tank}>
        <div className={styles.tankTop} />
        <div className={styles.liquid}>
          <div className={styles.wave} />
          <div className={styles.bubbles}>
            {bubbles.map((b) => (
              <div
                key={b.id}
                className={styles.bubble}
                style={{
                  left: `${b.left}%`,
                  bottom: `${12 + (b.id % 4) * 12}px`,
                  width: `${b.size}px`,
                  height: `${b.size}px`,
                  animationDelay: `${b.delay}s`,
                  animationDuration: `${b.dur}s`,
                }}
              />
            ))}
          </div>
        </div>

        <div
          className={[
            styles.cloth,
            phase !== 'idle' ? styles.clothBusy : '',
            submerged ? styles.clothSubmerged : '',
          ].join(' ')}
          onClick={start}
          onTransitionEnd={onClothTransitionEnd}
          style={{ ['--dye' as never]: `${dyeOpacity}`, ['--y' as never]: `${y}px` }}
        >
          <div className={styles.clothInner} />
          <div className={styles.clothDye} />
          <canvas className={styles.pattern} ref={patternRef} />
        </div>
      </div>

      {phase === 'dyeing' ? (
        <div className={styles.bottom}>
          <div>正在染制...</div>
          <div className={styles.progress} style={{ ['--pct' as never]: `${state.dyePct}%` }}>
            <div className={styles.progressFill} />
          </div>
        </div>
      ) : null}

      <button className={styles.nextBtn} disabled={!canNext} onClick={() => dispatch({ type: 'setStep', step: 'dewax' })}>
        脱蜡 →
      </button>
    </div>
  )
}

