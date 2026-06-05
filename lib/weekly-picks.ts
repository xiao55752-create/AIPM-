export interface WeeklyPick {
  id: string
  title: string
  summary: string
  tag: string
  href: string
  type: 'article' | 'tool' | 'trend'
}

/** 按 ISO 周轮换的「本周热点」运营位（可后续改为 CMS） */
const weeklyPickPool: WeeklyPick[][] = [
  [
    {
      id: 'w1-a',
      title: 'Agent 工作流：从 Demo 到可运维',
      summary: '关注记忆、工具调用失败兜底与成本监控，避免「能跑不能管」。',
      tag: 'Agent',
      href: '/resources/ai-topics',
      type: 'trend',
    },
    {
      id: 'w1-b',
      title: 'RAG 评测：先定义「无答案」再谈准确率',
      summary: '竞品普遍强调 Eval；本周优先补齐拒答策略与引用校验。',
      tag: 'Eval',
      href: '/tools/eval-lab',
      type: 'tool',
    },
    {
      id: 'w1-c',
      title: '项目 Lab：RAG 知识库试点',
      summary: '对标慕课/MSUP 项目实战，用 5～7 天产出可写进简历的交付物。',
      tag: '实战',
      href: '/tools/project-lab',
      type: 'tool',
    },
  ],
  [
    {
      id: 'w2-a',
      title: 'AI 功能 MVP：本周只验证一个场景',
      summary: '零代码工具足够做 first demo；关键是指标与边界。',
      tag: 'MVP',
      href: '/tools/project-lab',
      type: 'tool',
    },
    {
      id: 'w2-b',
      title: '多模态产品：先画清楚输入输出契约',
      summary: '图像/语音类需求优先定义失败体验与延迟预算。',
      tag: '多模态',
      href: '/resources?tag=D2',
      type: 'article',
    },
    {
      id: 'w2-c',
      title: 'Responsible AI：上线前的 3 条门禁',
      summary: '隐私、偏见、可解释性——面试与评审高频题。',
      tag: '合规',
      href: '/tools/checklist',
      type: 'article',
    },
  ],
]

export function getCurrentWeeklyPicks(): WeeklyPick[] {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 1)
  const week = Math.floor((now.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000))
  return weeklyPickPool[week % weeklyPickPool.length]!
}

export function getWeeklyPickLabel(): string {
  const now = new Date()
  const onejan = new Date(now.getFullYear(), 0, 1)
  const week = Math.ceil(((now.getTime() - onejan.getTime()) / 86400000 + onejan.getDay() + 1) / 7)
  return `第 ${week} 周`
}
