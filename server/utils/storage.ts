import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const DATA_DIR = join(process.cwd(), '.data')

async function ensureDataDir() {
  await mkdir(DATA_DIR, { recursive: true })
}

export async function readJsonFile<T>(name: string, fallback: T): Promise<T> {
  await ensureDataDir()
  const file = join(DATA_DIR, name)
  try {
    const raw = await readFile(file, 'utf-8')
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export async function writeJsonFile<T>(name: string, data: T) {
  await ensureDataDir()
  const file = join(DATA_DIR, name)
  await writeFile(file, JSON.stringify(data, null, 2), 'utf-8')
}
