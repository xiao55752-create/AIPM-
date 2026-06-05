export const ANALYTICS_STORAGE_KEY = 'apgc-analytics-events-v1'

export interface AnalyticsEvent {
  name: string
  at: string
  day: string
  payload?: Record<string, string | number | boolean>
}

export function trackEvent(
  name: string,
  payload?: Record<string, string | number | boolean>,
) {
  if (!import.meta.client) return
  const now = new Date()
  const event: AnalyticsEvent = {
    name,
    at: now.toISOString(),
    day: now.toISOString().slice(0, 10),
    payload,
  }
  try {
    const raw = localStorage.getItem(ANALYTICS_STORAGE_KEY)
    const events = raw ? (JSON.parse(raw) as AnalyticsEvent[]) : []
    events.push(event)
    localStorage.setItem(ANALYTICS_STORAGE_KEY, JSON.stringify(events.slice(-5000)))
  } catch {
    // noop
  }
}

export function readEvents(): AnalyticsEvent[] {
  if (!import.meta.client) return []
  try {
    const raw = localStorage.getItem(ANALYTICS_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as AnalyticsEvent[]) : []
  } catch {
    return []
  }
}
