import type { OptionKey } from './questions'

export type Dimension = 'D1' | 'D2' | 'D3' | 'D4' | 'D5' | 'D6'
export type Stage = '探索期' | '进阶期' | '领导者期' | '决策者期'
export type CampMatch = '高' | '中' | '低'
export type WeekStatus = 'focus' | 'active' | 'review' | 'skim'

const scoreMap: Record<string, Record<OptionKey, number>> = {
  Q4: { A: 0, B: 2, C: 3, D: 1 },
  Q5: { A: 1, B: 3, C: 1, D: 0 },
  Q6: { A: 0, B: 3, C: 1, D: 1 },
  Q7: { A: 0, B: 3, C: 0, D: 1 },
  Q8: { A: 1, B: 3, C: 0, D: 0 },
  Q9: { A: 1, B: 3, C: 1, D: 0 },
  Q10: { A: 0, B: 3, C: 0, D: 1 },
  Q11: { A: 1, B: 3, C: 0, D: 0 },
  Q12: { A: 1, B: 3, C: 0, D: 2 },
  Q13: { A: 1, B: 3, C: 0, D: 1 },
  Q14: { A: 0, B: 3, C: 1, D: 0 },
  Q15: { A: 1, B: 3, C: 1, D: 0 },
  Q16: { A: 1, B: 3, C: 0, D: 2 },
  Q17: { A: 1, B: 3, C: 2, D: 0 },
  Q18: { A: 0, B: 3, C: 1, D: 0 },
}

const dimensionQuestions: Record<Dimension, string[]> = {
  D1: ['Q4', 'Q5', 'Q6'],
  D2: ['Q7', 'Q8', 'Q9'],
  D3: ['Q10', 'Q11', 'Q12'],
  D4: ['Q13', 'Q14'],
  D5: ['Q15', 'Q16'],
  D6: ['Q17', 'Q18'],
}

const dimToStartWeek: Record<Dimension, number> = {
  D6: 1,
  D2: 2,
  D1: 4,
  D3: 7,
  D5: 9,
  D4: 10,
}

const dimLabels: Record<Dimension, string> = {
  D1: 'AI 技术判断',
  D2: '场景与需求',
  D3: '交付与规模化',
  D4: '数据与护城河',
  D5: '协作与影响',
  D6: '学习节奏',
}

const weakTips: Record<Dimension, string> = {
  D1: '在 RAG/Agent/评测/成本上易跟热点。建议：每个 AI 需求先过决策清单 §2～§6。',
  D2: '业务指标与「不用 AI」的替代方案常不清晰。建议：立项前写清 3 个业务指标。',
  D3: '从试点到规模缺少阶段门。建议：补 SLA、成本、ToB 交付检查表。',
  D4: '数据飞轮与工作流嵌入较弱。建议：设计用户纠错→迭代闭环。',
  D5: '跨部门推动偏依赖个人。建议：用对方 KPI + 试点数据讲故事。',
  D6: '学习碎片化。建议：固定每周 5h，且每周 1 个模板产出。',
}

export interface AssessmentAnswers {
  [questionId: string]: OptionKey
}

export interface AssessmentResult {
  scores: Record<Dimension, number>
  stage: Stage
  startWeek: number
  focusWeeks: number[]
  weekStatuses: Record<number, WeekStatus>
  weakest: [Dimension, Dimension]
  strongest: Dimension
  campMatch: CampMatch
  profileSentence: string
  weeklyAction: string
}

function scoreDimension(answers: AssessmentAnswers, dim: Dimension): number {
  const qs = dimensionQuestions[dim]
  let sum = 0
  let max = 0
  for (const q of qs) {
    const key = answers[q]
    const s = key ? (scoreMap[q][key] ?? 0) : 0
    sum += s
    max += 3
  }
  return max ? Math.round((sum / max) * 100) : 0
}

function getStage(answers: AssessmentAnswers): Stage {
  const q1 = answers.Q1
  const q2 = answers.Q2
  const q3 = answers.Q3
  if (q3 === 'D') return '决策者期'
  if (q2 === 'A' || (q1 === 'A' && q3 === 'A')) return '探索期'
  if (q2 === 'C' || q2 === 'D' || q1 === 'C' || q1 === 'D') {
    if (q3 === 'C') return '领导者期'
  }
  if ((q2 === 'B' || q2 === 'C') && (q3 === 'A' || q3 === 'B')) return '进阶期'
  return '进阶期'
}

