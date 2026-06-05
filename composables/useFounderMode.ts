const FOUNDER_MODE_KEY = 'apgc-founder-mode-v1'
const FOUNDER_AUTH_KEY = 'apgc-founder-auth-v1'
const FOUNDER_AUTH_AT_KEY = 'apgc-founder-auth-at-v1'
const FOUNDER_AUTH_TTL_MS = 12 * 60 * 60 * 1000

export function useFounderMode() {
  const enabled = useState<boolean>('founder-mode-enabled', () => false)
  const authorized = useState<boolean>('founder-mode-authorized', () => false)
  const authAt = useState<number | null>('founder-mode-auth-at', () => null)
  const active = computed(() => enabled.value && authorized.value)
  const authorizedUntil = computed(() =>
    authAt.value ? new Date(authAt.value + FOUNDER_AUTH_TTL_MS).toLocaleString('zh-CN') : '',
  )

  function loadFounderMode() {
    if (!import.meta.client) return
    try {
      enabled.value = localStorage.getItem(FOUNDER_MODE_KEY) === '1'
      authorized.value = localStorage.getItem(FOUNDER_AUTH_KEY) === '1'
      const rawAt = localStorage.getItem(FOUNDER_AUTH_AT_KEY)
      authAt.value = rawAt ? Number(rawAt) : null

      const expired =
        authorized.value && authAt.value ? Date.now() - authAt.value > FOUNDER_AUTH_TTL_MS : true
      if (expired) {
        authorized.value = false
        enabled.value = false
        authAt.value = null
        localStorage.setItem(FOUNDER_AUTH_KEY, '0')
        localStorage.setItem(FOUNDER_MODE_KEY, '0')
        localStorage.removeItem(FOUNDER_AUTH_AT_KEY)
      }
    } catch {
      enabled.value = false
      authorized.value = false
      authAt.value = null
    }
  }

  function setFounderMode(next: boolean) {
    if (next && !authorized.value) return false
    enabled.value = next
    if (!import.meta.client) return
    try {
      localStorage.setItem(FOUNDER_MODE_KEY, next ? '1' : '0')
    } catch {
      // noop
    }
    return true
  }

  function setAuthorized(next: boolean) {
    authorized.value = next
    authAt.value = next ? Date.now() : null
    if (!import.meta.client) return
    try {
      localStorage.setItem(FOUNDER_AUTH_KEY, next ? '1' : '0')
      if (next && authAt.value) localStorage.setItem(FOUNDER_AUTH_AT_KEY, String(authAt.value))
      else localStorage.removeItem(FOUNDER_AUTH_AT_KEY)
    } catch {
      // noop
    }
  }

  function toggleFounderMode() {
    return setFounderMode(!enabled.value)
  }

  function revokeAuthorization() {
    enabled.value = false
    authorized.value = false
    authAt.value = null
    if (!import.meta.client) return
    try {
      localStorage.setItem(FOUNDER_MODE_KEY, '0')
      localStorage.setItem(FOUNDER_AUTH_KEY, '0')
      localStorage.removeItem(FOUNDER_AUTH_AT_KEY)
    } catch {
      // noop
    }
  }

  return {
    enabled,
    authorized,
    authAt,
    active,
    authorizedUntil,
    loadFounderMode,
    setFounderMode,
    setAuthorized,
    toggleFounderMode,
    revokeAuthorization,
  }
}
