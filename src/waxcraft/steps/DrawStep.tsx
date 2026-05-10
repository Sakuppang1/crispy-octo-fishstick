import type { Dispatch } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { CraftState, StampKind, ToolId } from '../types'
import type { Action } from '../state'
import styles from './DrawStep.module.css'
import { drawStamp } from '../patterns/stamps'
import { smoothStrokePoints, strokeSmoothLine } from '../drawStroke'
import { trySnapPrimitives } from '../primitiveSnap'

const PX_TO_CM = 0.08
/** 描摹底图仅允许 PNG / JPEG（部分系统 MIME 为空，需结合扩展名判断） */
const TRACE_EXT = new Set(['.png', '.jpg', '.jpeg'])

function isPngOrJpegFile(f: File): boolean {
  const mime = (f.type || '').toLowerCase().trim()
  const name = f.name || ''
  const i = name.lastIndexOf('.')
  const ext = i >= 0 ? name.slice(i).toLowerCase() : ''
  const extOk = TRACE_EXT.has(ext)

  const mimeOk =
    mime === 'image/png' ||
    mime === 'image/x-png' ||
    mime === 'image/jpeg' ||
    mime === 'image/jpg' ||
    mime === 'image/pjpeg'

  if (mimeOk) return true
  // 部分系统 JPEG/PNG 的 type 为空或为 application/octet-stream，仅靠扩展名放行
  if (extOk && (mime === '' || mime === 'application/octet-stream')) return true
  return false
}

/** 蜡染刀光标图，置于 public/landing/wax-knife.png（最长边由 CSS 限制为 1cm） */
const KNIFE_CURSOR_SRC = '/landing/wax-knife.png'
/** 落笔后静止超过此时长（毫秒）则尝试拉直横线或规整为正圆 */
const STILL_SNAP_MS = 520

