import { readBody } from 'h3'
import { readJsonFile, writeJsonFile } from '~/server/utils/storage'

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
    payload?: Record<string, string>
    payloadVersion?: number
    clientUpdatedAt?: string
    conflictStrategy?: 'last_write_wins' | 'server_wins' | 'client_wins'
  }>(event)

  if (!body?.deviceId || !body?.payload) {
    throw createError({ statusCode: 400, statusMessage: 'deviceId 和 payload 必填' })
  }

  const db = await readJsonFile<SyncDb>('sync-db.json', { records: {} })
  const existed = db.records[body.deviceId]
  const nextUpdatedAt = new Date().toISOString()
  const payloadVersion = Number(body.payloadVersion || 1)
  const strategy = body.conflictStrategy || 'last_write_wins'

  if (existed && strategy === 'server_wins' && body.clientUpdatedAt) {
    const clientAt = new Date(body.clientUpdatedAt).getTime()
    const serverAt = new Date(existed.updatedAt).getTime()
    if (Number.isFinite(clientAt) && Number.isFinite(serverAt) && clientAt < serverAt) {
      return {
        ok: true,
        conflict: true,
        strategy,
        record: existed,
        message: '服务器版本更新，已保留服务端记录',
      }
    }
  }

  const mergedVersion = existed ? Math.max(existed.payloadVersion || 1, payloadVersion) : payloadVersion
  db.records[body.deviceId] = {
    deviceId: body.deviceId,
    payload: body.payload,
    payloadVersion: mergedVersion,
    updatedAt: nextUpdatedAt,
  }
  await writeJsonFile('sync-db.json', db)

  return {
    ok: true,
    updatedAt: db.records[body.deviceId].updatedAt,
    payloadVersion: db.records[body.deviceId].payloadVersion,
    strategy,
    conflict: false,
  }
})
