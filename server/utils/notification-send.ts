import type { OutboundNotification } from '~/lib/notifications'
import {
  getNotificationById,
  markNotificationFailed,
  markNotificationSent,
  readNotificationsDb,
} from '~/server/utils/notifications-db'
import {
  canAutoDispatch,
  dispatchNotification,
  type NotifyDispatchConfig,
} from '~/server/utils/notify-dispatch'

export function getNotifyDispatchConfig() {
  const config = useRuntimeConfig()
  const wecomWebhookUrl = String(config.wecomWebhookUrl || '')
  return {
    wecomWebhookUrl,
    mailWebhookUrl: String(config.mailWebhookUrl || ''),
    slaAlertWebhookUrl: String(config.slaAlertWebhookUrl || wecomWebhookUrl),
    autoDispatch: config.notifyAutoDispatch !== false,
  }
}

export function getNotifyDispatchPublicConfig() {
  const cfg = getNotifyDispatchConfig()
  return {
    wecomConfigured: Boolean(cfg.wecomWebhookUrl),
    mailConfigured: Boolean(cfg.mailWebhookUrl),
    slaAlertConfigured: Boolean(cfg.slaAlertWebhookUrl),
    autoDispatch: cfg.autoDispatch,
  }
}

export async function sendNotificationRecord(
  record: OutboundNotification,
  config: NotifyDispatchConfig,
) {
  if (record.status !== 'pending' && record.status !== 'failed') {
    return { ok: false as const, skipped: true, reason: '通知状态不可发送' }
  }
  if (!canAutoDispatch(record.channel, config)) {
    return { ok: false as const, skipped: true, reason: '当前渠道未配置 Webhook' }
  }

  const result = await dispatchNotification(record, config)
  if (result.ok) {
    const updated = await markNotificationSent(record.id, true)
    return { ok: true as const, record: updated }
  }
  if (result.skipped) {
    return { ok: false as const, skipped: true, reason: result.reason }
  }

  const updated = await markNotificationFailed(record.id, result.error || '发送失败')
  return { ok: false as const, error: result.error, record: updated }
}

export async function sendNotificationById(id: string) {
  const record = await getNotificationById(id)
  if (!record) return { ok: false as const, error: '通知不存在' }
  return sendNotificationRecord(record, getNotifyDispatchConfig())
}

export async function sendAllPendingNotifications() {
  const db = await readNotificationsDb()
  const config = getNotifyDispatchConfig()
  const pending = db.records.filter((r) => r.status === 'pending' || r.status === 'failed')
  const results: Array<{ id: string; ok: boolean; error?: string; skipped?: boolean }> = []

  for (const record of pending) {
    const res = await sendNotificationRecord(record, config)
    results.push({
      id: record.id,
      ok: res.ok,
      error: 'error' in res ? res.error : undefined,
      skipped: 'skipped' in res ? res.skipped : undefined,
    })
  }

  const sent = results.filter((r) => r.ok).length
  const skipped = results.filter((r) => r.skipped).length
  const failed = results.length - sent - skipped
  return { ok: true, sent, skipped, failed, results }
}
