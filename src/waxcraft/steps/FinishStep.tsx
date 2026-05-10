import type { Dispatch } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { CraftState, RegionId } from '../types'
import type { Action } from '../state'
import styles from './FinishStep.module.css'
import { drawStamp } from '../patterns/stamps'
import { logicalCanvasSize, mapStrokePoints, strokeSmoothLine } from '../drawStroke'

function formatTime(s: number) {
  const mm = String(Math.floor(s / 60)).padStart(2, '0')
  const ss = String(s % 60).padStart(2, '0')
  return `${mm}:${ss}`
}

function drawWhitePattern(canvas: HTMLCanvasElement, state: CraftState) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const { lw: w, lh: h } = logicalCanvasSize(canvas)
  ctx.clearRect(0, 0, w, h)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  ctx.strokeStyle = 'rgba(255,255,255,0.92)'
  const allPoints = [
    ...state.paths.flatMap((p) => p.points),
    ...state.stamps.map((s) => ({ x: s.x, y: s.y })),
  ]
  if (allPoints.length < 2 && state.stamps.length === 0) {
    ctx.lineWidth = 10
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
  const pad = 64
  const scale = Math.min((w - pad * 2) / Math.max(1, maxX - minX), (h - pad * 2) / Math.max(1, maxY - minY))
  const ox = (w - (maxX - minX) * scale) / 2 - minX * scale
  const oy = (h - (maxY - minY) * scale) / 2 - minY * scale

  for (const s of state.stamps) {
    drawStamp(ctx, s.kind, s.x * scale + ox, s.y * scale + oy, s.size * scale, 'rgba(255,255,255,0.92)')
  }

  for (const p of state.paths) {
    if (p.points.length < 2) continue
    const mapped = mapStrokePoints(p.points, scale, ox, oy)
    strokeSmoothLine(ctx, mapped, {
      lineWidth: Math.max(6, p.width * 1.6),
      strokeStyle: 'rgba(255,255,255,0.92)',
      soft: true,
      glowStroke: 'rgba(255,255,255,0.14)',
      glowShadow: 'rgba(255,255,255,0.38)',
    })
  }
}

type RegionOption = { id: RegionId; name: string; desc: string; mini: string }
const REGION_OPTS: RegionOption[] = [
  { id: 'huangping', name: '黄平', desc: '细腻花鸟', mini: '∿' },
  { id: 'anshun', name: '安顺', desc: '粗矿留白', mini: '┐' },
  { id: 'zhijin', name: '织金', desc: '彩色突破', mini: '↘' },
]

export function FinishStep({ state, dispatch }: { state: CraftState; dispatch: Dispatch<Action> }) {
  const patternRef = useRef<HTMLCanvasElement | null>(null)
  const [modal, setModal] = useState(false)

  useEffect(() => {
    const c = patternRef.current
    if (!c) return
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1))
    const size = 980
    c.width = Math.floor(size * dpr)
    c.height = Math.floor(size * dpr)
    c.style.width = '100%'
    c.style.height = '100%'
    const ctx = c.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    drawWhitePattern(c, state)
  }, [state.paths, state.stamps, state.aiEnhance])

  const iceOpacity = useMemo(() => (state.showIceCrack ? 0.55 : 0), [state.showIceCrack])

  const setRegion = (id: RegionId) => {
    dispatch({ type: 'setRegion', regionId: id })
  }

  const exportWork = async () => {
    // 模拟“保存到本地”的交互：弹出提示框（贴近视频）
    setModal(true)
    window.setTimeout(() => setModal(false), 1200)
    dispatch({ type: 'setFinished', value: true })
  }

  return (
    <div className={styles.layout}>
      <div className={styles.canvasArea}>
        <div className={styles.patternStage}>
          <div className={styles.patternStageSquare}>
            <div className={styles.fabric} />
            <div className={styles.stitch} />
            <canvas className={styles.pattern} ref={patternRef} />
            <div className={styles.ice} style={{ ['--ice' as never]: iceOpacity }} />
          </div>
        </div>

        <div className={styles.bottomBar}>
          <div className={styles.stats}>
            <span>
              线条 <b>{state.stats.strokes} 条</b>
            </span>
            <span>
              总长 <b>{state.stats.lengthCm} cm</b>
            </span>
            <span>
              用时 <b>{formatTime(state.stats.seconds)}</b>
            </span>
          </div>

          <div className={styles.actions}>
            <button className={styles.btn} onClick={() => window.location.assign('/')}>
              再次体验
            </button>
            <button className={[styles.btn, styles.btnPrimary].join(' ')} onClick={() => setModal(true)}>
              查看文化背景
            </button>
            <button className={[styles.btn, styles.btnAccent].join(' ')} onClick={exportWork}>
              导出作品
            </button>
          </div>
        </div>

        {modal ? (
          <div className={styles.modalMask} onClick={() => setModal(false)}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div className={styles.ok}>✓</div>
              <div className={styles.modalTitle}>作品已保存</div>
              <div className={styles.modalDesc}>您的蜡染作品已保存到本地</div>
            </div>
          </div>
        ) : null}
      </div>

      <div className={styles.right}>
        <div className={styles.panel}>
          <div className={styles.optTitle}>预设风格</div>
          {REGION_OPTS.map((o) => {
            const active = state.regionId === o.id
            return (
              <div key={o.id} className={styles.radioItem} onClick={() => setRegion(o.id)} role="button" tabIndex={0}>
                <div className={styles.radioDot}>{active ? <div className={styles.radioDotInner} /> : null}</div>
                <div className={styles.radioText}>
                  <div className={styles.radioName}>{o.name}</div>
                  <div className={styles.radioDesc}>{o.desc}</div>
                </div>
                <div className={styles.miniIcon}>{o.mini}</div>
              </div>
            )
          })}
        </div>

        <div className={styles.panel}>
          <div className={styles.optTitle}>效果增强</div>

          <div
            className={styles.radioItem}
            onClick={() => dispatch({ type: 'setAiEnhance', value: false })}
            role="button"
            tabIndex={0}
          >
            <div className={styles.radioDot}>{!state.aiEnhance ? <div className={styles.radioDotInner} /> : null}</div>
            <div className={styles.radioText}>
              <div className={styles.radioName}>原始效果</div>
              <div className={styles.radioDesc}>传统蜡染风格</div>
            </div>
          </div>

          <div
            className={styles.radioItem}
            onClick={() => dispatch({ type: 'setAiEnhance', value: true })}
            role="button"
            tabIndex={0}
            style={{ marginTop: 10 }}
          >
            <div className={styles.radioDot}>{state.aiEnhance ? <div className={styles.radioDotInner} /> : null}</div>
            <div className={styles.radioText}>
              <div className={styles.radioName}>AI 增强</div>
              <div className={styles.radioDesc}>智能优化线条细节</div>
            </div>
          </div>

          <div className={styles.toggleRow}>
            <span>显示冰裂效果</span>
            <div
              className={[styles.switch, state.showIceCrack ? styles.switchOn : ''].join(' ')}
              onClick={() => dispatch({ type: 'setShowIceCrack', value: !state.showIceCrack })}
              role="switch"
              aria-checked={state.showIceCrack}
              tabIndex={0}
            >
              <div className={[styles.knob, state.showIceCrack ? styles.knobOn : ''].join(' ')} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

