import type { StrokePoint } from './drawStroke'

/** 停顿后：近似横线 → 两端水平线段；近似闭合圆 → 正圆点列。不匹配则返回 null */

export function trySnapHorizontalLine(pts: ReadonlyArray<StrokePoint>): StrokePoint[] | null {
  if (pts.length < 3) return null
  const xs = pts.map((p) => p.x)
  const ys = pts.map((p) => p.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const spanX = maxX - minX
  const spanY = maxY - minY
  if (spanX < 42) return null
  if (spanY > Math.max(16, spanX * 0.13)) return null
  const y = ys.reduce((a, b) => a + b, 0) / ys.length
  const tol = Math.max(12, spanX * 0.09)
  for (const p of pts) {
    if (Math.abs(p.y - y) > tol) return null
  }
  return [
    { x: minX, y },
    { x: maxX, y },
  ]
}

function fitCircle(pts: ReadonlyArray<StrokePoint>): { cx: number; cy: number; r: number } | null {
  const n = pts.length
  if (n < 16) return null
  const cx = pts.reduce((s, p) => s + p.x, 0) / n
  const cy = pts.reduce((s, p) => s + p.y, 0) / n
  const radii = pts.map((p) => Math.hypot(p.x - cx, p.y - cy))
  const r = radii.reduce((a, b) => a + b, 0) / n
  if (r < 24) return null
  const meanSq = radii.reduce((s, rv) => s + (rv - r) ** 2, 0) / n
  const relDev = Math.sqrt(meanSq) / r
  if (relDev > 0.17) return null

  const gap = Math.hypot(pts[0].x - pts[n - 1].x, pts[0].y - pts[n - 1].y)
  if (gap > r * 0.42) return null

  const spanX = Math.max(...xsFrom(pts)) - Math.min(...xsFrom(pts))
  const spanY = Math.max(...ysFrom(pts)) - Math.min(...ysFrom(pts))
  const ratio = spanX / Math.max(spanY, 1e-6)
  if (ratio < 0.52 || ratio > 1.92) return null

  return { cx, cy, r }
}

function xsFrom(pts: ReadonlyArray<StrokePoint>) {
  return pts.map((p) => p.x)
}
function ysFrom(pts: ReadonlyArray<StrokePoint>) {
  return pts.map((p) => p.y)
}

export function buildCirclePoints(cx: number, cy: number, r: number, steps = 80): StrokePoint[] {
  const out: StrokePoint[] = []
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2
    out.push({ x: cx + r * Math.cos(t), y: cy + r * Math.sin(t) })
  }
  return out
}

export function trySnapCircle(pts: ReadonlyArray<StrokePoint>): StrokePoint[] | null {
  const c = fitCircle(pts)
  if (!c) return null
  return buildCirclePoints(c.cx, c.cy, c.r)
}

/** 横线优先（避免扁圆被误判为圆），否则尝试正圆 */
export function trySnapPrimitives(pts: ReadonlyArray<StrokePoint>): StrokePoint[] | null {
  const line = trySnapHorizontalLine(pts)
  if (line) return line
  return trySnapCircle(pts)
}
