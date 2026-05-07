import type { CraftState, RegionId, StampKind, StepId, ToolId } from './types'

export type Action =
  | { type: 'setRegion'; regionId: RegionId }
  | { type: 'setStep'; step: StepId }
  | { type: 'setTool'; tool: ToolId }
  | { type: 'addPath'; points: Array<{ x: number; y: number }>; width: number; lengthCm: number }
  | { type: 'addStamp'; x: number; y: number; size: number; kind: StampKind }
  | { type: 'eraseAt'; x: number; y: number; radius: number }
  | { type: 'tick'; seconds: number }
  | { type: 'setMaterial'; key: 'indigo' | 'water' | 'soda' | 'riceWine'; value: boolean }
  | { type: 'setFermentationPct'; pct: number }
  | { type: 'setDyePct'; pct: number }
  | { type: 'setDyeRounds'; rounds: number }
  | { type: 'setDewaxPct'; pct: number }
  | { type: 'setAiEnhance'; value: boolean }
  | { type: 'setShowIceCrack'; value: boolean }
  | { type: 'setFinished'; value: boolean }

export function createInitialState(regionId: RegionId): CraftState {
  return {
    regionId,
    step: 'draw',
    tool: 'centerKnife',
    paths: [],
    stamps: [],
    stats: { strokes: 0, lengthCm: 0, seconds: 0 },
    // 起缸：初始为空缸，需要手动逐个添加材料
    materials: { indigo: false, water: false, soda: false, riceWine: false },
    fermentationPct: 0,
    dyePct: 0,
    dyeRounds: 0,
    dewaxPct: 0,
    finished: false,
    aiEnhance: false,
    showIceCrack: true,
  }
}

export function reducer(state: CraftState, action: Action): CraftState {
  switch (action.type) {
    case 'setRegion':
      return { ...state, regionId: action.regionId }
    case 'setStep':
      return { ...state, step: action.step }
    case 'setTool':
      return { ...state, tool: action.tool }
    case 'addPath':
      return {
        ...state,
        paths: [...state.paths, { points: action.points, width: action.width }],
        stats: {
          ...state.stats,
          strokes: state.stats.strokes + 1,
          lengthCm: Math.round((state.stats.lengthCm + action.lengthCm) * 10) / 10,
        },
      }
    case 'addStamp':
      return {
        ...state,
        stamps: [...state.stamps, { x: action.x, y: action.y, size: action.size, kind: action.kind }],
        stats: { ...state.stats, strokes: state.stats.strokes + 1 },
      }
    case 'eraseAt': {
      const r = Math.max(6, action.radius)
      const r2 = r * r
      const hitPoint = (p: { x: number; y: number }) => {
        const dx = p.x - action.x
        const dy = p.y - action.y
        return dx * dx + dy * dy <= r2
      }

      const nextPaths = state.paths.filter((path) => !path.points.some(hitPoint))
      const nextStamps = state.stamps.filter((s) => {
        const dx = s.x - action.x
        const dy = s.y - action.y
        const rr = r + s.size * 0.18
        return dx * dx + dy * dy > rr * rr
      })

      if (nextPaths.length === state.paths.length && nextStamps.length === state.stamps.length) return state
      return { ...state, paths: nextPaths, stamps: nextStamps }
    }
    case 'tick':
      return { ...state, stats: { ...state.stats, seconds: action.seconds } }
    case 'setMaterial':
      return { ...state, materials: { ...state.materials, [action.key]: action.value } }
    case 'setFermentationPct':
      return { ...state, fermentationPct: action.pct }
    case 'setDyePct':
      return { ...state, dyePct: action.pct }
    case 'setDyeRounds':
      return { ...state, dyeRounds: action.rounds }
    case 'setDewaxPct':
      return { ...state, dewaxPct: action.pct }
    case 'setAiEnhance':
      return { ...state, aiEnhance: action.value }
    case 'setShowIceCrack':
      return { ...state, showIceCrack: action.value }
    case 'setFinished':
      return { ...state, finished: action.value }
    default:
      return state
  }
}

