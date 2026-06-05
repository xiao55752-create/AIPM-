import { demoHomeworkDraft } from '~/lib/demo-data'
import {
  computeSlaDueAt,
  generateHomeworkFeedback,
  type HomeworkRecord,
} from '~/lib/homework'
import type { OutboundNotification } from '~/lib/notifications'
import { readHomeworkDb, writeHomeworkDb } from '~/server/utils/homework-db'
import { readNotificationsDb, writeNotificationsDb } from '~/server/utils/notifications-db'

function hoursAgo(hours: number) {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
}

function upsertById<T extends { id: string }>(records: T[], next: T) {
  const idx = records.findIndex((item) => item.id === next.id)
  if (idx >= 0) records[idx] = next
  else records.unshift(next)
}

export default defineEventHandler(async () => {
  const createdPending = hoursAgo(50)
  const createdUnread = hoursAgo(26)
  const createdRead = hoursAgo(20)
  const reviewedUnread = hoursAgo(3)
  const reviewedRead = hoursAgo(5)
  const openedAt = hoursAgo(1)

  const baseContent = demoHomeworkDraft.content
  const pending: HomeworkRecord = {
    id: 'demo-homework-pending-overdue',
    type: 'project-lab',
    title: '【演示】客服 Copilot Eval 改造 · 待批改',
    content: baseContent,
    autoFeedback: generateHomeworkFeedback('project-lab', baseContent),
    status: 'pending_human',
    contact: 'wx: apgc-demo-pending',
    notifyChannel: 'wechat',
    source: 'ops-demo',
    requestHumanReview: true,
    slaDueAt: computeSlaDueAt(createdPending),
    createdAt: createdPending,
  }

  const reviewedUnreadHomework: HomeworkRecord = {
    id: 'demo-homework-reviewed-unread',
    type: 'project-lab',
    title: '【演示】客服 Copilot Eval 改造 · 已批改未读',
    content: baseContent,
    autoFeedback: generateHomeworkFeedback('project-lab', baseContent),
    humanFeedback: [
      '【陈总监 · 真人批改】',
      '结构已经能支撑面试表达。建议再补两点：',
      '1. 灰度发布阶段的监控口径，例如人工接管率和异常投诉率。',
      '2. 将“高风险误答 = 0”写成上线门禁，而不是普通指标。',
    ].join('\n'),
    status: 'human_reviewed',
    contact: 'demo-user@example.com',
    notifyChannel: 'email',
    source: 'ops-demo',
    requestHumanReview: true,
    slaDueAt: computeSlaDueAt(createdUnread),
    reviewedAt: reviewedUnread,
    createdAt: createdUnread,
  }

  const reviewedReadHomework: HomeworkRecord = {
    ...reviewedUnreadHomework,
    id: 'demo-homework-reviewed-read',
    title: '【演示】客服 Copilot Eval 改造 · 已打开反馈',
    contact: 'wx: apgc-demo-read',
    notifyChannel: 'wechat',
    reviewedAt: reviewedRead,
    feedbackReadAt: openedAt,
    createdAt: createdRead,
    slaDueAt: computeSlaDueAt(createdRead),
  }

  const homeworkDb = await readHomeworkDb()
  for (const record of [pending, reviewedUnreadHomework, reviewedReadHomework]) {
    upsertById(homeworkDb.records, record)
  }
  homeworkDb.records = homeworkDb.records.slice(0, 2000)
  await writeHomeworkDb(homeworkDb)

  const notifications: OutboundNotification[] = [
    {
      id: 'demo-notification-unread',
      homeworkId: reviewedUnreadHomework.id,
      channel: 'email',
      contact: reviewedUnreadHomework.contact,
      subject: '【演示】作业批改完成：客服 Copilot Eval 改造',
      body: `请查看批改详情：http://127.0.0.1:3030/tools/homework/${reviewedUnreadHomework.id}`,
      status: 'sent',
      createdAt: reviewedUnread,
      sentAt: reviewedUnread,
      autoDispatched: true,
    },
    {
      id: 'demo-notification-opened',
      homeworkId: reviewedReadHomework.id,
      channel: 'wechat',
      contact: reviewedReadHomework.contact,
      subject: '【演示】作业批改完成：客服 Copilot Eval 改造',
      body: `请查看批改详情：http://127.0.0.1:3030/tools/homework/${reviewedReadHomework.id}`,
      status: 'sent',
      createdAt: reviewedRead,
      sentAt: reviewedRead,
      openedAt,
      autoDispatched: true,
    },
    {
      id: 'demo-notification-failed',
      homeworkId: reviewedUnreadHomework.id,
      channel: 'wechat',
      contact: 'wx: apgc-demo-failed',
      subject: '【演示】企微通知发送失败样例',
      body: '这条用于演示 Webhook 失败后的重试/手动复制流程。',
      status: 'failed',
      createdAt: hoursAgo(2),
      dispatchError: 'Webhook 未配置或网络不可达（演示）',
    },
  ]

  const notificationDb = await readNotificationsDb()
  for (const record of notifications) {
    upsertById(notificationDb.records, record)
  }
  notificationDb.records = notificationDb.records.slice(0, 500)
  await writeNotificationsDb(notificationDb)

  return {
    ok: true,
    homework: {
      pending: pending.id,
      reviewedUnread: reviewedUnreadHomework.id,
      reviewedRead: reviewedReadHomework.id,
    },
    notifications: notifications.map((item) => item.id),
  }
})
