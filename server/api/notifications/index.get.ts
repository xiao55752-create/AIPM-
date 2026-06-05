import { getQuery } from 'h3'
import { readNotificationsDb } from '~/server/utils/notifications-db'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const status = query.status ? String(query.status) : ''
  const db = await readNotificationsDb()
  let records = db.records
  if (status) records = records.filter((r) => r.status === status)
  const pendingCount = db.records.filter((r) => r.status === 'pending').length
  const failedCount = db.records.filter((r) => r.status === 'failed').length
  const openedCount = db.records.filter((r) => r.openedAt).length
  return { ok: true, pendingCount, failedCount, openedCount, records: records.slice(0, 20) }
})
