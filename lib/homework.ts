export const HOMEWORK_STORAGE_KEY = 'apgc-homework-submissions-v1'
export const HOMEWORK_DB_FILE = 'homework-db.json'
export const HOMEWORK_SLA_HOURS = 48

export type HomeworkType = 'project-lab' | 'eval-lab' | 'checklist' | 'weekly-review'
export type HomeworkStatus = 'auto_reviewed' | 'pending_human' | 'human_reviewed'
export type NotifyChannel = 'wechat' | 'email' | 'unknown'

export interface HomeworkRecord {
  id: string
  type: HomeworkType
  title: string
  content: string
  autoFeedback: string
  humanFeedback?: string
  status: HomeworkStatus
  contact: string
  notifyChannel: NotifyChannel
  source: string
  requestHumanReview: boolean
  slaDueAt?: string
  reviewedAt?: string
  feedbackReadAt?: string
  createdAt: string
}

/** @deprecated 客户端本地缓存结构 */
export interface HomeworkSubmission {
  id: string
  type: HomeworkType
  title: string
  content: string
  feedback: string
  humanFeedback?: string
  status: HomeworkStatus
  slaDueAt?: string
  notifyChannel?: NotifyChannel
  feedbackReadAt?: string
  createdAt: string
}

export const homeworkTypeLabels: Record<HomeworkType, string> = {
  'project-lab': '项目 Lab 交付物',
  'eval-lab': 'Eval 报告',
  checklist: '决策清单 / 求职包',
  'weekly-review': '周复盘',
}

export const homeworkStatusLabels: Record<HomeworkStatus, string> = {
  auto_reviewed: '模板反馈',
  pending_human: '待真人批改',
  human_reviewed: '已真人批改',
}

export function homeworkDefaultTitle(type: HomeworkType) {
  const map: Record<HomeworkType, string> = {
    'project-lab': '项目 Lab 作业',
    'eval-lab': 'Eval 作业',
    checklist: '清单作业',
    'weekly-review': '周复盘',
  }
  return map[type]
}

export function computeSlaDueAt(fromIso: string) {
  return new Date(new Date(fromIso).getTime() + HOMEWORK_SLA_HOURS * 60 * 60 * 1000).toISOString()
}

export function slaRemainingMs(slaDueAt?: string) {
  if (!slaDueAt) return null
  return new Date(slaDueAt).getTime() - Date.now()
}

export function formatSlaCountdown(slaDueAt?: string) {
  const ms = slaRemainingMs(slaDueAt)
  if (ms === null) return ''
  if (ms <= 0) return '已逾期'
  const h = Math.floor(ms / (1000 * 60 * 60))
  const m = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
  return `剩余 ${h}h ${m}m`
}

export function isSlaOverdue(slaDueAt?: string) {
  const ms = slaRemainingMs(slaDueAt)
  return ms !== null && ms <= 0
}

/** 轻量模板化反馈（即时返回；有联系方式时可升级真人批改） */
export function generateHomeworkFeedback(type: HomeworkType, content: string): string {
  const text = content.trim()
  const tips: string[] = []

  if (text.length < 80) {
    tips.push('内容偏短：建议补充「背景 → 动作 → 结果 → 指标」四段，便于评审与面试复述。')
  }
  if (!/\d|%|指标|率|成本|采纳|召回|准确/.test(text)) {
    tips.push('缺少量化指标：竞品项目实战普遍要求绑定 1～3 个可测量 KPI，请补具体数字或目标值。')
  }
  if (type === 'project-lab' && !/边界|范围|MVP|不做什么/.test(text)) {
    tips.push('项目 Lab：建议明确 MVP 边界（做什么 / 不做什么），避免 scope 失控。')
  }
  if (type === 'eval-lab' && !/badcase|Badcase|幻觉|错误|case/i.test(text)) {
    tips.push('Eval Lab：请列出至少 3 条 Badcase 及根因分类（幻觉 / 漏召回 / 格式 / 合规）。')
  }
  if (type === 'checklist' && !/决策|RAG|Agent|Eval|风险|成本/.test(text)) {
    tips.push('清单：建议覆盖技术路线、Eval 门禁、成本与风险至少各 1 点。')
  }
  if (tips.length === 0) {
    tips.push('结构完整度较好。下一步：发布公开成果页或导出求职包，用于面试展示。')
    tips.push('进阶：对照项目 Lab Rubric 自评，目标 80 分以上再提交进阶席位答疑。')
  }

  return ['【模板化反馈 · 提交后可申请真人点评】', ...tips.map((t, i) => `${i + 1}. ${t}`)].join('\n')
}

export function normalizeHomeworkRecord(raw: Record<string, unknown>): HomeworkRecord {
  const legacyFeedback = String(raw.feedback || raw.autoFeedback || '')
  const createdAt = String(raw.createdAt || new Date().toISOString())
  const requestHumanReview = Boolean(raw.requestHumanReview)
  const contact = String(raw.contact || '')
  const notifyChannel = (raw.notifyChannel as NotifyChannel) || 'unknown'
  return {
    id: String(raw.id || ''),
    type: (raw.type as HomeworkType) || 'weekly-review',
    title: String(raw.title || ''),
    content: String(raw.content || ''),
    autoFeedback: legacyFeedback,
    humanFeedback: raw.humanFeedback ? String(raw.humanFeedback) : undefined,
    status: (raw.status as HomeworkStatus) || 'auto_reviewed',
    contact,
    notifyChannel,
    source: String(raw.source || ''),
    requestHumanReview,
    slaDueAt: raw.slaDueAt
      ? String(raw.slaDueAt)
      : requestHumanReview
        ? computeSlaDueAt(createdAt)
        : undefined,
    reviewedAt: raw.reviewedAt ? String(raw.reviewedAt) : undefined,
    feedbackReadAt: raw.feedbackReadAt ? String(raw.feedbackReadAt) : undefined,
    createdAt,
  }
}
