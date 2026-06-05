import { readHomeworkDb, writeHomeworkDb } from '~/server/utils/homework-db'
import { markNotificationsOpenedByHomeworkId } from '~/server/utils/notifications-db'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: '缺少 id' })
  }

  const db = await readHomeworkDb()
  const idx = db.records.findIndex((r) => r.id === id)
  if (idx < 0) {
    throw createError({ statusCode: 404, statusMessage: '作业不存在' })
  }

  const record = db.records[idx]!
  if (record.status !== 'human_reviewed') {
    return {
      ok: true,
      record: {
        ...record,
        feedback: record.autoFeedback,
      },
      notifications: [],
    }
  }

  const feedbackReadAt = record.feedbackReadAt || new Date().toISOString()
  db.records[idx] = {
    ...record,
    feedbackReadAt,
  }
  await writeHomeworkDb(db)
  const notifications = await markNotificationsOpenedByHomeworkId(id)

  return {
    ok: true,
    record: {
      ...db.records[idx]!,
      feedback: db.records[idx]!.autoFeedback,
    },
    notifications,
  }
})
