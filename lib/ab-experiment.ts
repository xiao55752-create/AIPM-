export const REPORT_CTA_FORCE_VARIANT_KEY = 'apgc-report-cta-force-variant'
export const PAY_CTA_FORCE_VARIANT_KEY = 'apgc-pay-cta-force-variant'
export const AB_AUTO_LOCK_META_KEY = 'apgc-ab-auto-lock-meta-v1'

export const AB_MIN_SAMPLE = 20
export const AB_MIN_LEAD_PCT = 10

export interface AbAutoLockEntry {
  variant: 'A' | 'B'
  at: string
  auto: boolean
}

export interface AbAutoLockMeta {
  report?: AbAutoLockEntry
  pay?: AbAutoLockEntry
}

export function readAbAutoLockMeta(): AbAutoLockMeta {
  if (!import.meta.client) return {}
  try {
    const raw = localStorage.getItem(AB_AUTO_LOCK_META_KEY)
    return raw ? (JSON.parse(raw) as AbAutoLockMeta) : {}
  } catch {
    return {}
  }
}

export function writeAbAutoLockMeta(meta: AbAutoLockMeta) {
  if (!import.meta.client) return
  localStorage.setItem(AB_AUTO_LOCK_META_KEY, JSON.stringify(meta))
}
