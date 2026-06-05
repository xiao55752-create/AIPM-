import { resources } from '~/lib/resources'
import { writeJsonFile } from '~/server/utils/storage'

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

function resolveResourceLink(item: (typeof resources)[number]) {
  if (item.href) return item.href
  const keyword = encodeURIComponent(item.title)
  return `https://search.jd.com/Search?keyword=${keyword}`
}

function sourceLabel(item: (typeof resources)[number]) {
  if (item.source) return item.source
  if (item.href?.includes('jd.com')) return '京东图书'
  return '图书搜索'
}

export default defineEventHandler(async () => {
  const books = resources.filter((item) => item.type === 'book')
  const items: BookDatasetItem[] = books.map((item) => ({
    id: item.id,
    title: item.title,
    author: item.author || '',
    publisher: item.publisher || '',
    summary: item.summary,
    week: item.week,
    tags: item.tags.join(','),
    source: sourceLabel(item),
    href: resolveResourceLink(item),
  }))

  const payload: BookDatasetFile = {
    syncedAt: new Date().toISOString(),
    count: items.length,
    items,
  }
  await writeJsonFile('books-dataset.json', payload)

  return {
    ok: true,
    syncedAt: payload.syncedAt,
    count: payload.count,
  }
})
