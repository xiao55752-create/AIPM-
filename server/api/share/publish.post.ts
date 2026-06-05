import { readBody } from 'h3'
import { readJsonFile, writeJsonFile } from '~/server/utils/storage'
import type { PublicSharePayload } from '~/lib/share-payload'

interface ShareDb {
  shares: PublicSharePayload[]
}

export default defineEventHandler(async (event) => {
  const body = await readBody<Partial<PublicSharePayload>>(event)
  const slug = body?.slug?.trim()
  const title = body?.title?.trim()
  if (!slug || !title) {
    throw createError({ statusCode: 400, statusMessage: 'slug 与 title 必填' })
  }

  const share: PublicSharePayload = {
    slug,
    title,
    subtitle: body?.subtitle?.trim() || '',
    kind: body?.kind || 'outcome-pack',
    score: Number(body?.score) || 0,
    stage: body?.stage?.trim() || '',
    role: body?.role?.trim() || '',
    highlights: Array.isArray(body?.highlights) ? body.highlights.slice(0, 8) : [],
    body: body?.body?.trim() || '',
    publishedAt: new Date().toISOString(),
  }

  const db = await readJsonFile<ShareDb>('shares-db.json', { shares: [] })
  const idx = db.shares.findIndex((s) => s.slug === slug)
  if (idx >= 0) {
    db.shares[idx] = share
  } else {
    db.shares.unshift(share)
  }
  db.shares = db.shares.slice(0, 2000)
  await writeJsonFile('shares-db.json', db)

  return { ok: true, share, url: `/share/${slug}` }
})
