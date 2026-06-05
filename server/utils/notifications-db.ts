import { readJsonFile, writeJsonFile } from '~/server/utils/storage'
import type { OutboundNotification } from '~/lib/notifications'
import { NOTIFICATIONS_DB_FILE } from '~/lib/notifications'

interface NotificationsDb {
  records: OutboundNotification[]
}

export async function readNotificationsDb() {
  return readJsonFile<NotificationsDb>(NOTIFICATIONS_DB_FILE, { records: [] })
}

export async function writeNotificationsDb(db: NotificationsDb) {
  await writeJsonFile(NOTIFICATIONS_DB_FILE, db)
}

export async function enqueueNotification(entry: Omit<OutboundNotification, 'id' | 'status' | 'createdAt'>) {
  const db = await readNotificationsDb()
  const record: OutboundNotification = {
    ...entry,
    id: crypto.randomUUID(),
    status: 'pending',
    createdAt: new Date().toISOString(),
  }
  db.records.unshift(record)
  db.records = db.records.slice(0, 500)
  await writeNotificationsDb(db)
  return record
}

export async function markNotificationSent(id: string, autoDispatched = false) {
  const db = await readNotificationsDb()
  const idx = db.records.findIndex((r) => r.id === id)
  if (idx < 0) return null
  db.records[idx] = {
    ...db.records[idx]!,
    status: 'sent',
    sentAt: new Date().toISOString(),
    autoDispatched,
    dispatchError: undefined,
  }
  await writeNotificationsDb(db)
  return db.records[idx]
}

export async function markNotificationsOpenedByHomeworkId(homeworkId: string) {
  const db = await readNotificationsDb()
  const openedAt = new Date().toISOString()
  let changed = false
  db.records = db.records.map((record) => {
    if (record.homeworkId !== homeworkId || record.openedAt) return record
    changed = true
    return {
      ...record,
      openedAt,
    }
  })
  if (changed) await writeNotificationsDb(db)
  return db.records.filter((r) => r.homeworkId === homeworkId)
}

export async function markNotificationFailed(id: string, error: string) {
  const db = await readNotificationsDb()
  const idx = db.records.findIndex((r) => r.id === id)
  if (idx < 0) return null
  db.records[idx] = {
    ...db.records[idx]!,
    status: 'failed',
    dispatchError: error,
  }
  await writeNotificationsDb(db)
  return db.records[idx]
}

export async function getNotificationById(id: string) {
  const db = await readNotificationsDb()
  return db.records.find((r) => r.id === id) || null
}
