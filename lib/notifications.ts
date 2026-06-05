export const NOTIFICATIONS_DB_FILE = 'notifications-db.json'

export type NotifyChannel = 'wechat' | 'email' | 'unknown'

export type NotificationStatus = 'pending' | 'sent' | 'failed'

export interface OutboundNotification {
  id: string
  homeworkId: string
  channel: NotifyChannel
  contact: string
  subject: string
  body: string
  status: NotificationStatus
  createdAt: string
  sentAt?: string
  openedAt?: string
  autoDispatched?: boolean
  dispatchError?: string
}

export function detectNotifyChannel(contact: string): NotifyChannel {
  const c = contact.trim()
  if (!c) return 'unknown'
  if (/@/.test(c)) return 'email'
  if (/^1\d{10}$/.test(c) || /微信|wx/i.test(c) || !/@/.test(c)) return 'wechat'
  return 'unknown'
}

export function buildHomeworkReviewNotification(input: {
  title: string
  contact: string
  channel: NotifyChannel
  baseUrl?: string
  detailUrl?: string
}) {
  const base = input.baseUrl || 'http://127.0.0.1:3030'
  const detailUrl = input.detailUrl || `${base}/tools/homework`
  const subject = `【AI 产品成长营】作业「${input.title}」批改完成`
  const body = [
    `您好，您提交的作业「${input.title}」已完成真人批改。`,
    '',
    `请打开成长营查看完整反馈：${detailUrl}`,
    '打开详情页后，系统会自动记录已读状态，方便主理人跟进。',
    '',
    '—— AI 产品成长营',
  ].join('\n')

  const wechatBody = [
    `【成长营通知】您的作业「${input.title}」已完成真人批改`,
    `请打开详情查看：${detailUrl}`,
  ].join('\n')

  return {
    subject,
    body: input.channel === 'email' ? body : wechatBody,
  }
}
