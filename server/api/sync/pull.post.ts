import { readBody } from 'h3'
import { readJsonFile } from '~/server/utils/storage'

interface SyncRecord {
  deviceId: string
  payload: Record<string, string>
  payloadVersion: number
  updatedAt: string
}

interface SyncDb {
  records: Record<string, SyncRecord>
}

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    deviceId?: string
    clientPayloadVersion?: number
  }>(event)
  if (!body?.deviceId) {
    throw createError({ statusCode: 400, statusMessage: 'deviceId 必填' })
  }

  const db = await readJsonFile<SyncDb>('sync-db.json', { records: {} })
  const record = db.records[body.deviceId]
  if (!record) return { ok: true, found: false }
  const clientVersion = Number(body.clientPayloadVersion || 0)
  return {
    ok: true,
    found: true,
    stale: record.payloadVersion > clientVersion,
    record,
    serverMeta: {
      payloadVersion: record.payloadVersion,
      updatedAt: record.updatedAt,
    },
  }
})
