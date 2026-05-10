import type { Dispatch } from 'react'
import { useEffect, useMemo, useRef } from 'react'
import type { CraftState } from '../types'
import type { Action } from '../state'
import styles from './DewaxStep.module.css'
import { drawStamp } from '../patterns/stamps'
import { logicalCanvasSize, mapStrokePoints, strokeSmoothLine } from '../drawStroke'

function drawPattern(canvas: HTMLCanvasElement, state: CraftState, strokeStyle: string) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const { lw: w, lh: h } = logicalCanvasSize(canvas)
  ctx.clearRect(0, 0, w, h)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  ctx.strokeStyle = strokeStyle
  ctx.lineWidth = 8

  const allPoints = [
    ...state.paths.flatMap((p) => p.points),
    ...state.stamps.map((s) => ({ x: s.x, y: s.y })),
  ]
  if (allPoints.length < 2 && state.stamps.length === 0) {
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

  for (const s of state.stamps) {
    drawStamp(ctx, s.kind, s.x * scale + ox, s.y * scale + oy, s.size * scale, strokeStyle)
  }

  for (const p of state.paths) {
    if (p.points.length < 2) continue
    const mapped = mapStrokePoints(p.points, scale, ox, oy)
    strokeSmoothLine(ctx, mapped, {
      lineWidth: Math.max(4, p.width * 1.3),
      strokeStyle,
      soft: true,
    })
  }
}

export function DewaxStep({ state, dispatch }: { state: CraftState; dispatch: Dispatch<Action> }) {
  const runningRef = useRef(false)
  const patternRef = useRef<HTMLCanvasElement | null>(null)

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
    const wax = 'rgba(214, 160, 107, 0.95)'
    const white = 'rgba(255,255,255,0.9)'
    const stroke = state.dewaxPct >= 100 ? white : wax
    drawPattern(c, state, stroke)
  }, [state.paths, state.stamps, state.dewaxPct])

  useEffect(() => {
    if (state.dewaxPct === 100) {
      const id = window.setTimeout(() => dispatch({ type: 'setStep', step: 'finish' }), 450)
      return () => window.clearTimeout(id)
    }
  }, [state.dewaxPct, dispatch])

  const bubbles = useMemo(() => {
    const n = state.dewaxPct > 0 && state.dewaxPct < 100 ? 10 : 0
    return Array.from({ length: n }).map((_, i) => ({
      id: i,
      left: (i * 21) % 90,
      top: 20 + (i % 4) * 16,
      size: 8 + (i % 3) * 4,
    }))
  }, [state.dewaxPct])

  const start = () => {
    if (runningRef.current) return
    runningRef.current = true
    dispatch({ type: 'setDewaxPct', pct: 1 })
    const startAt = performance.now()
    const dur = 5600
    const tick = () => {
      const t = Math.min(1, (performance.now() - startAt) / dur)
      dispatch({ type: 'setDewaxPct', pct: Math.round(t * 100) })
      if (t < 1) requestAnimationFrame(tick)
      else runningRef.current = false
    }
    requestAnimationFrame(tick)
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.hintBox}>点击放入开水中脱蜡</div>

      <div className={styles.pot}>
        <div className={styles.water}>
          <div className={styles.waterTop} />
          {bubbles.map((b) => (
            <div
              key={b.id}
              style={{
                position: 'absolute',
                left: `${b.left}%`,
                top: `${b.top}%`,
                width: `${b.size}px`,
                height: `${b.size}px`,
                borderRadius: 999,
                background: 'rgba(255,255,255,0.25)',
              }}
            />
          ))}
        </div>

        <div
          className={styles.cloth}
          onClick={start}
          style={{
            ['--foam' as never]: `${Math.min(1, state.dewaxPct / 100)}`,
            ['--dye' as never]: `${Math.max(0, Math.min(1, state.dyeRounds / 3))}`,
          }}
        >
          <div className={styles.clothDye} />
          <div className={styles.foam} />
          <canvas className={styles.pattern} ref={patternRef} />
        </div>

        {state.dewaxPct > 0 && state.dewaxPct < 100 ? (
          <div className={styles.bottom}>
            <div className={styles.status}>正在脱蜡...</div>
            <div className={styles.progress} style={{ ['--pct' as never]: `${state.dewaxPct}%` }}>
              <div className={styles.progressFill} />
            </div>
          </div>
        ) : null}

        {state.dewaxPct >= 100 ? <div className={styles.done}>脱蜡完成！</div> : null}

        <div className={styles.legend}>
          <span className={styles.chip}>
            <span className={styles.dot} /> 蜡遇热融化
          </span>
          <span className={styles.chip}>
            <span className={[styles.dot, styles.dot2].join(' ')} /> 蓝底显现
          </span>
          <span className={styles.chip}>
            <span className={[styles.dot, styles.dot3].join(' ')} /> 白花显现
          </span>
        </div>
      </div>
    </div>
  )
}

