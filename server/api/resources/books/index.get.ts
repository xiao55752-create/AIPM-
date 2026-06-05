import { readJsonFile } from '~/server/utils/storage'

interface BookDatasetItem {
  id: string
  title: string
  author: string
  publisher: string
  summary: string
  week: number
  tags: string
  source: string
  href: string
}

interface BookDatasetFile {
  syncedAt: string
  count: number
  items: BookDatasetItem[]
}

export default defineEventHandler(async () => {
  const payload = await readJsonFile<BookDatasetFile | null>('books-dataset.json', null)
  if (!payload) {
    return {
      ok: true,
      exists: false,
      syncedAt: '',
      count: 0,
      items: [] as BookDatasetItem[],
    }
  }

  return {
    ok: true,
    exists: true,
    ...payload,
  }
})
