import type { Dispatch } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { CraftState, StampKind, ToolId } from '../types'
import type { Action } from '../state'
import styles from './DrawStep.module.css'
import { drawStamp } from '../patterns/stamps'

const PX_TO_CM = 0.08

function regionMeta(regionId: CraftState['regionId']) {
  switch (regionId) {
    case 'dansai':
      return { title: '丹寨', tag: '经典蜡染' }
    case 'huangping':
      return { title: '黄平', tag: '细腻花鸟' }
    case 'anshun':
      return { title: '安顺', tag: '粗矿留白' }
    case 'zhijin':
      return { title: '织金', tag: '彩色突破' }
  }
}

function toolWidth(tool: ToolId) {
  return tool === 'centerKnife' ? 5 : 9
}

function formatTime(s: number) {
  const mm = String(Math.floor(s / 60)).padStart(2, '0')
  const ss = String(s % 60).padStart(2, '0')
  return `${mm}:${ss}`
}

function dist(a: { x: number; y: number }, b: { x: number; y: number }) {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.sqrt(dx * dx + dy * dy)
}

function StampPreview({ kind }: { kind: StampKind }) {
  const ref = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const c = ref.current
    if (!c) return
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1))
    const size = 28
    c.width = Math.floor(size * dpr)
    c.height = Math.floor(size * dpr)
    c.style.width = `${size}px`
    c.style.height = `${size}px`
    const ctx = c.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, size, size)
    drawStamp(ctx, kind, size / 2, size / 2, 22, 'rgba(214, 160, 107, 0.95)')
  }, [kind])

  return <canvas ref={ref} className={styles.stampPreview} aria-hidden="true" />
}

