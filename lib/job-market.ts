import type { AssessmentResult, Dimension, Stage } from './scoring'
import { dimLabels } from './scoring'

export type RoleLevel = 'ai-pm' | 'ai-director'

export interface JobRequirement {
  id: string
  role: RoleLevel | 'both'
  title: string
  summary: string
  dimensions: Dimension[]
  actionLabel: string
  actionTo: string
}

export const roleProfiles: Record<
  RoleLevel,
  { title: string; experience: string; highlights: string[] }
> = {
  'ai-pm': {
    title: 'AI 产品经理',
    experience: '常见 3-8 年产品经验，强调模型落地与协作',
    highlights: ['模型选型', 'RAG/Agent', 'Eval', '业务指标', '合规意识'],
  },
  'ai-director': {
    title: 'AI 产品总监',
    experience: '常见 8-12 年+，强调战略、组织与商业化结果',
    highlights: ['路线图与产品组合', '平台化与规模化', '团队管理', '数据治理', '成本与ROI'],
  },
}

export const jobRequirements: JobRequirement[] = [
  {
    id: 'model-selection',
    role: 'both',
    title: '模型选型与 Prompt 能力',
    summary: '能判断场景该用什么模型与路线，而不是泛泛谈 AI。',
    dimensions: ['D1'],
    actionLabel: 'W4 决策清单',
    actionTo: '/tools/checklist',
  },
  {
    id: 'rag-agent-design',
    role: 'both',
    title: 'RAG / Agent 方案设计',
    summary: '能够设计检索增强、智能体流程与权限边界。',
    dimensions: ['D1', 'D3'],
    actionLabel: 'W4-W7 路径',
    actionTo: '/path',
  },
  {
    id: 'eval-loop',
    role: 'both',
    title: 'Eval 与闭环优化',
    summary: '具备准确率/召回率/采纳率等评测体系与坏例闭环思维。',
    dimensions: ['D1', 'D3'],
    actionLabel: 'W6 Eval 周',
    actionTo: '/path',
  },
  {
    id: 'business-landing',
    role: 'both',
    title: '业务场景落地',
    summary: '能把 AI 方案嵌入业务流程并给出可量化指标。',
    dimensions: ['D2'],
    actionLabel: 'W2 指标周',
    actionTo: '/path',
  },
  {
    id: 'collaboration',
    role: 'both',
    title: '跨团队协作与技术沟通',
    summary: '可与算法/研发有效对齐成本、风险与可行性。',
    dimensions: ['D5'],
    actionLabel: 'W9 协作周',
    actionTo: '/path',
  },
  {
    id: 'compliance',
    role: 'both',
    title: '合规与风险控制',
    summary: '理解数据隐私、内容标注、AI 风险边界等准入要求。',
    dimensions: ['D1', 'D3'],
    actionLabel: '决策清单 §风险',
    actionTo: '/tools/checklist',
  },
  {
    id: 'strategy',
    role: 'ai-director',
    title: '中长期战略与路线图',
    summary: '能规划 12-24 个月 AI 产品组合，并与商业目标对齐。',
    dimensions: ['D2', 'D5'],
    actionLabel: '案例库与路径',
    actionTo: '/founder/cases',
  },
  {
    id: 'scale-delivery',
    role: 'ai-director',
    title: '规模化交付能力',
    summary: '具备从 PoC 到规模化的阶段门与组织推进能力。',
    dimensions: ['D3', 'D5'],
    actionLabel: 'W7-W9 路径',
    actionTo: '/path',
  },
  {
    id: 'data-governance',
    role: 'ai-director',
    title: '数据治理与护城河',
    summary: '构建数据闭环、评估机制与长期护城河。',
    dimensions: ['D4', 'D3'],
    actionLabel: 'W10 数据周',
    actionTo: '/path',
  },
]

export interface JobFitItem {
  requirement: JobRequirement
  score: number
  status: 'strong' | 'neutral' | 'gap'
  suggestion: string
}

export interface JobFitReport {
  role: RoleLevel
  overallPct: number
  matchedStage: string
  topGaps: JobFitItem[]
  items: JobFitItem[]
}

function reqsForRole(role: RoleLevel) {
  return jobRequirements.filter((item) => item.role === 'both' || item.role === role)
}

function reqScore(req: JobRequirement, scores: Record<Dimension, number>) {
  const values = req.dimensions.map((dim) => scores[dim])
  return Math.round(values.reduce((sum, n) => sum + n, 0) / values.length)
}

function reqStatus(score: number): 'strong' | 'neutral' | 'gap' {
  if (score >= 70) return 'strong'
  if (score < 50) return 'gap'
  return 'neutral'
}

function stageText(stage: Stage) {
  const map: Record<Stage, string> = {
    探索期: '更匹配 AI PM 入门/转岗岗',
    进阶期: '更匹配 AI PM / 高级 PM 岗',
    领导者期: '可对标 AI 产品负责人/总监岗',
    决策者期: '偏战略岗，建议强化战役叙事',
  }
  return map[stage]
}

export function computeJobFit(result: AssessmentResult, role: RoleLevel): JobFitReport {
  const reqs = reqsForRole(role)
  const items = reqs.map((requirement) => {
    const score = reqScore(requirement, result.scores)
    const status = reqStatus(score)
    const weakestDim = requirement.dimensions.reduce((a, b) =>
      result.scores[a] <= result.scores[b] ? a : b,
    )
    const suggestion =
      status === 'strong'
        ? `该项已达标，建议用量化案例突出 ${dimLabels[weakestDim]}。`
        : `优先补 ${dimLabels[weakestDim]}，建议执行：${requirement.actionLabel}。`

    return { requirement, score, status, suggestion }
  })

  const overallPct = Math.round(items.reduce((sum, item) => sum + item.score, 0) / items.length)
  const topGaps = items
    .filter((item) => item.status === 'gap')
    .sort((a, b) => a.score - b.score)
    .slice(0, 3)

  return {
    role,
    overallPct,
    matchedStage: stageText(result.stage),
    topGaps,
    items,
  }
}
