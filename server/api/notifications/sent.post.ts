import { readBody } from 'h3'
import { markNotificationSent } from '~/server/utils/notifications-db'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ id?: string }>(event)
  const id = body?.id?.trim()
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: '缺少 id' })
  }
  const record = await markNotificationSent(id)
  if (!record) {
    throw createError({ statusCode: 404, statusMessage: '通知不存在' })
  }
  return { ok: true, record }
})
