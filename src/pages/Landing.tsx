import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import styles from './Landing.module.css'

/** 织物底图，置于 public/landing/fabric.png */
const FABRIC_BG = '/landing/fabric.png'

type Ripple = { x: number; y: number; r: number; o: number }

function WaterRippleCanvas() {
  const ref = useRef<HTMLCanvasElement | null>(null)
  const ripplesRef = useRef<Ripple[]>([])
  const lastMoveRef = useRef(0)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let rafId = 0
    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      const w = window.innerWidth
      const h = window.innerHeight
      canvas.width = Math.floor(w * dpr)
      canvas.height = Math.floor(h * dpr)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const loop = () => {
      const w = window.innerWidth
      const h = window.innerHeight
      ctx.clearRect(0, 0, w, h)
      const list = ripplesRef.current
      for (let i = list.length - 1; i >= 0; i--) {
        const p = list[i]
        // 略快外扩 + 较慢衰减，更像染料在水中晕开
        p.r += 2.75
        p.o *= 0.977
        if (p.o < 0.018 || p.r > 340) {
          list.splice(i, 1)
          continue
        }
        const o = p.o
        const rad = Math.max(p.r, 1)
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rad)
        // 靛蓝系（蜡染染液）：中心略深、边缘化开
        g.addColorStop(0, `rgba(18, 32, 88, ${0.16 * o})`)
        g.addColorStop(0.18, `rgba(28, 48, 118, ${0.26 * o})`)
        g.addColorStop(0.42, `rgba(42, 68, 148, ${0.17 * o})`)
        g.addColorStop(0.68, `rgba(58, 88, 168, ${0.08 * o})`)
        g.addColorStop(0.9, `rgba(72, 102, 188, ${0.03 * o})`)
        g.addColorStop(1, 'rgba(38, 58, 130, 0)')
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(p.x, p.y, rad, 0, Math.PI * 2)
        ctx.fill()

        // 外缘水波感：淡靛蓝细环
        ctx.beginPath()
        ctx.arc(p.x, p.y, rad, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(62, 92, 168, ${0.14 * o})`
        ctx.lineWidth = 1.2
        ctx.stroke()
        ctx.beginPath()
        ctx.arc(p.x, p.y, rad * 0.9, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(100, 128, 210, ${0.065 * o})`
        ctx.lineWidth = 0.85
        ctx.stroke()
      }
      rafId = requestAnimationFrame(loop)
    }

    const onMove = (e: MouseEvent) => {
      const now = performance.now()
      if (now - lastMoveRef.current < 28) return
      lastMoveRef.current = now
      ripplesRef.current.push({ x: e.clientX, y: e.clientY, r: 2, o: 0.98 })
      if (ripplesRef.current.length > 40) ripplesRef.current.shift()
    }

    resize()
    window.addEventListener('resize', resize)
    window.addEventListener('mousemove', onMove)
    rafId = requestAnimationFrame(loop)

    return () => {
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', onMove)
      cancelAnimationFrame(rafId)
    }
  }, [])

  return <canvas ref={ref} className={styles.waterRippleCanvas} aria-hidden />
}

type GallerySlide = { src: string; alt: string }

type Card = {
  id: 'dansai' | 'huangping' | 'anshun' | 'zhijin'
  title: string
  tag: string
  desc: string
  /** 将图片放在 public/landing/ 下，与 src 文件名一致；多张时每 3 秒自动切换 */
  gallery: GallerySlide[]
}

const CARDS: Card[] = [
  {
    id: 'dansai',
    title: '丹寨',
    tag: '经典蜡染',
    desc: '丹寨苗岭以几何纹样见长，螺旋、铜鼓纹层层递进，蓝白分明、对称严谨，是黔东南蜡染最具代表性的范式之一。',
    gallery: [
      { src: '/landing/dansai.jpg', alt: '丹寨蜡染：几何与花卉纹样 1' },
      { src: '/landing/dansai-2.jpg', alt: '丹寨蜡染：织物细节 2' },
    ],
  },
  {
    id: 'huangping',
    title: '黄平',
    tag: '细腻花鸟',
    desc: '黄平蜡染偏重花鸟鱼虫与植物藤蔓，线条婉转、层次丰富，在靛蓝底色上呈现细腻生动的自然意趣。',
    gallery: [
      { src: '/landing/huangping-1.jpg', alt: '黄平蜡染：花鸟纹样 1' },
      { src: '/landing/huangping-2.jpg', alt: '黄平蜡染：细腻线条 2' },
    ],
  },
  {
    id: 'anshun',
    title: '安顺',
    tag: '粗犷留白',
    desc: '安顺风格常以大块留白与粗犷冰纹相映，构图疏朗、气势开张，在对比中留出深远的意境与呼吸感。',
    gallery: [{ src: '/landing/anshun.jpg', alt: '安顺蜡染：靛蓝留白与花卉' }],
  },
  {
    id: 'zhijin',
    title: '织金',
    tag: '彩色突破',
    desc: '织金蜡染在蓝染之外融入多色套染与拼色手法，色彩更为斑斓，体现传统技艺与当代审美的融合探索。',
    gallery: [
      { src: '/landing/zhijin-1.jpg', alt: '织金蜡染：彩色套染 1' },
      { src: '/landing/zhijin-2.jpg', alt: '织金蜡染：拼色细节 2' },
    ],
  },
]