export function DrawStep({ state, dispatch }: { state: CraftState; dispatch: Dispatch<Action> }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const drawingRef = useRef(false)
  const erasingRef = useRef(false)
  const curPathRef = useRef<Array<{ x: number; y: number }>>([])
  const [cursor, setCursor] = useState<{ x: number; y: number; visible: boolean }>({ x: 0, y: 0, visible: false })
  const [mode, setMode] = useState<'draw' | 'stamp' | 'erase'>('draw')
  const [stampKind, setStampKind] = useState<StampKind>('flower1')
  const [stampSize, setStampSize] = useState(86)
  const [eraserSize, setEraserSize] = useState(28)

  const meta = useMemo(() => regionMeta(state.regionId), [state.regionId])

  const resize = () => {
    const c = canvasRef.current
    const w = wrapRef.current
    if (!c || !w) return
    const rect = w.getBoundingClientRect()
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1))
    c.width = Math.floor(rect.width * dpr)
    c.height = Math.floor(rect.height * dpr)
    c.style.width = `${rect.width}px`
    c.style.height = `${rect.height}px`
    const ctx = c.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    redraw()
  }

  const redraw = () => {
    const c = canvasRef.current
    if (!c) return
    const ctx = c.getContext('2d')
    if (!ctx) return
    const { width, height } = c.getBoundingClientRect()
    ctx.clearRect(0, 0, width, height)

    const wax = 'rgba(214, 160, 107, 0.95)'

    // 画印章（蜡黄）
    for (const s of state.stamps) {
      drawStamp(ctx, s.kind, s.x, s.y, s.size, wax)
    }

    // 画路径（蜡线）
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    for (const p of state.paths) {
      if (p.points.length < 2) continue
      ctx.strokeStyle = wax
      ctx.lineWidth = p.width
      ctx.beginPath()
      ctx.moveTo(p.points[0].x, p.points[0].y)
      for (let i = 1; i < p.points.length; i++) ctx.lineTo(p.points[i].x, p.points[i].y)
      ctx.stroke()
    }

    // 正在绘制的临时路径
    const tmp = curPathRef.current
    if (tmp.length >= 2) {
      ctx.strokeStyle = wax
      ctx.lineWidth = toolWidth(state.tool)
      ctx.beginPath()
      ctx.moveTo(tmp[0].x, tmp[0].y)
      for (let i = 1; i < tmp.length; i++) ctx.lineTo(tmp[i].x, tmp[i].y)
      ctx.stroke()
    }
  }

  useEffect(() => {
    resize()
    const onResize = () => resize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    redraw()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.paths, state.stamps, state.tool])

  const pointFromEvent = (e: PointerEvent | React.PointerEvent) => {
    const c = canvasRef.current
    if (!c) return { x: 0, y: 0 }
    const rect = c.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const onPointerDown = (e: React.PointerEvent) => {
    const c = canvasRef.current
    if (!c) return
    c.setPointerCapture(e.pointerId)
    const p = pointFromEvent(e)
    setCursor({ x: p.x, y: p.y, visible: true })

    if (mode === 'stamp') {
      dispatch({ type: 'addStamp', x: p.x, y: p.y, size: stampSize, kind: stampKind })
      redraw()
      return
    }

    if (mode === 'erase') {
      erasingRef.current = true
      dispatch({ type: 'eraseAt', x: p.x, y: p.y, radius: eraserSize })
      redraw()
      return
    }

    drawingRef.current = true
    curPathRef.current = [p]
    redraw()
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const p = pointFromEvent(e)
    setCursor({ x: p.x, y: p.y, visible: true })

    if (erasingRef.current && mode === 'erase') {
      dispatch({ type: 'eraseAt', x: p.x, y: p.y, radius: eraserSize })
      redraw()
      return
    }

    if (!drawingRef.current) return
    const pts = curPathRef.current
    pts.push(p)
    // 限制点数避免过密
    if (pts.length > 2) {
      const a = pts[pts.length - 2]
      if (dist(a, p) < 1.5) return
    }
    redraw()
  }

  const commit = () => {
    const pts = curPathRef.current
    if (pts.length < 2) {
      curPathRef.current = []
      redraw()
      return
    }
    let pxLen = 0
    for (let i = 1; i < pts.length; i++) pxLen += dist(pts[i - 1], pts[i])
    const lengthCm = pxLen * PX_TO_CM
    dispatch({ type: 'addPath', points: pts, width: toolWidth(state.tool), lengthCm })
    curPathRef.current = []
    redraw()
  }

  const onPointerUp = () => {
    if (erasingRef.current) {
      erasingRef.current = false
      return
    }
    drawingRef.current = false
    commit()
  }

  const setTool = (tool: ToolId) => dispatch({ type: 'setTool', tool })
  const canNext = state.paths.length > 0 || state.stamps.length > 0

  const STAMPS: Array<{ kind: StampKind; title: string }> = [
    { kind: 'flower1', title: '花纹 1' },
    { kind: 'flower2', title: '花纹 2' },
    { kind: 'flower3', title: '花纹 3' },
    { kind: 'butterfly', title: '蝴蝶' },
    { kind: 'spiral', title: '卷纹' },
    { kind: 'leaf', title: '叶片' },
    { kind: 'wave', title: '波浪' },
    { kind: 'square', title: '方形' },
    { kind: 'diamond', title: '菱形' },
    { kind: 'star', title: '星形' },
    { kind: 'sun', title: '太阳' },
    { kind: 'moon', title: '月牙' },
    { kind: 'dotRing', title: '点环' },
    { kind: 'cross', title: '十字' },
    { kind: 'grid', title: '网格' },
    { kind: 'petal', title: '花瓣' },
    { kind: 'cloud', title: '云纹' },
    { kind: 'fish', title: '鱼纹' },
    { kind: 'bird', title: '鸟纹' },
    { kind: 'vine', title: '藤蔓' },
    { kind: 'paisley', title: '佩斯利' },
  ]

  return (
    <div className={styles.layout}>
      <div className={styles.leftTools}>
        <button
          className={[styles.toolBtn, state.tool === 'centerKnife' ? styles.toolBtnActive : ''].join(' ')}
          onClick={() => {
            setTool('centerKnife')
            setMode('draw')
          }}
        >
          <div className={styles.toolIcon}>∣</div>
          <div className={styles.toolLabel}>中线刀</div>
        </button>
        <button
          className={[styles.toolBtn, state.tool === 'variantKnife' ? styles.toolBtnActive : ''].join(' ')}
          onClick={() => {
            setTool('variantKnife')
            setMode('draw')
          }}
        >
          <div className={styles.toolIcon}>∧</div>
          <div className={styles.toolLabel}>变刀</div>
        </button>

        <button
          className={[styles.toolBtn, mode === 'erase' ? styles.toolBtnActive : ''].join(' ')}
          onClick={() => setMode('erase')}
        >
          <div className={styles.toolIcon}>⌫</div>
          <div className={styles.toolLabel}>橡皮擦</div>
        </button>

        {mode === 'erase' ? (
          <div className={styles.sizeWrap}>
            <div className={styles.sizeLabel}>擦除大小 {eraserSize}</div>
            <input
              className={styles.sizeSlider}
              type="range"
              min={12}
              max={72}
              step={2}
              value={eraserSize}
              onChange={(e) => setEraserSize(Number(e.target.value))}
            />
          </div>
        ) : null}

        <div className={styles.sectionTitle}>Pattern</div>
        <button
          className={[styles.toolBtn, mode === 'stamp' ? styles.toolBtnActive : ''].join(' ')}
          onClick={() => setMode('stamp')}
        >
          <div className={styles.toolIcon}>✿</div>
          <div className={styles.toolLabel}>图案印章</div>
        </button>

        {mode === 'stamp' ? (
          <div className={styles.stampRow}>
            <div className={styles.stampGrid}>
              {STAMPS.map((s) => (
                <button
                  key={s.kind}
                  className={[styles.stampBtn, stampKind === s.kind ? styles.stampBtnActive : ''].join(' ')}
                  onClick={() => setStampKind(s.kind)}
                  title={s.title}
                  aria-label={s.title}
                >
                  <StampPreview kind={s.kind} />
                </button>
              ))}
            </div>

            <div className={styles.sizeWrap}>
              <div className={styles.sizeLabel}>大小 {stampSize}</div>
              <input
                className={styles.sizeSlider}
                type="range"
                min={40}
                max={140}
                step={2}
                value={stampSize}
                onChange={(e) => setStampSize(Number(e.target.value))}
              />
            </div>
          </div>
        ) : null}
      </div>

      <div className={styles.canvasWrap} ref={wrapRef}>
        <div className={styles.grid} />
        <div className={[styles.cursor, cursor.visible ? styles.cursorVisible : ''].join(' ')} style={{ left: cursor.x, top: cursor.y }} />
        <div className={[styles.corner, styles.c1].join(' ')} />
        <div className={[styles.corner, styles.c2].join(' ')} />
        <div className={[styles.corner, styles.c3].join(' ')} />
        <div className={[styles.corner, styles.c4].join(' ')} />
        <canvas
          ref={canvasRef}
          className={styles.canvas}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={() => setCursor((p) => ({ ...p, visible: false }))}
        />
        <button
          className={styles.nextBtn}
          disabled={!canNext}
          onClick={() => dispatch({ type: 'setStep', step: 'vat' })}
        >
          起缸 →
        </button>
      </div>

      <div className={styles.rightPanel}>
        <div className={styles.regionCard}>
          <div className={styles.regionTitle}>{meta.title}</div>
          <div className={styles.regionTag}>{meta.tag}</div>
        </div>
        <div className={styles.stats}>
          <div className={styles.statsTitle}>绘制状态</div>
          <div className={styles.statRow}>
            <span>线条</span>
            <span className={styles.statValue}>{state.stats.strokes} 条</span>
          </div>
          <div className={styles.statRow}>
            <span>总长</span>
            <span className={styles.statValue}>{state.stats.lengthCm} cm</span>
          </div>
          <div className={styles.statRow}>
            <span>时间</span>
            <span className={styles.statValue}>{formatTime(state.stats.seconds)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

