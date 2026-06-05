export const SHOWCASE_STORAGE_KEY = 'apgc-showcase-pitch-v1'

export interface ShowcaseRubricItem {
  id: string
  label: string
  hint: string
  weight: number
}

export const showcaseRubric: ShowcaseRubricItem[] = [
  { id: 'hook', label: '开场 30s 钩子', hint: '痛点 + 为什么现在做', weight: 15 },
  { id: 'demo', label: '3 分钟 Demo', hint: '完整路径演示，非 PPT 念稿', weight: 30 },
  { id: 'metrics', label: '指标与结果', hint: '至少 1 个可量化 KPI', weight: 20 },
  { id: 'tradeoff', label: '技术取舍', hint: '为什么选 RAG/Agent/模型 X', weight: 15 },
  { id: 'next', label: '下一步计划', hint: '迭代点、风险、资源需求', weight: 10 },
  { id: 'qa', label: 'Q&A 准备', hint: '3 个高频追问与回答', weight: 10 },
]

export const showcaseAgenda = [
  '0:00-0:30  痛点与场景（谁在用、解决什么）',
  '0:30-3:30  现场 Demo（成功路径 + 1 个失败兜底）',
  '3:30-4:30  指标、Eval 结论、go/no-go',
  '4:30-5:00  下一步与求助点',
]

export const showcaseVideoChecklist = [
  '画面含产品界面（非纯 PPT）',
  '麦克风清晰，背景噪音可控',
  'Demo 失败时有兜底话术',
  '总时长 4～6 分钟',
]

export const showcaseSampleVideoUrl = 'https://www.bilibili.com/video/BV1example'

export function computeShowcaseScore(checklist: Record<string, boolean>): number {
  let score = 0
  for (const item of showcaseRubric) {
    if (checklist[item.id]) score += item.weight
  }
  return score
}
