import { readHomeworkDb } from '~/server/utils/homework-db'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: '缺少 id' })
  }

  const db = await readHomeworkDb()
  const record = db.records.find((r) => r.id === id)
  if (!record) {
    throw createError({ statusCode: 404, statusMessage: '作业不存在' })
  }

  return {
    ok: true,
    record: {
      ...record,
      feedback: record.autoFeedback,
    },
  }
})
