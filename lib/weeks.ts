export interface WeekPlan {
  week: number
  title: string
  dimension: string
  deliverable: string
  caseSlug?: string
  tool?: string
}

export const weeks: WeekPlan[] = [
  { week: 1, title: '学习节奏与自评', dimension: 'D6', deliverable: '能力自评 + 每周 5h 学习块' },
  {
    week: 2,
    title: '场景、指标与要不要做 AI',
    dimension: 'D2',
    deliverable: '3 个业务指标 + 替代方案',
    caseSlug: 'school-enterprise',
  },
  {
    week: 3,
    title: '竞品与定位',
    dimension: 'D2',
    deliverable: '定位一句 + 差异化 3 条',
    caseSlug: 'smart-investment',
  },
  {
    week: 4,
    title: 'RAG 与技术判断入门',
    dimension: 'D1',
    deliverable: '决策清单 v1（§1-4）',
    caseSlug: 'bid-agent',
    tool: 'checklist',
  },
  {
    week: 5,
    title: 'Agent 与边界',
    dimension: 'D1',
    deliverable: '决策清单 §Agent + 风险表',
    caseSlug: 'bid-agent',
    tool: 'checklist',
  },
  {
    week: 6,
    title: 'Eval 与发布门禁',
    dimension: 'D1',
    deliverable: 'Eval 表 + 发布门禁 1 页',
    caseSlug: 'bid-agent',
  },
  {
    week: 7,
    title: '规模化 Stage-Gate',
    dimension: 'D3',
    deliverable: '三阶段门槛检查表',
    caseSlug: 'smart-investment',
  },
  { week: 8, title: 'AI 成本与单位经济', dimension: 'D3', deliverable: '成本看板 v1' },
  { week: 9, title: '协作与评审机制', dimension: 'D5', deliverable: '改 1 条 AI 需求评审规则' },
  {
    week: 10,
    title: '数据飞轮与护城河',
    dimension: 'D4',
    deliverable: '飞轮图 + 护城河 3 句',
    caseSlug: 'school-enterprise',
  },
  { week: 11, title: '战役叙事与成果表达', dimension: 'D5', deliverable: '战役叙事 1 篇' },
  { week: 12, title: '复盘与下季度计划', dimension: 'D6', deliverable: '复盘 + 下季 2 个能力重点' },
]

export const weekStatusLabels = {
  focus: '本周重点',
  active: '建议跟跑',
  review: '可选复习',
  skim: '浏览即可',
} as const
