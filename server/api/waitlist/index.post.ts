import { readBody } from 'h3'
import { readJsonFile, writeJsonFile } from '~/server/utils/storage'

interface WaitlistRecord {
  id: string
  name: string
  contact: string
  currentRole: string
  goal: string
  source: string
  campaign: string
  createdAt: string
}

interface WaitlistDb {
  records: WaitlistRecord[]
}

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    name?: string
    contact?: string
    currentRole?: string
    goal?: string
    source?: string
    campaign?: string
  }>(event)

  const name = body?.name?.trim()
  const contact = body?.contact?.trim()
  if (!name || !contact) {
    throw createError({ statusCode: 400, statusMessage: '姓名和联系方式必填' })
  }

  const db = await readJsonFile<WaitlistDb>('waitlist-db.json', { records: [] })
  const duplicated = db.records.find((item) => item.contact === contact)
  if (duplicated) {
    return {
      ok: true,
      duplicate: true,
      record: duplicated,
      message: '该联系方式已报名，已返回历史记录',
    }
  }

  const record: WaitlistRecord = {
    id: crypto.randomUUID(),
    name,
    contact,
    currentRole: body?.currentRole?.trim() || '',
    goal: body?.goal?.trim() || '',
    source: body?.source?.trim() || 'unknown',
    campaign: body?.campaign?.trim() || '',
    createdAt: new Date().toISOString(),
  }

  db.records.unshift(record)
  db.records = db.records.slice(0, 5000)
  await writeJsonFile('waitlist-db.json', db)

  return { ok: true, record }
})
