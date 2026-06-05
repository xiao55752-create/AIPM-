import { readJsonFile } from '~/server/utils/storage'

interface WaitlistRecord {
  id: string
  name: string
  contact: string
  currentRole: string
  goal: string
  createdAt: string
}

interface WaitlistDb {
  records: WaitlistRecord[]
}

export default defineEventHandler(async () => {
  const db = await readJsonFile<WaitlistDb>('waitlist-db.json', { records: [] })
  return { ok: true, records: db.records }
})