const SLIDE_INTERVAL_MS = 3000

function JourneyGallery({ slides }: { slides: GallerySlide[] }) {
  const [index, setIndex] = useState(0)
  const [lightbox, setLightbox] = useState<GallerySlide | null>(null)

  useEffect(() => {
    if (slides.length <= 1 || lightbox) return
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % slides.length)
    }, SLIDE_INTERVAL_MS)
    return () => window.clearInterval(id)
  }, [slides.length, lightbox])

  useEffect(() => {
    if (!lightbox) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightbox(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightbox])

  if (slides.length === 0) {
    return (
      <div
        className={styles.journeyImagePlaceholder}
        role="img"
        aria-label="暂无配图，请将图片放入 public/landing/"
      />
    )
  }

  const current = slides[index]

  const lightboxNode =
    lightbox &&
    createPortal(
      <div className={styles.lightboxMask} onClick={() => setLightbox(null)} role="presentation">
        <figure className={styles.lightboxFigure} onClick={(e) => e.stopPropagation()}>
          <button type="button" className={styles.lightboxClose} onClick={() => setLightbox(null)} aria-label="关闭大图">
            ×
          </button>
          <img className={styles.lightboxImg} src={lightbox.src} alt={lightbox.alt} />
        </figure>
      </div>,
      document.body,
    )

  return (
    <div className={styles.galleryWrap}>
      <button
        type="button"
        className={styles.galleryThumbBtn}
        onClick={() => setLightbox(current)}
        aria-label={`查看大图：${current.alt}`}
      >
        <div className={styles.journeyImageFrame}>
          <img
            className={styles.journeyImage}
            src={current.src}
            alt={current.alt}
            key={current.src}
            loading={index === 0 ? 'eager' : 'lazy'}
          />
        </div>
      </button>
      {slides.length > 1 ? (
        <div className={styles.galleryDots} role="tablist" aria-label="配图轮播">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`第 ${i + 1} 张，共 ${slides.length} 张`}
              className={[styles.galleryDot, i === index ? styles.galleryDotActive : ''].join(' ')}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
      ) : null}
      {lightboxNode}
    </div>
  )
}

export function Landing() {
  const nav = useNavigate()
  const cards = useMemo(() => CARDS, [])
  const [phase, setPhase] = useState<'intro' | 'styles'>('intro')

  return (
    <div className={[styles.page, phase === 'styles' ? styles.pageScroll : styles.pageIntroRoot].join(' ')}>
      <div className={styles.fabricLayer} style={{ backgroundImage: `url(${FABRIC_BG})` }} aria-hidden />
      <div className={styles.fabricVeil} aria-hidden />
      <div className={styles.waterAmbient} aria-hidden />
      <WaterRippleCanvas />
      <div className={[styles.pageContent, phase === 'intro' ? styles.pageContentIntro : ''].join(' ')}>
        {phase === 'intro' ? (
          <div className={styles.introInner}>
            <header className={styles.hero}>
              <h1 className={styles.titleBrand}>
                <img
                  className={styles.titleWord}
                  src="/landing/title-batik.png"
                  alt="Batik"
                  width={440}
                  height={120}
                  decoding="async"
                />
                <img
                  className={styles.titleWord}
                  src="/landing/title-studio.png"
                  alt="Studio"
                  width={520}
                  height={120}
                  decoding="async"
                />
              </h1>
            </header>
            <button type="button" className={styles.startBtn} onClick={() => setPhase('styles')}>
              Start your journey
            </button>
          </div>
        ) : (
          <div className={styles.browseWrap}>
            <header className={styles.browseTop}>
              <button type="button" className={styles.backLink} onClick={() => setPhase('intro')}>
                ← 返回
              </button>
              <div className={styles.browseBrand} aria-hidden>
                <img className={styles.browseBrandImg} src="/landing/title-batik.png" alt="" decoding="async" />
                <img className={styles.browseBrandImg} src="/landing/title-studio.png" alt="" decoding="async" />
              </div>
            </header>

            <div className={styles.journeyList}>
              {cards.map((c) => (
                <section key={c.id} className={styles.journeySection} aria-labelledby={`journey-${c.id}-title`}>
                  <div className={styles.journeyLeft}>
                    <h2 id={`journey-${c.id}-title`} className={styles.journeyTitle}>
                      {c.title}
                    </h2>
                    <p className={styles.journeyTag}>{c.tag}</p>
                  </div>
                  <div className={styles.journeyRight}>
                    <p className={styles.journeyDesc}>{c.desc}</p>
                    <JourneyGallery slides={c.gallery} />
                    <button type="button" className={styles.enterBtn} onClick={() => nav(`/craft/${c.id}`)}>
                      进入体验 →
                    </button>
                  </div>
                </section>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
