import { readJsonFile } from '~/server/utils/storage'
import type { PublicSharePayload } from '~/lib/share-payload'
import { demoShare, demoShareSlug } from '~/lib/demo-data'

interface ShareDb {
  shares: PublicSharePayload[]
}

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: '缺少 slug' })
  }

  const db = await readJsonFile<ShareDb>('shares-db.json', { shares: [] })
  const share = db.shares.find((s) => s.slug === slug)
  if (!share && slug === demoShareSlug) {
    return { ok: true, share: demoShare }
  }
  if (!share) {
    throw createError({ statusCode: 404, statusMessage: '成果页不存在或已过期' })
  }

  return { ok: true, share }
})
