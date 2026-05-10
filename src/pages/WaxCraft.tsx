import { useEffect, useMemo, useReducer } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import styles from './WaxCraft.module.css'
import type { RegionId, StepId } from '../waxcraft/types'
import { createInitialState, reducer } from '../waxcraft/state'
import { DrawStep } from '../waxcraft/steps/DrawStep'
import { VatStep } from '../waxcraft/steps/VatStep'
import { DyeStep } from '../waxcraft/steps/DyeStep'
import { DewaxStep } from '../waxcraft/steps/DewaxStep'
import { FinishStep } from '../waxcraft/steps/FinishStep'
import { agentLog } from '../debug/log'

const TITLE_BATIK = '/landing/title-batik.png'
const TITLE_STUDIO = '/landing/title-studio.png'

const STEPS: Array<{ id: StepId; label: string }> = [
  { id: 'select', label: '选择' },
  { id: 'draw', label: '画蜡' },
  { id: 'vat', label: '起缸' },
  { id: 'dye', label: '染制' },
  { id: 'dewax', label: '脱蜡' },
  { id: 'finish', label: '完成' },
]

function isRegionId(x: string | undefined): x is RegionId {
  return x === 'dansai' || x === 'huangping' || x === 'anshun' || x === 'zhijin'
}

export function WaxCraft() {
  const params = useParams()
  const nav = useNavigate()
  const regionId = isRegionId(params.regionId) ? params.regionId : 'anshun'
  const [state, dispatch] = useReducer(reducer, regionId, createInitialState)

  const stepIndex = useMemo(() => STEPS.findIndex((s) => s.id === state.step), [state.step])

  // #region agent log (step transitions)
  useEffect(() => {
    agentLog(
      'src/pages/WaxCraft.tsx:step',
      'step changed',
      {
        step: state.step,
        regionId: state.regionId,
        paths: state.paths.length,
        fermentationPct: state.fermentationPct,
      },
      'run1',
      'H2',
    )
  }, [state.step, state.regionId, state.paths.length, state.fermentationPct])
  // #endregion agent log (step transitions)

  // 从进入工作流开始计时（用于右侧“时间”显示）
  useEffect(() => {
    const start = performance.now()
    const id = window.setInterval(() => {
      const seconds = Math.max(0, Math.floor((performance.now() - start) / 1000))
      dispatch({ type: 'tick', seconds })
    }, 250)
    return () => window.clearInterval(id)
  }, [])

  const goStep = (step: StepId) => {
    // 按视频的体验：允许点击顶部步骤跳转（相当于导航），但仍保持顺序感
    dispatch({ type: 'setStep', step })
  }

  return (
    <div className={styles.shell}>
      <div className={styles.topbar}>
        <div
          className={styles.brand}
          onClick={() => nav('/')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              nav('/')
            }
          }}
          role="button"
          tabIndex={0}
          aria-label="返回 Batik Studio 首页"
        >
          <span className={styles.brandMark}>
            <img
              className={styles.brandTitleImg}
              src={TITLE_BATIK}
              alt=""
              width={220}
              height={60}
              decoding="async"
              fetchPriority="low"
            />
            <img
              className={styles.brandTitleImg}
              src={TITLE_STUDIO}
              alt=""
              width={260}
              height={60}
              decoding="async"
              fetchPriority="low"
            />
          </span>
        </div>

        <div className={styles.stepper}>
          {STEPS.map((s, idx) => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                className={[styles.step, s.id === state.step ? styles.stepActive : ''].join(' ')}
                onClick={() => goStep(s.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') goStep(s.id)
                }}
                title={s.label}
              >
                <span style={{ opacity: idx <= stepIndex ? 1 : 0.55 }}>{s.label}</span>
              </div>
              {idx !== STEPS.length - 1 ? <div className={styles.divider} /> : null}
            </div>
          ))}
        </div>

        <div className={styles.topActions}>
          <button className={styles.homeBtn} onClick={() => nav('/')}>
            返回首页
          </button>
        </div>
      </div>

      <div className={styles.content}>
        {/* Debug: 暂时移除 framer-motion 过渡，避免 commit 卸载阶段触发 removeChild NotFoundError */}
        <div style={{ height: '100%' }}>
          {state.step === 'draw' ? <DrawStep state={state} dispatch={dispatch} /> : null}
          {state.step === 'vat' ? <VatStep state={state} dispatch={dispatch} /> : null}
          {state.step === 'dye' ? <DyeStep state={state} dispatch={dispatch} /> : null}
          {state.step === 'dewax' ? <DewaxStep state={state} dispatch={dispatch} /> : null}
          {state.step === 'finish' ? <FinishStep state={state} dispatch={dispatch} /> : null}
          {state.step === 'select' ? (
            <div className={styles.selectGate}>
              <div className={styles.selectInner}>
                <div className={styles.selectBrand} aria-hidden>
                  <img className={styles.selectBrandImg} src={TITLE_BATIK} alt="" decoding="async" />
                  <img className={styles.selectBrandImg} src={TITLE_STUDIO} alt="" decoding="async" />
                </div>
                <div className={styles.selectRegionTitle}>已选择地区：{regionId}</div>
                <button
                  onClick={() => goStep('draw')}
                  style={{
                    border: 'none',
                    borderRadius: 12,
                    padding: '10px 14px',
                    background: 'rgba(255,255,255,0.75)',
                    boxShadow: 'var(--shadow-md)',
                    cursor: 'pointer',
                  }}
                >
                  进入画蜡
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

