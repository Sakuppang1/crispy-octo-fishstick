/** 绘制阶段：点列平滑 + 二次贝塞尔描边，线条更柔和 */

export type StrokePoint = { x: number; y: number }

/**
 * 画布已执行 setTransform(dpr,0,0,dpr,0,0) 时，逻辑坐标系的宽高（与 devicePixelRatio 一致）
 */
export function logicalCanvasSize(canvas: HTMLCanvasElement): { lw: number; lh: number } {
  const ctx = canvas.getContext('2d')
  const dpr = ctx ? Math.max(1e-6, Math.abs(ctx.getTransform().a)) : 1
  return { lw: canvas.width / dpr, lh: canvas.height / dpr }
}

/** 对点列做加权滑动平均，端点保持不动，减轻手抖 */
export function smoothStrokePoints(pts: StrokePoint[], radius = 3): StrokePoint[] {
  const n = pts.length
  if (n < 4) return pts
  const out: StrokePoint[] = new Array(n)
  for (let i = 0; i < n; i++) {
    if (i === 0) {
      out[i] = { ...pts[0] }
      continue
    }
    if (i === n - 1) {
      out[i] = { ...pts[n - 1] }
      continue
    }
    let sx = 0
    let sy = 0
    let wsum = 0
    for (let j = Math.max(0, i - radius); j <= Math.min(n - 1, i + radius); j++) {
      const w = radius + 1 - Math.abs(i - j)
      sx += pts[j].x * w
      sy += pts[j].y * w
      wsum += w
    }
    out[i] = { x: sx / wsum, y: sy / wsum }
  }
  return out
}

/** 将点列映射到另一坐标系（缩放 + 平移） */
export function mapStrokePoints(
  pts: ReadonlyArray<StrokePoint>,
  scale: number,
  ox: number,
  oy: number,
): StrokePoint[] {
  return pts.map((p) => ({ x: p.x * scale + ox, y: p.y * scale + oy }))
}

/**
 * 用二次贝塞尔串联点列（比折线更顺滑），向 ctx 的当前 path 追加子路径（不 stroke）
 */
export function addSmoothPolylineToPath(ctx: CanvasRenderingContext2D, pts: ReadonlyArray<StrokePoint>) {
  const n = pts.length
  if (n < 2) return
  if (n === 2) {
    ctx.moveTo(pts[0].x, pts[0].y)
    ctx.lineTo(pts[1].x, pts[1].y)
    return
  }
  ctx.moveTo(pts[0].x, pts[0].y)
  for (let i = 1; i < n - 2; i++) {
    const xc = (pts[i].x + pts[i + 1].x) * 0.5
    const yc = (pts[i].y + pts[i + 1].y) * 0.5
    ctx.quadraticCurveTo(pts[i].x, pts[i].y, xc, yc)
  }
  ctx.quadraticCurveTo(pts[n - 2].x, pts[n - 2].y, pts[n - 1].x, pts[n - 1].y)
}

export type SmoothStrokeOptions = {
  lineWidth: number
  strokeStyle: string
  /** 为 false 时单层描边（如完成页白线） */
  soft?: boolean
  /** 柔边底层描边色 */
  glowStroke?: string
  /** 柔边阴影色 */
  glowShadow?: string
}

/**
 * 平滑描边：可选柔边（略宽半透明底层 + 阴影 + 主色芯线）
 */
export function strokeSmoothLine(
  ctx: CanvasRenderingContext2D,
  pts: ReadonlyArray<StrokePoint>,
  o: SmoothStrokeOptions,
) {
  if (pts.length < 2) return
  const { lineWidth, strokeStyle } = o
  const soft = o.soft !== false
  const glowStroke = o.glowStroke ?? 'rgba(214, 160, 107, 0.2)'
  const glowShadow = o.glowShadow ?? 'rgba(214, 160, 107, 0.45)'

  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  if (soft) {
    ctx.save()
    ctx.beginPath()
    addSmoothPolylineToPath(ctx, pts)
    ctx.strokeStyle = glowStroke
    ctx.lineWidth = lineWidth + 6
    ctx.shadowColor = glowShadow
    ctx.shadowBlur = Math.min(16, lineWidth * 1.25)
    ctx.stroke()
    ctx.restore()

    ctx.save()
    ctx.beginPath()
    addSmoothPolylineToPath(ctx, pts)
    ctx.strokeStyle = strokeStyle
    ctx.lineWidth = Math.max(1.2, lineWidth * 0.88)
    ctx.globalAlpha = 0.52
    ctx.shadowBlur = 0
    ctx.stroke()
    ctx.restore()
  }

  ctx.beginPath()
  addSmoothPolylineToPath(ctx, pts)
  ctx.strokeStyle = strokeStyle
  ctx.lineWidth = lineWidth
  ctx.globalAlpha = 1
  ctx.shadowBlur = 0
  ctx.stroke()
}
