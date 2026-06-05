import { readBody } from 'h3'
import {
  sendAllPendingNotifications,
  sendNotificationById,
} from '~/server/utils/notification-send'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ id?: string; all?: boolean }>(event)

  if (body?.all) {
    return sendAllPendingNotifications()
  }

  const id = body?.id?.trim()
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: '请提供 id 或 all=true' })
  }

  const result = await sendNotificationById(id)
  if (!result.ok && !('skipped' in result && result.skipped)) {
    throw createError({
      statusCode: 502,
      statusMessage: ('error' in result && result.error) || '发送失败',
    })
  }
  return result
})
