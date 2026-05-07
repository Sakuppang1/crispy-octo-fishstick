import type { Dispatch } from 'react'
import { useEffect, useMemo, useRef } from 'react'
import type { CraftState } from '../types'
import type { Action } from '../state'
import styles from './VatStep.module.css'
import { agentLog } from '../../debug/log'
import { startBubbleSound, type BubbleSoundHandle } from '../audio/bubble'

type MatKey = 'indigo' | 'water' | 'soda' | 'riceWine'

const MATS: Array<{ key: MatKey; name: string; desc: string; icon: string }> = [
  { key: 'indigo', name: '蓝靛泥', desc: '天然靛蓝染料', icon: '器' },
  { key: 'water', name: '清水', desc: '调节染液浓度', icon: '水' },
  { key: 'soda', name: '食用碱', desc: '调节pH值', icon: '碱' },
  { key: 'riceWine', name: '米酒', desc: '助染发酵', icon: '酒' },
]

function allDone(m: CraftState['materials']) {
  return m.indigo && m.water && m.soda && m.riceWine
}

function countSelected(m: CraftState['materials']) {
  return Number(m.indigo) + Number(m.water) + Number(m.soda) + Number(m.riceWine)
}

export function VatStep({ state, dispatch }: { state: CraftState; dispatch: Dispatch<Action> }) {
  const runningRef = useRef(false)
  const lastPctLogRef = useRef<number | null>(null)
  const soundRef = useRef<BubbleSoundHandle | null>(null)

  const done = useMemo(() => allDone(state.materials), [state.materials])
  const selected = countSelected(state.materials)
  const remaining = Math.max(0, 4 - selected)
  const liquidH = useMemo(() => {
    // 空缸从 0 开始，每添加一种材料增加液面高度
    const add =
      (state.materials.indigo ? 18 : 0) +
      (state.materials.water ? 16 : 0) +
      (state.materials.soda ? 14 : 0) +
      (state.materials.riceWine ? 14 : 0)
    return Math.min(72, add)
  }, [state.materials])

  const canStart = done && state.fermentationPct <= 0 && !runningRef.current

  useEffect(() => {
    if (!runningRef.current) return
    if (state.fermentationPct >= 100) {
      runningRef.current = false
      if (soundRef.current) {
        soundRef.current.stop()
        soundRef.current = null
      }
    }
  }, [state.fermentationPct])

  useEffect(() => {
    if (state.fermentationPct === 100) {
      // #region agent log
      agentLog(
        'src/waxcraft/steps/VatStep.tsx:fermentationDone',
        'fermentationPct reached 100; scheduling step->dye',
        { step: state.step, fermentationPct: state.fermentationPct },
        'run1',
        'H4',
      )
      // #endregion agent log
      const id = window.setTimeout(() => dispatch({ type: 'setStep', step: 'dye' }), 450)
      return () => window.clearTimeout(id)
    }
  }, [state.fermentationPct, dispatch])

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.stop()
        soundRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    // #region agent log
    const pct = state.fermentationPct
    const bucket = Math.floor(pct / 10) * 10
    if (pct > 0 && (lastPctLogRef.current === null || bucket !== lastPctLogRef.current)) {
      lastPctLogRef.current = bucket
      agentLog(
        'src/waxcraft/steps/VatStep.tsx:pct',
        'fermentationPct progress bucket',
        { step: state.step, fermentationPct: pct, bucket },
        'run1',
        'H2',
      )
    }
    // #endregion agent log
  }, [state.fermentationPct, state.step])

  const toggleMat = (key: MatKey) => {
    dispatch({ type: 'setMaterial', key, value: true })
  }

  const start = () => {
    // #region agent log
    agentLog(
      'src/waxcraft/steps/VatStep.tsx:start',
      'start fermentation invoked',
      {
        done,
        canStart,
        fermentationPct: state.fermentationPct,
        materials: state.materials,
      },
      'run1',
      'H3',
    )
    // #endregion agent log
    if (!done) return
    if (runningRef.current) return
    runningRef.current = true

    if (!soundRef.current) {
      soundRef.current = startBubbleSound()
    }

    dispatch({ type: 'setFermentationPct', pct: 1 })

    const startAt = performance.now()
    const dur = 6500
    const tick = () => {
      const t = Math.min(1, (performance.now() - startAt) / dur)
      const pct = Math.round(t * 100)
      dispatch({ type: 'setFermentationPct', pct })
      if (t < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }

  const bubbleSeed = useMemo(() => {
    // 保持 DOM 结构稳定：始终渲染固定数量气泡，通过透明度控制显示
    const n = 16
    return Array.from({ length: n }).map((_, i) => ({
      id: i,
      left: (i * 23) % 95,
      delay: (i % 8) * 0.22,
      size: 8 + (i % 4) * 3,
      dur: 2.0 + (i % 5) * 0.35,
    }))
  }, [state.fermentationPct])

  return (
    <div className={styles.layout}>
      <div className={[styles.panel, styles.left].join(' ')}>
        <div>
          <div className={styles.leftTitle}>准备材料</div>
          <div className={styles.leftHint}>将材料拖拽到染缸中，或点击添加</div>
        </div>

        {MATS.map((m) => {
          const active = state.materials[m.key]
          return (
            <div
              key={m.key}
              className={[styles.matItem, active ? styles.matActive : ''].join(' ')}
              onClick={() => toggleMat(m.key)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') toggleMat(m.key)
              }}
            >
              <div className={styles.matIcon}>{m.icon}</div>
              <div className={styles.matText}>
                <div className={styles.matName}>{m.name}</div>
                <div className={styles.matDesc}>{m.desc}</div>
              </div>
              <div className={styles.check}>{active ? '✓' : ''}</div>
            </div>
          )
        })}
      </div>

      <div className={[styles.panel, styles.center].join(' ')}>
        <div className={styles.tank} style={{ ['--liquid-h' as never]: `${liquidH}%` }}>
          <div className={styles.tankTop} />
          <div className={styles.liquid}>
            <div className={styles.wave} />
            <div className={styles.bubbles}>
              {bubbleSeed.map((b) => (
                <div
                  key={b.id}
                  className={styles.bubble}
                  style={{
                    left: `${b.left}%`,
                    bottom: `${10 + (b.id % 4) * 14}px`,
                    width: `${b.size}px`,
                    height: `${b.size}px`,
                    animationDelay: `${b.delay}s`,
                    animationDuration: `${b.dur}s`,
                    opacity: state.fermentationPct > 0 && state.fermentationPct < 100 ? 0.6 : 0,
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className={styles.fermentText} style={{ opacity: state.fermentationPct > 0 ? 1 : 0.7 }}>
          {state.fermentationPct > 0 ? '染缸发酵中....' : `还需添加${remaining}种材料`}
          {state.fermentationPct > 0 ? (
            <div className={styles.progress} style={{ ['--pct' as never]: `${state.fermentationPct}%` }}>
              <div className={styles.progressFill} />
            </div>
          ) : null}
        </div>

        <button className={styles.footerBtn} disabled={!canStart} onClick={start}>
          开始发酵 →
        </button>
      </div>

      <div className={[styles.panel, styles.right].join(' ')}>
        <div className={styles.rightTitle}>传统配方</div>
        <div className={styles.para}>蓝靛泥是天然染料，取自靛蓝植物发酵而成。</div>
        <div className={styles.para}>食用碱调节染液pH值，使染料更好地附着。</div>
        <div className={styles.para}>米酒促进发酵，让靛色更加深沉持久。</div>
        <div className={styles.tip}>
          <div style={{ fontWeight: 900, marginBottom: 6 }}>小贴士</div>
          传统染缸需要养护，每日搅拌并添加适量米酒保持活性。
        </div>
      </div>
    </div>
  )
}