/** 画笔稳定度 0~100：越高越防抖（提交时平滑半径更大、采样更疏） */
function stabilityParams(t: number) {
  const x = Math.min(100, Math.max(0, t))
  const commitRadius = Math.max(1, Math.round(1 + (x / 100) * 6))
  const previewRadius = x < 16 ? 0 : Math.max(1, Math.min(4, Math.round(1 + ((x - 16) / 84) * 3)))
  const mergeDist = 1.25 + (x / 100) * 3.5
  return { commitRadius, previewRadius, mergeDist }
}

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
  const stillTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const didSnapRef = useRef(false)
  const redrawRef = useRef<() => void>(() => {})
  const traceFileRef = useRef<HTMLInputElement | null>(null)
  const stampGhostRef = useRef<HTMLCanvasElement | null>(null)
  const [brushStability, setBrushStability] = useState(52)
  const [cursor, setCursor] = useState<{ x: number; y: number; visible: boolean }>({ x: 0, y: 0, visible: false })
  const [mode, setMode] = useState<'draw' | 'stamp' | 'erase'>('draw')
  const [stampKind, setStampKind] = useState<StampKind>('flower1')
  const [stampSize, setStampSize] = useState(86)
  const [eraserSize, setEraserSize] = useState(28)
  const [traceUploadError, setTraceUploadError] = useState<string | null>(null)

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

    // 画路径（蜡线：平滑 + 柔边）
    for (const p of state.paths) {
      if (p.points.length < 2) continue
      strokeSmoothLine(ctx, p.points, { lineWidth: p.width, strokeStyle: wax, soft: true })
    }

    // 正在绘制的临时路径（实时轻平滑预览，强度随稳定度）
    const tmp = curPathRef.current
    if (tmp.length >= 2) {
      const { previewRadius } = stabilityParams(brushStability)
      const preview =
        tmp.length >= 4 && previewRadius > 0 ? smoothStrokePoints(tmp, previewRadius) : tmp
      strokeSmoothLine(ctx, preview, { lineWidth: toolWidth(state.tool), strokeStyle: wax, soft: true })
    }
  }

  redrawRef.current = redraw

  const clearStillTimer = () => {
    if (stillTimerRef.current != null) {
      window.clearTimeout(stillTimerRef.current)
      stillTimerRef.current = null
    }
  }

  const scheduleStillSnap = () => {
    if (didSnapRef.current) return
    clearStillTimer()
    stillTimerRef.current = window.setTimeout(() => {
      stillTimerRef.current = null
      if (!drawingRef.current) return
      if (didSnapRef.current) return
      const pts = curPathRef.current
      const snapped = trySnapPrimitives(pts)
      if (!snapped) return
      curPathRef.current = snapped
      didSnapRef.current = true
      redrawRef.current()
    }, STILL_SNAP_MS)
  }

  useEffect(() => {
    resize()
    const onResize = () => resize()
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      if (stillTimerRef.current != null) window.clearTimeout(stillTimerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    redraw()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.paths, state.stamps, state.tool, brushStability])

  useEffect(() => {
    const c = stampGhostRef.current
    if (!c || mode !== 'stamp' || !cursor.visible) return
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1))
    const size = Math.max(40, stampSize)
    c.width = Math.floor(size * dpr)
    c.height = Math.floor(size * dpr)
    c.style.width = `${size}px`
    c.style.height = `${size}px`
    const ctx = c.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, size, size)
    drawStamp(ctx, stampKind, size / 2, size / 2, size * 0.92, 'rgba(214, 160, 107, 0.34)')
    ctx.save()
    ctx.strokeStyle = 'rgba(214, 160, 107, 0.52)'
    ctx.setLineDash([6, 5])
    ctx.lineWidth = 1.5
    const m = 2.5
    ctx.strokeRect(m, m, size - m * 2, size - m * 2)
    ctx.restore()
  }, [mode, cursor.visible, stampKind, stampSize])

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

    clearStillTimer()
    didSnapRef.current = false
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
    const { mergeDist } = stabilityParams(brushStability)
    if (pts.length >= 1) {
      const prev = pts[pts.length - 1]
      if (dist(prev, p) < mergeDist) {
        pts[pts.length - 1] = p
        redraw()
        scheduleStillSnap()
        return
      }
    }
    pts.push(p)
    redraw()
    scheduleStillSnap()
  }

  const commit = () => {
    const pts = curPathRef.current
    if (pts.length < 2) {
      curPathRef.current = []
      redraw()
      return
    }
    const { commitRadius } = stabilityParams(brushStability)
    const smoothed = smoothStrokePoints(pts, commitRadius)
    let pxLen = 0
    for (let i = 1; i < smoothed.length; i++) pxLen += dist(smoothed[i - 1], smoothed[i])
    const lengthCm = pxLen * PX_TO_CM
    dispatch({ type: 'addPath', points: smoothed, width: toolWidth(state.tool), lengthCm })
    curPathRef.current = []
    redraw()
  }

  const onPointerUp = () => {
    if (erasingRef.current) {
      erasingRef.current = false
      return
    }
    clearStillTimer()
    drawingRef.current = false
    commit()
  }

  const setTool = (tool: ToolId) => dispatch({ type: 'setTool', tool })
  const canNext = state.paths.length > 0 || state.stamps.length > 0

  const onTraceFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    setTraceUploadError(null)
    if (!f) return
    if (!isPngOrJpegFile(f)) {
      setTraceUploadError('请使用 PNG 或 JPG 格式（.png / .jpg / .jpeg）。')
      return
    }
    if (f.size > 12 * 1024 * 1024) {
      setTraceUploadError('图片需小于 12MB。')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = String(reader.result ?? '')
      if (!dataUrl.startsWith('data:')) {
        setTraceUploadError('无法读取该图片，请换一张 PNG 或 JPG 重试。')
        return
      }
      setTraceUploadError(null)
      dispatch({
        type: 'setTraceUnderlay',
        value: {
          dataUrl,
          offsetX: 0,
          offsetY: 0,
          scale: 1,
          opacity: 0.42,
        },
      })
    }
    reader.onerror = () => setTraceUploadError('读取文件失败，请重试。')
    reader.readAsDataURL(f)
  }

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

        {mode === 'draw' ? (
          <div className={styles.sizeWrap}>
            <div className={styles.sizeLabel}>画笔稳定度 {brushStability}</div>
            <input
              className={styles.sizeSlider}
              type="range"
              min={0}
              max={100}
              step={1}
              value={brushStability}
              onChange={(e) => setBrushStability(Number(e.target.value))}
            />
            <div className={styles.stabilityHint}>低：更跟手 · 高：更顺滑防抖</div>
          </div>
        ) : null}

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
        {state.traceUnderlay ? (
          <div className={styles.traceLayer} aria-hidden>
            <img
              src={state.traceUnderlay.dataUrl}
              alt=""
              className={styles.traceImg}
              draggable={false}
              style={{
                opacity: state.traceUnderlay.opacity,
                transform: `translate(calc(-50% + ${state.traceUnderlay.offsetX}px), calc(-50% + ${state.traceUnderlay.offsetY}px)) scale(${state.traceUnderlay.scale})`,
              }}
            />
          </div>
        ) : null}
        <div className={styles.grid} />
        {mode === 'stamp' && cursor.visible ? (
          <canvas ref={stampGhostRef} className={styles.stampGhost} style={{ left: cursor.x, top: cursor.y }} aria-hidden />
        ) : null}
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
          onPointerCancel={onPointerUp}
          onPointerLeave={(e) => {
            const c = canvasRef.current
            // 按下后 setPointerCapture：指针移出画布几何范围仍会触发 leave；
            // 若此时把光标隐藏，蜡刀会消失。仅在未捕获本指针时隐藏。
            if (c?.hasPointerCapture(e.pointerId)) return
            setCursor((p) => ({ ...p, visible: false }))
          }}
        />
        <div
          className={[
            styles.cursor,
            cursor.visible ? styles.cursorVisible : '',
            mode === 'stamp' && cursor.visible ? styles.cursorHideInStamp : '',
          ].join(' ')}
          style={{ left: cursor.x, top: cursor.y }}
          aria-hidden
        >
          <img src={KNIFE_CURSOR_SRC} alt="" className={styles.cursorKnife} draggable={false} />
        </div>
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

        <div className={styles.traceCard}>
          <div className={styles.traceCardTitle}>描摹底图</div>
          <p className={styles.traceHint}>仅在本步显示；起缸及之后环节不会显示底图。</p>
          <p className={styles.traceFormatNote}>仅支持 PNG、JPG 格式（.png / .jpg / .jpeg）。</p>
          <input
            ref={traceFileRef}
            type="file"
            accept=".png,.jpg,.jpeg,image/png,image/jpeg"
            className={styles.traceHiddenInput}
            onChange={onTraceFileChange}
          />
          <button
            type="button"
            className={styles.traceFileBtn}
            onClick={() => {
              setTraceUploadError(null)
              traceFileRef.current?.click()
            }}
          >
            上传图片…
          </button>
          {traceUploadError ? <p className={styles.traceUploadError}>{traceUploadError}</p> : null}
          {state.traceUnderlay ? (
            <>
              <div className={styles.traceSliderBlock}>
                <div className={styles.traceSliderLabel}>
                  <span>透明度</span>
                  <span>{Math.round(state.traceUnderlay.opacity * 100)}%</span>
                </div>
                <input
                  className={styles.sizeSlider}
                  type="range"
                  min={0.06}
                  max={0.95}
                  step={0.01}
                  value={state.traceUnderlay.opacity}
                  onChange={(e) =>
                    dispatch({ type: 'updateTraceUnderlay', patch: { opacity: Number(e.target.value) } })
                  }
                />
              </div>
              <div className={styles.traceSliderBlock}>
                <div className={styles.traceSliderLabel}>
                  <span>缩放</span>
                  <span>{state.traceUnderlay.scale.toFixed(2)}×</span>
                </div>
                <input
                  className={styles.sizeSlider}
                  type="range"
                  min={0.2}
                  max={3}
                  step={0.02}
                  value={state.traceUnderlay.scale}
                  onChange={(e) =>
                    dispatch({ type: 'updateTraceUnderlay', patch: { scale: Number(e.target.value) } })
                  }
                />
              </div>
              <div className={styles.traceSliderBlock}>
                <div className={styles.traceSliderLabel}>
                  <span>左右位置</span>
                  <span>{Math.round(state.traceUnderlay.offsetX)}px</span>
                </div>
                <input
                  className={styles.sizeSlider}
                  type="range"
                  min={-400}
                  max={400}
                  step={2}
                  value={state.traceUnderlay.offsetX}
                  onChange={(e) =>
                    dispatch({ type: 'updateTraceUnderlay', patch: { offsetX: Number(e.target.value) } })
                  }
                />
              </div>
              <div className={styles.traceSliderBlock}>
                <div className={styles.traceSliderLabel}>
                  <span>上下位置</span>
                  <span>{Math.round(state.traceUnderlay.offsetY)}px</span>
                </div>
                <input
                  className={styles.sizeSlider}
                  type="range"
                  min={-400}
                  max={400}
                  step={2}
                  value={state.traceUnderlay.offsetY}
                  onChange={(e) =>
                    dispatch({ type: 'updateTraceUnderlay', patch: { offsetY: Number(e.target.value) } })
                  }
                />
              </div>
              <button type="button" className={styles.traceClearBtn} onClick={() => dispatch({ type: 'setTraceUnderlay', value: null })}>
                移除底图
              </button>
            </>
          ) : null}
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