function getWeakestDims(scores: Record<Dimension, number>): [Dimension, Dimension] {
  const sorted = (Object.keys(scores) as Dimension[]).sort((a, b) => scores[a] - scores[b])
  return [sorted[0], sorted[1]]
}

function buildFocusWeeks(d1: Dimension, d2: Dimension): number[] {
  const w1 = dimToStartWeek[d1]
  const w2 = dimToStartWeek[d2]
  const weeks = new Set<number>()
  for (const w of [w1, w2]) {
    for (let i = w - 1; i <= w + 1; i++) {
      if (i >= 1 && i <= 12) weeks.add(i)
    }
  }
  return [...weeks].sort((a, b) => a - b)
}

function getCampMatch(stage: Stage, answers: AssessmentAnswers, scores: Record<Dimension, number>): CampMatch {
  const q2 = answers.Q2
  const q3 = answers.Q3
  if (q2 === 'A' && q3 === 'A') return '低'
  if (q3 === 'D') return '低'
  const midCount = (Object.values(scores) as number[]).filter((s) => s >= 40 && s <= 75).length
  if (stage === '进阶期' && (q2 === 'B' || q2 === 'C') && midCount >= 2) return '高'
  if (stage === '探索期' && q3 === 'B') return '中'
  if (stage === '领导者期' && (q3 === 'B' || q3 === 'C')) return '中'
  return '中'
}

const weekActions: Record<number, string> = {
  1: '填自评并锁定每周 5 小时学习块',
  2: '写清 1 个功能的 3 个业务指标与不做 AI 的替代方案',
  3: '写定位陈述 + 竞品备忘录 1 页',
  4: '用决策清单过 1 个在研需求',
  5: '画 Agent 架构 + 失败降级路径',
  6: '定金标数量与发布门槛',
  7: '列 POC→试点→规模 三阶段门槛',
  8: '建 $/请求 模型并列 1 项降本措施',
  9: '推动 1 次按新规则的 AI 需求评审',
  10: '画用户纠错→数据→迭代闭环',
  11: '完成 1 场战役叙事初稿',
  12: '复测（可选）+ 写下季度 2 个能力重点',
}

export function computeAssessment(answers: AssessmentAnswers): AssessmentResult {
  const scores = {
    D1: scoreDimension(answers, 'D1'),
    D2: scoreDimension(answers, 'D2'),
    D3: scoreDimension(answers, 'D3'),
    D4: scoreDimension(answers, 'D4'),
    D5: scoreDimension(answers, 'D5'),
    D6: scoreDimension(answers, 'D6'),
  }

  const stage = getStage(answers)
  const weakest = getWeakestDims(scores)
  let startWeek = Math.min(dimToStartWeek[weakest[0]], dimToStartWeek[weakest[1]])

  if (stage === '探索期') startWeek = 1
  if (stage === '领导者期') startWeek = Math.max(startWeek, 7)

  const focusWeeks = buildFocusWeeks(weakest[0], weakest[1])
  const strongest = (Object.keys(scores) as Dimension[]).reduce((a, b) =>
    scores[a] >= scores[b] ? a : b,
  )

  const skimDims = (Object.keys(scores) as Dimension[]).filter(
    (d) => scores[d] >= 75 && d !== weakest[0] && d !== weakest[1],
  )

  const weekStatuses: Record<number, WeekStatus> = {}
  for (let w = 1; w <= 12; w++) {
    if (focusWeeks.includes(w)) weekStatuses[w] = 'focus'
    else if (skimDims.some((d) => dimToStartWeek[d] === w)) weekStatuses[w] = 'skim'
    else if (w < startWeek) weekStatuses[w] = 'review'
    else weekStatuses[w] = 'active'
  }

  const campMatch = getCampMatch(stage, answers, scores)
  const profileSentence = `你是${stage}的学习者，${dimLabels[strongest]}较强，建议优先补${dimLabels[weakest[0]]}与${dimLabels[weakest[1]]}。`

  return {
    scores,
    stage,
    startWeek,
    focusWeeks,
    weekStatuses,
    weakest,
    strongest,
    campMatch,
    profileSentence,
    weeklyAction: weekActions[startWeek] ?? weekActions[4],
  }
}

export { dimLabels, weakTips, weekActions }
