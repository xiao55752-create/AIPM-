import type { NotifyChannel, OutboundNotification } from '~/lib/notifications'

export interface NotifyDispatchConfig {
  wecomWebhookUrl: string
  mailWebhookUrl: string
}

export interface DispatchResult {
  ok: boolean
  channel?: NotifyChannel
  error?: string
  skipped?: boolean
  reason?: string
}

export function canAutoDispatch(channel: NotifyChannel, config: NotifyDispatchConfig) {
  if (channel === 'wechat') return Boolean(config.wecomWebhookUrl)
  if (channel === 'email') return Boolean(config.mailWebhookUrl)
  return false
}

export async function dispatchWecomWebhook(webhookUrl: string, content: string): Promise<DispatchResult> {
  if (!webhookUrl) {
    return { ok: false, skipped: true, reason: '未配置企微 Webhook' }
  }
  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        msgtype: 'text',
        text: { content },
      }),
    })
    const data = (await res.json().catch(() => ({}))) as { errcode?: number; errmsg?: string }
    if (!res.ok || (data.errcode !== undefined && data.errcode !== 0)) {
      return {
        ok: false,
        error: data.errmsg || `HTTP ${res.status}`,
      }
    }
    return { ok: true, channel: 'wechat' }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : '企微发送失败',
    }
  }
}

export async function dispatchMailWebhook(
  webhookUrl: string,
  payload: { to: string; subject: string; body: string },
): Promise<DispatchResult> {
  if (!webhookUrl) {
    return { ok: false, skipped: true, reason: '未配置邮件 Webhook' }
  }
  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return { ok: false, error: text || `HTTP ${res.status}` }
    }
    return { ok: true, channel: 'email' }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : '邮件 Webhook 发送失败',
    }
  }
}

export async function dispatchNotification(
  record: OutboundNotification,
  config: NotifyDispatchConfig,
): Promise<DispatchResult> {
  if (record.channel === 'wechat') {
    return dispatchWecomWebhook(config.wecomWebhookUrl, record.body)
  }
  if (record.channel === 'email') {
    return dispatchMailWebhook(config.mailWebhookUrl, {
      to: record.contact,
      subject: record.subject,
      body: record.body,
    })
  }
  return { ok: false, skipped: true, reason: '未知通知渠道，请手动发送' }
}

export async function dispatchSlaOverdueAlert(
  webhookUrl: string,
  input: { overdueCount: number; pendingCount: number; opsUrl: string },
): Promise<DispatchResult> {
  if (!webhookUrl || input.overdueCount <= 0) {
    return { ok: false, skipped: true, reason: '无需 SLA 告警' }
  }
  const content = [
    '【成长营 SLA 告警】',
    `待批改 ${input.pendingCount} 条，其中 ${input.overdueCount} 条已超 48h。`,
    `请尽快处理：${input.opsUrl}`,
  ].join('\n')
  return dispatchWecomWebhook(webhookUrl, content)
}
