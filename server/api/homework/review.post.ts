import { readBody } from 'h3'
import { buildHomeworkReviewNotification } from '~/lib/notifications'
import { readHomeworkDb, writeHomeworkDb } from '~/server/utils/homework-db'
import { enqueueNotification } from '~/server/utils/notifications-db'
import {
  getNotifyDispatchConfig,
  sendNotificationById,
} from '~/server/utils/notification-send'

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    id?: string
    humanFeedback?: string
    reviewer?: string
  }>(event)

  const id = body?.id?.trim()
  const humanFeedback = body?.humanFeedback?.trim()
  if (!id || !humanFeedback || humanFeedback.length < 10) {
    throw createError({ statusCode: 400, statusMessage: 'id 与批改内容（≥10 字）必填' })
  }

  const db = await readHomeworkDb()
  const idx = db.records.findIndex((r) => r.id === id)
  if (idx < 0) {
    throw createError({ statusCode: 404, statusMessage: '作业不存在' })
  }

  const prefix = body?.reviewer?.trim() ? `【${body.reviewer.trim()} · 真人批改】` : '【陈总监 · 真人批改】'
  const updated = {
    ...db.records[idx]!,
    humanFeedback: `${prefix}\n${humanFeedback}`,
    status: 'human_reviewed' as const,
    reviewedAt: new Date().toISOString(),
  }
  db.records[idx] = updated
  await writeHomeworkDb(db)

  let notification = null
  if (updated.contact) {
    const config = useRuntimeConfig()
    const baseUrl = String(config.public.siteUrl || 'http://127.0.0.1:3030')
    const msg = buildHomeworkReviewNotification({
      title: updated.title,
      contact: updated.contact,
      channel: updated.notifyChannel,
      baseUrl,
      detailUrl: `${baseUrl}/tools/homework/${updated.id}`,
    })
    notification = await enqueueNotification({
      homeworkId: updated.id,
      channel: updated.notifyChannel,
      contact: updated.contact,
      subject: msg.subject,
      body: msg.body,
    })

    const dispatchConfig = getNotifyDispatchConfig()
    if (dispatchConfig.autoDispatch) {
      const dispatchResult = await sendNotificationById(notification.id)
      if (dispatchResult.ok && dispatchResult.record) {
        notification = dispatchResult.record
      } else if ('record' in dispatchResult && dispatchResult.record) {
        notification = dispatchResult.record
      }
    }
  }

  return {
    ok: true,
    record: {
      ...updated,
      feedback: updated.autoFeedback,
    },
    notification,
  }
})
