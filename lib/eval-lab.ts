export const EVAL_LAB_STORAGE_KEY = 'apgc-eval-lab-v1'

export interface EvalScenario {
  id: string
  title: string
  desc: string
  defaultMetrics: [string, string, string]
}

export interface EvalLabState {
  scenarioId: string
  project: string
  metrics: [string, string, string]
  metricTargets: [string, string, string]
  badcases: string
  actions: string
  updatedAt: string
}

export const evalScenarios: EvalScenario[] = [
  {
    id: 'cs',
    title: '智能客服 / 工单助手',
    desc: '关注一次解决率、幻觉引用、人工接管率',
    defaultMetrics: ['一次解决率', '幻觉/错误回答率', '人工接管率'],
  },
  {
    id: 'copilot',
    title: 'Copilot / 写作助手',
    desc: '关注采纳率、编辑距离、任务完成时长',
    defaultMetrics: ['内容采纳率', '平均编辑步数', '任务完成时长'],
  },
  {
    id: 'search',
    title: 'RAG 搜索问答',
    desc: '关注召回准确率、引用正确率、无答案率',
    defaultMetrics: ['Top3 召回准确率', '引用正确率', '拒答/无答案率'],
  },
]

export function buildEvalReport(state: EvalLabState): string {
  const scenario = evalScenarios.find((s) => s.id === state.scenarioId)
  const lines = [
    '【AI 产品 Eval 报告】',
    `项目：${state.project || '未命名'}`,
    `场景：${scenario?.title || state.scenarioId}`,
    '',
    '## 核心指标',
    ...state.metrics.map((m, i) => `- ${m}：目标 ${state.metricTargets[i] || '待定'}`),
    '',
    '## Badcase Top 清单',
    state.badcases || '（待填写）',
    '',
    '## 改进动作',
    state.actions || '（待填写）',
    '',
    '## 下一轮 Eval 计划',
    '- 扩充评测集覆盖边界场景',
    '- 对比迭代前后指标变化',
    '- 更新发布门禁与人机协同策略',
  ]
  return lines.join('\n')
}

export function evalCompletionScore(state: EvalLabState): number {
  let score = 0
  if (state.project.trim()) score += 15
  if (state.metrics.every((m) => m.trim())) score += 20
  if (state.metricTargets.some((t) => t.trim())) score += 15
  if (state.badcases.trim().length > 30) score += 25
  if (state.actions.trim().length > 20) score += 25
  return Math.min(100, score)
}
