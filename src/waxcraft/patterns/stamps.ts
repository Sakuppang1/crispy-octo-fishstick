import type { StampKind } from '../types'

export function drawStamp(
  ctx: CanvasRenderingContext2D,
  kind: StampKind,
  x: number,
  y: number,
  size: number,
  color: string,
) {
  ctx.save()
  ctx.translate(x, y)
  ctx.strokeStyle = color
  ctx.fillStyle = 'transparent'
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.lineWidth = Math.max(2.2, size * 0.06)

  const s = size

  const poly = (pts: Array<[number, number]>, closed = true) => {
    ctx.beginPath()
    ctx.moveTo(pts[0][0], pts[0][1])
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1])
    if (closed) ctx.closePath()
    ctx.stroke()
  }

  const spiral = (turns: number) => {
    ctx.beginPath()
    const steps = 90
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const a = t * turns * Math.PI * 2
      const r = t * s * 0.38
      const px = Math.cos(a) * r
      const py = Math.sin(a) * r
      if (i === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    }
    ctx.stroke()
  }

  const flower = (petals: number, aScale: number, bScale: number) => {
    for (let i = 0; i < petals; i++) {
      const a = (i / petals) * Math.PI * 2
      const px = Math.cos(a) * s * 0.18
      const py = Math.sin(a) * s * 0.18
      ctx.beginPath()
      ctx.ellipse(px, py, s * aScale, s * bScale, a, 0, Math.PI * 2)
      ctx.stroke()
    }
    spiral(1.1)
  }

  const butterfly = () => {
    const wing = (dir: 1 | -1) => {
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.bezierCurveTo(dir * s * 0.35, -s * 0.18, dir * s * 0.46, -s * 0.05, dir * s * 0.38, s * 0.12)
      ctx.bezierCurveTo(dir * s * 0.24, s * 0.34, dir * s * 0.05, s * 0.22, 0, s * 0.1)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.bezierCurveTo(dir * s * 0.26, -s * 0.4, dir * s * 0.42, -s * 0.28, dir * s * 0.36, -s * 0.08)
      ctx.stroke()
    }
    wing(1)
    wing(-1)
    ctx.beginPath()
    ctx.moveTo(0, -s * 0.22)
    ctx.lineTo(0, s * 0.22)
    ctx.stroke()
  }

  const dotRing = (n: number) => {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2
      const r = s * 0.34
      ctx.beginPath()
      ctx.arc(Math.cos(a) * r, Math.sin(a) * r, Math.max(1.8, s * 0.03), 0, Math.PI * 2)
      ctx.stroke()
    }
  }

  const grid = (cells: number) => {
    const r = s * 0.38
    for (let i = 1; i < cells; i++) {
      const t = -r + (2 * r * i) / cells
      ctx.beginPath()
      ctx.moveTo(-r, t)
      ctx.lineTo(r, t)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(t, -r)
      ctx.lineTo(t, r)
      ctx.stroke()
    }
    ctx.beginPath()
    ctx.rect(-r, -r, r * 2, r * 2)
    ctx.stroke()
  }

  switch (kind) {
    case 'flower1':
      flower(6, 0.18, 0.28)
      break
    case 'flower2':
      flower(8, 0.15, 0.24)
      break
    case 'flower3':
      flower(5, 0.2, 0.3)
      break
    case 'butterfly':
      butterfly()
      break
    case 'spiral':
      spiral(2.8)
      ctx.beginPath()
      ctx.arc(0, 0, s * 0.06, 0, Math.PI * 2)
      ctx.stroke()
      break
    case 'leaf':
      ctx.beginPath()
      ctx.ellipse(-s * 0.08, 0, s * 0.16, s * 0.28, -0.5, 0, Math.PI * 2)
      ctx.stroke()
      ctx.beginPath()
      ctx.ellipse(s * 0.08, 0, s * 0.16, s * 0.28, 0.5, 0, Math.PI * 2)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(0, -s * 0.32)
      ctx.lineTo(0, s * 0.32)
      ctx.stroke()
      break
    case 'wave':
      for (let k = -1; k <= 1; k++) {
        ctx.beginPath()
        ctx.moveTo(-s * 0.4, k * s * 0.14)
        ctx.bezierCurveTo(-s * 0.2, k * s * 0.26, 0, k * s * 0.02, s * 0.2, k * -s * 0.12)
        ctx.bezierCurveTo(s * 0.32, k * -s * 0.22, s * 0.48, k * 0.02, s * 0.4, k * s * 0.12)
        ctx.stroke()
      }
      break
    case 'square':
      ctx.beginPath()
      ctx.rect(-s * 0.32, -s * 0.32, s * 0.64, s * 0.64)
      ctx.stroke()
      ctx.beginPath()
      ctx.rect(-s * 0.16, -s * 0.16, s * 0.32, s * 0.32)
      ctx.stroke()
      break
    case 'diamond':
      poly([
        [0, -s * 0.38],
        [s * 0.34, 0],
        [0, s * 0.38],
        [-s * 0.34, 0],
      ])
      break
    case 'star': {
      const pts: Array<[number, number]> = []
      const spikes = 5
      for (let i = 0; i < spikes * 2; i++) {
        const a = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2
        const r = i % 2 === 0 ? s * 0.38 : s * 0.16
        pts.push([Math.cos(a) * r, Math.sin(a) * r])
      }
      poly(pts)
      break
    }
    case 'sun':
      ctx.beginPath()
      ctx.arc(0, 0, s * 0.18, 0, Math.PI * 2)
      ctx.stroke()
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2
        ctx.beginPath()
        ctx.moveTo(Math.cos(a) * s * 0.26, Math.sin(a) * s * 0.26)
        ctx.lineTo(Math.cos(a) * s * 0.42, Math.sin(a) * s * 0.42)
        ctx.stroke()
      }
      break
    case 'dotRing':
      dotRing(10)
      break
    case 'cross':
      ctx.beginPath()
      ctx.moveTo(-s * 0.38, 0)
      ctx.lineTo(s * 0.38, 0)
      ctx.moveTo(0, -s * 0.38)
      ctx.lineTo(0, s * 0.38)
      ctx.stroke()
      break
    case 'grid':
      grid(4)
      break
    case 'petal':
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2
        ctx.beginPath()
        ctx.ellipse(0, 0, s * 0.14, s * 0.34, a, 0, Math.PI * 2)
        ctx.stroke()
      }
      break
    case 'cloud':
      ctx.beginPath()
      ctx.moveTo(-s * 0.34, s * 0.06)
      ctx.bezierCurveTo(-s * 0.34, -s * 0.18, -s * 0.14, -s * 0.22, -s * 0.08, -s * 0.08)
      ctx.bezierCurveTo(0, -s * 0.32, s * 0.24, -s * 0.24, s * 0.18, -s * 0.06)
      ctx.bezierCurveTo(s * 0.36, -s * 0.02, s * 0.32, s * 0.18, s * 0.12, s * 0.16)
      ctx.bezierCurveTo(s * 0.06, s * 0.32, -s * 0.22, s * 0.28, -s * 0.28, s * 0.16)
      ctx.stroke()
      break
    case 'fish':
      ctx.beginPath()
      ctx.ellipse(0, 0, s * 0.28, s * 0.16, 0, 0, Math.PI * 2)
      ctx.stroke()
      poly([
        [s * 0.28, 0],
        [s * 0.42, -s * 0.12],
        [s * 0.42, s * 0.12],
      ])
      ctx.beginPath()
      ctx.arc(-s * 0.1, -s * 0.03, Math.max(1.6, s * 0.02), 0, Math.PI * 2)
      ctx.stroke()
      break
    case 'bird':
      ctx.beginPath()
      ctx.moveTo(-s * 0.38, s * 0.06)
      ctx.quadraticCurveTo(-s * 0.18, -s * 0.22, 0, -s * 0.04)
      ctx.quadraticCurveTo(s * 0.18, -s * 0.22, s * 0.38, s * 0.06)
      ctx.stroke()
      break
    case 'vine':
      spiral(1.9)
      dotRing(8)
      break
    case 'paisley':
      ctx.beginPath()
      ctx.moveTo(-s * 0.08, s * 0.34)
      ctx.bezierCurveTo(-s * 0.38, s * 0.12, -s * 0.18, -s * 0.28, s * 0.12, -s * 0.26)
      ctx.bezierCurveTo(s * 0.42, -s * 0.22, s * 0.32, s * 0.16, s * 0.08, s * 0.1)
      ctx.bezierCurveTo(-s * 0.02, s * 0.06, -s * 0.02, s * 0.2, s * 0.14, s * 0.2)
      ctx.stroke()
      break
    case 'moon':
      ctx.beginPath()
      ctx.arc(0, 0, s * 0.28, -Math.PI / 2, Math.PI / 2, false)
      ctx.arc(s * 0.1, 0, s * 0.22, Math.PI / 2, -Math.PI / 2, true)
      ctx.stroke()
      break
    default:
      flower(6, 0.18, 0.28)
  }

  ctx.restore()
}

