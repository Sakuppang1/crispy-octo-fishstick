export type RegionId = 'dansai' | 'huangping' | 'anshun' | 'zhijin'

export type StepId = 'select' | 'draw' | 'vat' | 'dye' | 'dewax' | 'finish'

export type ToolId = 'centerKnife' | 'variantKnife'

export type StampKind =
  | 'flower1'
  | 'flower2'
  | 'flower3'
  | 'butterfly'
  | 'spiral'
  | 'leaf'
  | 'wave'
  | 'square'
  | 'diamond'
  | 'star'
  | 'sun'
  | 'dotRing'
  | 'cross'
  | 'grid'
  | 'petal'
  | 'cloud'
  | 'fish'
  | 'bird'
  | 'vine'
  | 'paisley'
  | 'moon'

export type Stats = {
  strokes: number
  lengthCm: number
  seconds: number
}

/** 仅画蜡步骤显示：用户上传的描摹底图（后续环节不渲染） */
export type TraceUnderlay = {
  dataUrl: string
  /** 相对画布中心的像素偏移 */
  offsetX: number
  offsetY: number
  /** 相对「适配画布后的基准尺寸」的缩放 */
  scale: number
  opacity: number
}

export type CraftState = {
  regionId: RegionId
  step: StepId
  tool: ToolId
  paths: Array<{ points: Array<{ x: number; y: number }>; width: number }>
  stamps: Array<{ x: number; y: number; size: number; kind: StampKind }>
  stats: Stats
  materials: {
    indigo: boolean
    water: boolean
    soda: boolean
    riceWine: boolean
  }
  fermentationPct: number
  dyePct: number
  dyeRounds: number
  dewaxPct: number
  finished: boolean
  aiEnhance: boolean
  showIceCrack: boolean
  traceUnderlay: TraceUnderlay | null
}

