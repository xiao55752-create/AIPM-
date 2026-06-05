import { readHomeworkDb } from '~/server/utils/homework-db'
import { dispatchSlaOverdueAlert } from '~/server/utils/notify-dispatch'
import { getNotifyDispatchConfig } from '~/server/utils/notification-send'

export default defineEventHandler(async () => {
  const db = await readHomeworkDb()
  const pendingCount = db.records.filter((r) => r.status === 'pending_human').length
  const overdueCount = db.records.filter(
    (r) => r.status === 'pending_human' && r.slaDueAt && new Date(r.slaDueAt).getTime() < Date.now(),
  ).length

  const config = useRuntimeConfig()
  const baseUrl = String(config.public.siteUrl || 'http://127.0.0.1:3030')
  const dispatchConfig = getNotifyDispatchConfig()

  const result = await dispatchSlaOverdueAlert(dispatchConfig.slaAlertWebhookUrl, {
    overdueCount,
    pendingCount,
    opsUrl: `${baseUrl}/ops`,
  })

  return {
    ok: result.ok,
    overdueCount,
    pendingCount,
    skipped: result.skipped,
    error: result.error,
    reason: result.reason,
  }
})
