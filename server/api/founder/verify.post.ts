import { readBody } from 'h3'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const body = await readBody<{ password?: string }>(event)

  const expected = String(config.founderModePassword || '').trim()
  if (!expected) {
    return {
      ok: true,
      requirePassword: false,
      verified: true,
      message: '未配置口令，当前为开放模式',
    }
  }

  const input = String(body?.password || '').trim()
  if (!input) {
    return {
      ok: true,
      requirePassword: true,
      verified: false,
      message: '请输入口令',
    }
  }

  const verified = input === expected
  return {
    ok: true,
    requirePassword: true,
    verified,
    message: verified ? '验证成功' : '口令错误',
  }
})
