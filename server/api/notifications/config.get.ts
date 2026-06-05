import { getNotifyDispatchPublicConfig } from '~/server/utils/notification-send'

export default defineEventHandler(() => {
  return {
    ok: true,
    config: getNotifyDispatchPublicConfig(),
  }
})
