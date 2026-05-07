import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './Landing.module.css'

type Card = {
  id: 'dansai' | 'huangping' | 'anshun' | 'zhijin'
  title: string
  tag: string
  desc: string
  icon: 'wave' | 'seed' | 'square' | 'leaf'
}

const CARDS: Card[] = [
  { id: 'dansai', title: '丹寨', tag: '经典蜡染', desc: '典范纹样，几何对称，传统经典感。', icon: 'wave' },
  { id: 'huangping', title: '黄平', tag: '细腻花鸟', desc: '花鸟鱼虫，细腻生动，自然之美。', icon: 'seed' },
  { id: 'anshun', title: '安顺', tag: '粗矿留白', desc: '大胆留白，粗犷豪放，意境深远。', icon: 'square' },
  { id: 'zhijin', title: '织金', tag: '彩色突破', desc: '色彩斑斓，突破传统，创新融合。', icon: 'leaf' },
]

function Icon({ kind }: { kind: Card['icon'] }) {
  const stroke = 'rgba(31, 75, 110, 0.65)'
  const accent = 'rgba(214, 160, 107, 0.8)'
  switch (kind) {
    case 'wave':
      return (
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
          <circle cx="32" cy="32" r="20" stroke="rgba(0,0,0,0.06)" strokeDasharray="2 5" />
          <path d="M18 28c6-6 12 6 18 0s12 6 18 0" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" />
          <path d="M18 36c6-6 12 6 18 0s12 6 18 0" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" opacity="0.75" />
          <path d="M20 22c5-5 10 5 15 0" stroke={accent} strokeWidth="2.2" strokeLinecap="round" opacity="0.85" />
        </svg>
      )
    case 'seed':
      return (
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
          <circle cx="32" cy="32" r="20" stroke="rgba(0,0,0,0.06)" strokeDasharray="2 5" />
          <path d="M32 18c-8 5-10 16-2 22 8-6 10-17 2-22Z" stroke={stroke} strokeWidth="2.5" fill="rgba(31, 75, 110, 0.06)" />
          <path d="M32 18c8 5 10 16 2 22-8-6-10-17-2-22Z" stroke={accent} strokeWidth="2.2" fill="rgba(214, 160, 107, 0.08)" />
        </svg>
      )
    case 'square':
      return (
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
          <circle cx="32" cy="32" r="20" stroke="rgba(0,0,0,0.06)" strokeDasharray="2 5" />
          <rect x="20" y="20" width="24" height="24" stroke={stroke} strokeWidth="2.5" />
          <rect x="26" y="26" width="12" height="12" stroke={accent} strokeWidth="2.2" opacity="0.9" />
        </svg>
      )
    case 'leaf':
      return (
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
          <circle cx="32" cy="32" r="20" stroke="rgba(0,0,0,0.06)" strokeDasharray="2 5" />
          <path d="M22 38c10-18 18-8 20-18 8 10-6 26-20 18Z" stroke={accent} strokeWidth="2.2" fill="rgba(214, 160, 107, 0.08)" />
          <path d="M24 36c10-10 16-2 18-12" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      )
  }
}

export function Landing() {
  const nav = useNavigate()
  const [hoverId, setHoverId] = useState<Card['id'] | null>(null)
  const cards = useMemo(() => CARDS, [])

  return (
    <div className={styles.page}>
      <div className={styles.wrap}>
        <div style={{ textAlign: 'center' }}>
          <h1 className={styles.title}>蜡染 MR</h1>
          <div className={styles.subtitle}>Experiencing Miao Craft</div>
          <div className={styles.underline} />
        </div>

        <div className={styles.cards}>
          {cards.map((c) => (
            <div
              key={c.id}
              className={[
                styles.card,
                hoverId === c.id ? styles.cardActive : '',
              ].join(' ')}
              onMouseEnter={() => setHoverId(c.id)}
              onMouseLeave={() => setHoverId(null)}
              onClick={() => nav(`/craft/${c.id}`)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') nav(`/craft/${c.id}`)
              }}
            >
              <div className={styles.iconBox}>
                <Icon kind={c.icon} />
              </div>
              <div className={styles.cardTitle}>{c.title}</div>
              <div className={styles.tag}>{c.tag}</div>
              <div className={styles.desc}>{c.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

