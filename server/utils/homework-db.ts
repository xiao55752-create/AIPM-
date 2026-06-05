import { readJsonFile, writeJsonFile } from '~/server/utils/storage'
import {
  HOMEWORK_DB_FILE,
  normalizeHomeworkRecord,
  type HomeworkRecord,
} from '~/lib/homework'

interface HomeworkDb {
  records: HomeworkRecord[]
}

export async function readHomeworkDb(): Promise<HomeworkDb> {
  const raw = await readJsonFile<{ records: Record<string, unknown>[] }>(HOMEWORK_DB_FILE, {
    records: [],
  })
  return {
    records: raw.records.map((r) => normalizeHomeworkRecord(r)),
  }
}

export async function writeHomeworkDb(db: HomeworkDb) {
  await writeJsonFile(HOMEWORK_DB_FILE, db)
}

export async function findHomeworkById(id: string) {
  const db = await readHomeworkDb()
  return db.records.find((r) => r.id === id) || null
}

export async function upsertHomework(record: HomeworkRecord) {
  const db = await readHomeworkDb()
  const idx = db.records.findIndex((r) => r.id === record.id)
  if (idx >= 0) db.records[idx] = record
  else db.records.unshift(record)
  db.records = db.records.slice(0, 2000)
  await writeHomeworkDb(db)
  return record
}
