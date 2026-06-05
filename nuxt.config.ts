// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
  modules: ['@nuxtjs/tailwindcss'],
  css: ['~/assets/css/main.css'],
  app: {
    head: {
      title: 'AI 产品成长营',
      meta: [
        {
          name: 'description',
          content:
            '十年政企AI产品总监沉淀的成长操作系统：5分钟自测、个性化12周路径、决策清单与脱敏实战案例。',
        },
      ],
      htmlAttrs: { lang: 'zh-CN' },
    },
  },
  tailwindcss: {
    configPath: 'tailwind.config.ts',
  },
  runtimeConfig: {
    founderModePassword: '',
    wecomWebhookUrl: process.env.NUXT_WECOM_WEBHOOK_URL || '',
    mailWebhookUrl: process.env.NUXT_MAIL_WEBHOOK_URL || '',
    slaAlertWebhookUrl: process.env.NUXT_SLA_ALERT_WEBHOOK_URL || '',
    notifyAutoDispatch: process.env.NUXT_NOTIFY_AUTO_DISPATCH !== 'false',
    public: {
      paymentLinks: {
        basic: '',
        pro: '',
        team: '',
      },
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'http://127.0.0.1:3030',
    },
  },
})
