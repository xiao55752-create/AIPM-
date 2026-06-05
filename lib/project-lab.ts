export const PROJECT_LAB_STORAGE_KEY = 'apgc-project-lab-v1'

export interface ProjectDeliverableField {
  id: string
  label: string
  hint: string
}

export interface ProjectRubricItem {
  criterion: string
  weight: number
}

export interface ProjectLabTemplate {
  id: string
  title: string
  subtitle: string
  duration: string
  resumeLine: string
  outcomes: string[]
  deliverables: ProjectDeliverableField[]
  rubric: ProjectRubricItem[]
}

export interface ProjectLabProgress {
  projectId: string
  fields: Record<string, string>
  checklist: Record<string, boolean>
  reviewScore?: number
  updatedAt: string
}

export const projectLabTemplates: ProjectLabTemplate[] = [
  {
    id: 'mvp',
    title: 'AI 功能 MVP',
    subtitle: '零代码 / 低代码快速验证一个可演示场景',
    duration: '3～5 天',
    resumeLine: '从 0 搭建 AI 功能 MVP，完成场景验证与指标定义',
    outcomes: ['PRD 一页纸', 'MVP 演示说明', '首版指标口径'],
    deliverables: [
      { id: 'scene', label: '目标用户与场景', hint: '谁在用、解决什么痛点、成功标准是什么' },
      { id: 'mvp_scope', label: 'MVP 范围边界', hint: '本期做什么 / 不做什么，避免 scope creep' },
      { id: 'prd', label: 'PRD 核心段落', hint: '背景、方案、交互流程、异常与降级' },
      { id: 'metrics', label: '3 个核心指标', hint: '如采纳率、任务完成率、人工兜底率' },
      { id: 'demo', label: '演示脚本（3 分钟）', hint: '开场痛点 → 演示路径 → 结果与下一步' },
    ],
    rubric: [
      { criterion: '场景清晰且可量化', weight: 25 },
      { criterion: 'MVP 范围可控', weight: 25 },
      { criterion: '指标与业务结果挂钩', weight: 25 },
      { criterion: '演示可复述、可面试', weight: 25 },
    ],
  },
  {
    id: 'rag',
    title: 'RAG 知识库试点',
    subtitle: '围绕真实业务文档构建检索增强问答',
    duration: '5～7 天',
    resumeLine: '主导 RAG 知识库试点，完成数据治理、检索策略与质量评测',
    outcomes: ['知识切片策略', '检索链路说明', 'Eval 初版报告'],
    deliverables: [
      { id: 'corpus', label: '语料范围与质量', hint: '来源、更新频率、敏感信息处理' },
      { id: 'chunk', label: '切片与索引策略', hint: 'chunk 大小、元数据、召回策略' },
      { id: 'prompt', label: 'Prompt / 引用规范', hint: '如何约束幻觉、如何展示引用' },
      { id: 'eval_set', label: '评测集（≥10 条）', hint: '覆盖高频问、边界问、对抗问' },
      { id: 'result', label: '试点结论与迭代计划', hint: '是否扩面、下一版优化点' },
    ],
    rubric: [
      { criterion: '语料治理完整', weight: 20 },
      { criterion: '检索策略可解释', weight: 25 },
      { criterion: '评测集覆盖关键场景', weight: 30 },
      { criterion: '结论可支撑 go/no-go', weight: 25 },
    ],
  },
  {
    id: 'eval-cycle',
    title: 'Eval 一轮迭代',
    subtitle: '建立 AI 产品质量闭环：指标 → Badcase → 改进',
    duration: '4～6 天',
    resumeLine: '搭建 AI 评测闭环，推动一轮可量化质量迭代',
    outcomes: ['Eval 框架', 'Badcase 清单', '迭代复盘'],
    deliverables: [
      { id: 'framework', label: 'Eval 框架（3 层）', hint: '离线集 / 在线监控 / 人工抽检' },
      { id: 'metrics', label: '质量指标定义', hint: '准确率、幻觉率、采纳率等' },
      { id: 'badcases', label: 'Badcase Top5', hint: '分类、根因、优先级' },
      { id: 'fix', label: '改进动作与负责人', hint: 'Prompt / 数据 / 流程 / 模型' },
      { id: 'review', label: '迭代前后对比', hint: '指标变化 + 剩余风险' },
    ],
    rubric: [
      { criterion: '指标可测量', weight: 25 },
      { criterion: 'Badcase 分析到位', weight: 25 },
      { criterion: '改进动作可执行', weight: 25 },
      { criterion: '复盘可写入简历', weight: 25 },
    ],
  },
]

export function computeProjectScore(
  template: ProjectLabTemplate,
  checklist: Record<string, boolean>,
): number {
  const done = template.deliverables.filter((d) => checklist[d.id]).length
  const completion = template.deliverables.length
    ? Math.round((done / template.deliverables.length) * 70)
    : 0
  const filled = template.deliverables.filter((d) => (checklist[d.id] ? true : false)).length
  return Math.min(100, completion + (filled > 0 ? 10 : 0))
}

export function getProjectLabTemplate(id: string) {
  return projectLabTemplates.find((p) => p.id === id)
}
