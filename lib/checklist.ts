export interface ChecklistField {
  id: string
  label: string
  type: 'text' | 'textarea' | 'yesno'
  placeholder?: string
}

export interface ChecklistSection {
  id: string
  title: string
  fields: ChecklistField[]
}

export const CHECKLIST_STORAGE_KEY = 'apgc-checklist-v1'

export const checklistSections: ChecklistSection[] = [
  {
    id: 'meta',
    title: '项目信息',
    fields: [
      { id: 'project', label: '需求/项目名称', type: 'text', placeholder: '例如：标书智能体 V2' },
      { id: 'owner', label: '负责人', type: 'text' },
      { id: 'date', label: '日期', type: 'text', placeholder: '2026-06-01' },
      { id: 'decision', label: '决策结论', type: 'text', placeholder: '做 / 不做 / 延期观察' },
      { id: 'route', label: '架构路线', type: 'text', placeholder: '规则 / ML / RAG / Copilot / Agent' },
    ],
  },
  {
    id: 'veto',
    title: '§0 一票否决',
    fields: [
      { id: 'veto_metric', label: '无明确业务指标', type: 'yesno' },
      { id: 'veto_data', label: '无可用数据或数据不合规', type: 'yesno' },
      { id: 'veto_policy', label: '监管或合同禁止该 AI 用法', type: 'yesno' },
      { id: 'veto_risk', label: '无法承受错误后果', type: 'yesno' },
      { id: 'veto_unit', label: '单位经济算不清', type: 'yesno' },
      { id: 'veto_note', label: '说明（任一“是”需高层审批）', type: 'textarea' },
    ],
  },
  {
    id: 'scene',
    title: '§1 场景与价值',
    fields: [
      { id: 'scene_user', label: '用户是谁？高频还是低频？', type: 'textarea' },
      { id: 'scene_alt', label: '不用 AI 的替代方案与成本', type: 'textarea' },
      { id: 'scene_kpi', label: '成功指标（业务）3 个', type: 'textarea' },
      { id: 'scene_scale', label: '12 个月规模化路径', type: 'textarea' },
    ],
  },
  {
    id: 'tech',
    title: '§2 技术路线',
    fields: [
      { id: 'tech_heavy', label: '为什么不用更重方案', type: 'textarea' },
      { id: 'tech_light', label: '为什么不用更轻方案', type: 'textarea' },
    ],
  },
  {
    id: 'rag',
    title: '§3 RAG（若适用）',
    fields: [
      { id: 'rag_source', label: '知识库来源、更新频率、权限', type: 'textarea' },
      { id: 'rag_recall', label: '检索召回率基线', type: 'text' },
      { id: 'rag_fallback', label: '低置信度/无答案时的兜底', type: 'textarea' },
    ],
  },
  {
    id: 'agent',
    title: '§4 Agent（若适用）',
    fields: [
      { id: 'agent_decompose', label: '任务可分解、可验证、可回滚', type: 'yesno' },
      { id: 'agent_hitl', label: '人工审核点（HITL）已定义', type: 'yesno' },
      { id: 'agent_budget', label: '步数/超时/预算上限', type: 'text' },
      { id: 'agent_degrade', label: '失败降级路径', type: 'textarea' },
    ],
  },
  {
    id: 'eval',
    title: '§5 Eval 与发布门禁',
    fields: [
      { id: 'eval_biz', label: '业务指标 + 目标值', type: 'textarea' },
      { id: 'eval_model', label: '模型指标 + 目标值', type: 'textarea' },
      { id: 'eval_gate', label: '发布门禁（必须全部通过）', type: 'textarea' },
    ],
  },
  {
    id: 'cost',
    title: '§6 成本与风险',
    fields: [
      { id: 'cost_unit', label: '$/请求 或 $/用户月 成本估算', type: 'text' },
      { id: 'cost_risk', label: '隐私/合规/声誉风险与缓解', type: 'textarea' },
    ],
  },
]
