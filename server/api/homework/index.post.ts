import { readBody } from 'h3'
import {
  computeSlaDueAt,
  generateHomeworkFeedback,
  homeworkDefaultTitle,
  type HomeworkType,
  type NotifyChannel,
} from '~/lib/homework'
import { detectNotifyChannel } from '~/lib/notifications'
import { readHomeworkDb, writeHomeworkDb } from '~/server/utils/homework-db'

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    type?: HomeworkType
    title?: string
    content?: string
    contact?: string
    source?: string
    requestHumanReview?: boolean
    notifyChannel?: NotifyChannel
  }>(event)

  const content = body?.content?.trim()
  const type = body?.type || 'weekly-review'
  if (!content || content.length < 20) {
    throw createError({ statusCode: 400, statusMessage: '作业内容至少 20 字' })
  }

  const contact = body?.contact?.trim() || ''
  const requestHumanReview = Boolean(body?.requestHumanReview && contact)
  const autoFeedback = generateHomeworkFeedback(type, content)
  const createdAt = new Date().toISOString()
  const notifyChannel =
    body?.notifyChannel && body.notifyChannel !== 'unknown'
      ? body.notifyChannel
      : detectNotifyChannel(contact)

  const record = {
    id: crypto.randomUUID(),
    type,
    title: body?.title?.trim() || homeworkDefaultTitle(type),
    content,
    autoFeedback,
    status: requestHumanReview ? ('pending_human' as const) : ('auto_reviewed' as const),
    contact,
    notifyChannel,
    source: body?.source?.trim() || 'homework-page',
    requestHumanReview,
    slaDueAt: requestHumanReview ? computeSlaDueAt(createdAt) : undefined,
    createdAt,
  }

  const db = await readHomeworkDb()
  db.records.unshift(record)
  db.records = db.records.slice(0, 2000)
  await writeHomeworkDb(db)

  return {
    ok: true,
    record: {
      ...record,
      feedback: autoFeedback,
    },
  }
})
