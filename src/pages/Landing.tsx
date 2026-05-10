import { useEffect, useMemo, useRef, useState, type TransitionEvent } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import styles from './Landing.module.css'

/** 织物底图，置于 public/landing/fabric.jpg */
const FABRIC_BG = '/landing/fabric.jpg'

type Ripple = { x: number; y: number; r: number; o: number }

function WaterRippleCanvas() {
  const ref = useRef<HTMLCanvasElement | null>(null)
  const ripplesRef = useRef<Ripple[]>([])
  const lastMoveRef = useRef(0)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return

    let rafId = 0

    const tick = () => {
      const w = window.innerWidth
      const h = window.innerHeight
      ctx.clearRect(0, 0, w, h)
      const list = ripplesRef.current
      for (let i = list.length - 1; i >= 0; i--) {
        const p = list[i]
        p.r += 2.75
        p.o *= 0.977
        if (p.o < 0.018 || p.r > 320) {
          list.splice(i, 1)
          continue
        }
        const o = p.o
        const rad = Math.max(p.r, 1)
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rad)
        g.addColorStop(0, `rgba(20, 36, 92, ${0.15 * o})`)
        g.addColorStop(0.25, `rgba(32, 52, 124, ${0.24 * o})`)
        g.addColorStop(0.55, `rgba(52, 78, 158, ${0.1 * o})`)
        g.addColorStop(1, 'rgba(38, 58, 130, 0)')
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(p.x, p.y, rad, 0, Math.PI * 2)
        ctx.fill()

        ctx.beginPath()
        ctx.arc(p.x, p.y, rad, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(62, 92, 168, ${0.12 * o})`
        ctx.lineWidth = 1.1
        ctx.stroke()
      }
      if (list.length > 0) {
        rafId = requestAnimationFrame(tick)
      } else {
        rafId = 0
      }
    }

    const kick = () => {
      if (rafId !== 0) return
      rafId = requestAnimationFrame(tick)
    }

    const resize = () => {
      cancelAnimationFrame(rafId)
      rafId = 0
      // 柔光涟漪用 1× 像素即可，避免高 DPR 下每帧大面积渐变导致卡顿
      const dpr = 1
      const w = window.innerWidth
      const h = window.innerHeight
      canvas.width = Math.floor(w * dpr)
      canvas.height = Math.floor(h * dpr)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      if (ripplesRef.current.length > 0) kick()
    }

    const onMove = (e: MouseEvent) => {
      const now = performance.now()
      if (now - lastMoveRef.current < 48) return
      lastMoveRef.current = now
      ripplesRef.current.push({ x: e.clientX, y: e.clientY, r: 2, o: 0.98 })
      if (ripplesRef.current.length > 22) ripplesRef.current.shift()
      kick()
    }

    resize()
    window.addEventListener('resize', resize)
    window.addEventListener('mousemove', onMove, { passive: true })

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
  descZh: string
  descEn: string
  /** 将图片放在 public/landing/ 下，与 src 文件名一致；多张时每 3 秒自动切换 */
  gallery: GallerySlide[]
}

const CARDS: Card[] = [
  {
    id: 'dansai',
    title: '丹寨蜡染',
    tag: 'Danzhai Batik',
    descZh: '丹寨蜡染以优雅灵动的蝴蝶妈妈纹与花鸟叙事著称，于细腻笔意间流淌着苗族对生命源起的浪漫想象。',
    descEn:
      'Danzhai batik is renowned for its graceful "Butterfly Mother" motifs and floral narratives, through whose delicate artistry flows the Miao people\'s romantic imagination of life\'s origins.',
    gallery: [
      { src: '/landing/dansai.jpg', alt: '丹寨蜡染：几何与花卉纹样 1' },
      { src: '/landing/dansai-2.jpg', alt: '丹寨蜡染：织物细节 2' },
    ],
  },
  {
    id: 'huangping',
    title: '黄平蜡染',
    tag: 'Huangping Batik',
    descZh: '黄平蜡染承袭铜鼓遗韵，以规整对称的几何纹样与图腾符号，凝固了黔东南革家人对宇宙秩序的古老理解。',
    descEn:
      'Huangping batik inherits the legacy of bronze drums, solidifying the ancient cosmological understanding of the Gejia people in southeastern Guizhou through its orderly, symmetrical geometric patterns and totemic symbols.',
    gallery: [
      { src: '/landing/huangping-1.jpg', alt: '黄平蜡染：花鸟纹样 1' },
      { src: '/landing/huangping-2.jpg', alt: '黄平蜡染：细腻线条 2' },
    ],
  },
  {
    id: 'anshun',
    title: '安顺蜡染',
    tag: 'Anshun Batik',
    descZh: '安顺蜡染常以植物染料点染，于靛蓝之外添红黄等色，绘就黔中斑斓的民族色谱。',
    descEn:
      'Anshun batik often applies plant-based dyes beyond indigo, adding reds and yellows to compose a vibrant ethnic palette in central Guizhou.',
    gallery: [{ src: '/landing/anshun.jpg', alt: '安顺蜡染：靛蓝留白与花卉' }],
  },
  {
    id: 'zhijin',
    title: '织金蜡染',
    tag: 'Zhijin Batik',
    descZh: '织金蜡染以细若游丝的线条和繁密的几何纹样见长，于靛蓝底色上织就一部苗族迁徙史的密码史诗。',
    descEn:
      'Zhijin batik is distinguished by its silk-fine lines and dense geometric motifs, weaving an epic of Miao migration history encoded upon an indigo ground.',
    gallery: [
      { src: '/landing/zhijin-1.jpg', alt: '织金蜡染：彩色套染 1' },
      { src: '/landing/zhijin-2.jpg', alt: '织金蜡染：拼色细节 2' },
    ],
  },
]

const SLIDE_INTERVAL_MS = 3000

function JourneyGallery({ slides }: { slides: GallerySlide[] }) {
  const [lightbox, setLightbox] = useState<GallerySlide | null>(null)
  /** 轮播轨道索引；多于一张时在末尾多放一张首图，用于无缝从最后一张继续向右滑入「第一张」 */
  const [trackIndex, setTrackIndex] = useState(0)
  const [skipTrackTransition, setSkipTrackTransition] = useState(false)

  const trackSlides = useMemo(() => {
    if (slides.length <= 1) return slides
    return [...slides, slides[0]]
  }, [slides])

  const trackLen = trackSlides.length

  useEffect(() => {
    if (slides.length <= 1 || lightbox) return
    const id = window.setInterval(() => {
      setTrackIndex((i) => {
        if (slides.length <= 1) return 0
        if (i === slides.length) return i
        if (i < slides.length - 1) return i + 1
        return slides.length
      })
    }, SLIDE_INTERVAL_MS)
    return () => window.clearInterval(id)
  }, [slides.length, lightbox])

  useEffect(() => {
    setTrackIndex(0)
    setSkipTrackTransition(false)
  }, [slides])

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

  const logicalIndex = trackIndex >= slides.length ? 0 : trackIndex
  const current = slides[logicalIndex] ?? slides[0]

  const onGalleryTrackTransitionEnd = (e: TransitionEvent<HTMLDivElement>) => {
    if (e.propertyName !== 'transform') return
    if (slides.length <= 1) return
    if (trackIndex !== slides.length) return
    setSkipTrackTransition(true)
    setTrackIndex(0)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setSkipTrackTransition(false))
    })
  }

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
          <div
            className={styles.journeyImageTrack}
            style={{
              width: `${trackLen * 100}%`,
              transform: `translateX(-${(trackIndex * 100) / trackLen}%)`,
              transition: skipTrackTransition ? 'none' : undefined,
            }}
            onTransitionEnd={onGalleryTrackTransitionEnd}
          >
            {trackSlides.map((s, i) => (
              <div
                key={i === trackSlides.length - 1 && slides.length > 1 ? `${s.src}__loop` : `${s.src}-${i}`}
                className={styles.journeyImageSlide}
                style={{ flex: `0 0 ${100 / trackLen}%` }}
              >
                <img
                  className={styles.journeyImage}
                  src={s.src}
                  alt={s.alt}
                  loading={i === 0 ? 'eager' : 'lazy'}
                  draggable={false}
                />
              </div>
            ))}
          </div>
        </div>
      </button>
      {slides.length > 1 ? (
        <div className={styles.galleryDots} role="tablist" aria-label="配图轮播">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === logicalIndex}
              aria-label={`第 ${i + 1} 张，共 ${slides.length} 张`}
              className={[styles.galleryDot, i === logicalIndex ? styles.galleryDotActive : ''].join(' ')}
              onClick={() => setTrackIndex(i)}
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
                  fetchPriority="high"
                />
                <img
                  className={styles.titleWord}
                  src="/landing/title-studio.png"
                  alt="Studio"
                  width={520}
                  height={120}
                  decoding="async"
                  fetchPriority="high"
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
                <img
                  className={styles.browseBrandImg}
                  src="/landing/title-batik.png"
                  alt=""
                  decoding="async"
                  fetchPriority="high"
                />
                <img
                  className={styles.browseBrandImg}
                  src="/landing/title-studio.png"
                  alt=""
                  decoding="async"
                  fetchPriority="high"
                />
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
                    <p className={styles.journeyDesc}>{c.descZh}</p>
                    <p className={styles.journeyDescEn} lang="en">
                      {c.descEn}
                    </p>
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
