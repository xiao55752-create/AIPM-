import { getQuery } from 'h3'
import type { HomeworkStatus } from '~/lib/homework'
import { readHomeworkDb } from '~/server/utils/homework-db'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const status = query.status ? String(query.status) as HomeworkStatus : ''
  const limit = Math.min(50, Math.max(1, Number(query.limit) || 20))

  const db = await readHomeworkDb()
  let records = db.records
  if (status) {
    records = records.filter((r) => r.status === status)
  }

  const pendingCount = db.records.filter((r) => r.status === 'pending_human').length
  const reviewedCount = db.records.filter((r) => r.status === 'human_reviewed').length
  const overdueCount = db.records.filter(
    (r) => r.status === 'pending_human' && r.slaDueAt && new Date(r.slaDueAt).getTime() < Date.now(),
  ).length

  return {
    ok: true,
    pendingCount,
    reviewedCount,
    overdueCount,
    records: records.slice(0, limit).map((r) => ({
      ...r,
      feedback: r.autoFeedback,
    })),
  }
})
