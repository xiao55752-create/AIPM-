import { resources } from '~/lib/resources'
import { readJsonFile, writeJsonFile } from '~/server/utils/storage'

interface VideoHotItem {
  id: string
  title: string
  play: number
  quality: number
  author: string
  url: string
}

interface CacheFile {
  fetchedAt: string
  items: VideoHotItem[]
}

function parsePlay(raw: unknown) {
  const text = String(raw || '').trim()
  if (!text) return 0
  if (text.endsWith('万')) {
    const n = Number(text.replace('万', ''))
    return Number.isFinite(n) ? Math.round(n * 10000) : 0
  }
  const n = Number(text.replace(/[^\d.]/g, ''))
  return Number.isFinite(n) ? Math.round(n) : 0
}

function scoreFromStats(play: number, danmaku: number) {
  const playScore = Math.min(100, Math.round(Math.log10(play + 1) * 16))
  const danmakuScore = Math.min(100, Math.round(Math.log10(danmaku + 1) * 25))
  return Math.round(playScore * 0.7 + danmakuScore * 0.3)
}

export default defineEventHandler(async () => {
  const cache = await readJsonFile<CacheFile | null>('video-hot-cache.json', null)
  const now = Date.now()
  if (cache?.fetchedAt) {
    const age = now - new Date(cache.fetchedAt).getTime()
    if (age < 6 * 60 * 60 * 1000 && cache.items.length) {
      return { ok: true, cached: true, fetchedAt: cache.fetchedAt, items: cache.items }
    }
  }

  const videos = resources.filter((item) => item.type === 'video')
  const items: VideoHotItem[] = []

  for (const item of videos) {
    try {
      const url = `https://api.bilibili.com/x/web-interface/search/type?search_type=video&page=1&keyword=${encodeURIComponent(item.title)}`
      const res = await fetch(url, {
        headers: {
          'user-agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
          referer: 'https://www.bilibili.com',
        },
      })
      const data = (await res.json()) as {
        data?: {
          result?: Array<{
            play?: number | string
            video_review?: number | string
            author?: string
            arcurl?: string
          }>
        }
      }
      const top = data?.data?.result?.[0]
      if (!top) continue
      const play = parsePlay(top.play)
      const danmaku = parsePlay(top.video_review)
      items.push({
        id: item.id,
        title: item.title,
        play,
        quality: scoreFromStats(play, danmaku),
        author: top.author || '',
        url: top.arcurl || '',
      })
    } catch {
      // noop
    }
  }

  const fetchedAt = new Date().toISOString()
  const cacheToWrite: CacheFile = { fetchedAt, items }
  await writeJsonFile('video-hot-cache.json', cacheToWrite)

  return { ok: true, cached: false, fetchedAt, items }
})
