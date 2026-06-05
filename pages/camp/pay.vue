<script setup lang="ts">
import { trackEvent } from '~/lib/analytics'
import { PAY_CTA_FORCE_VARIANT_KEY } from '~/lib/ab-experiment'

const config = useRuntimeConfig()
const route = useRoute()
const activeCompare = ref<'basic' | 'pro' | 'team'>('basic')
const PAY_CTA_VARIANT_KEY = 'apgc-pay-cta-variant'
const payVariant = ref<'A' | 'B'>('A')

const plans = computed(() => [
  {
    id: 'basic',
    name: '标准席位',
    price: '399 元',
    desc: '适合个人成长冲刺，含 12 周任务与模板。',
    audience: '1-3 年 PM / 转 AI 方向',
    output: '周任务执行记录 + 清单初稿 + 1 份成果包',
    link: config.public.paymentLinks.basic || '',
  },
  {
    id: 'pro',
    name: '进阶席位',
    price: '699 元',
    desc: '含直播答疑优先提问与作业反馈。',
    audience: '3-10 年 PM / 负责人',
    output: '策略级清单 + 复盘模板 + 面试/简历增强稿',
    link: config.public.paymentLinks.pro || '',
  },
  {
    id: 'team',
    name: '团队席位',
    price: '联系咨询',
    desc: '适合企业/团队内训，支持定制节奏。',
    audience: '企业团队 / 管理层',
    output: '团队训练营 + 指标看板 + 组织级复盘机制',
    link: config.public.paymentLinks.team || '',
  },
])

onMounted(() => {
  if (!import.meta.client) return
  const forced = localStorage.getItem(PAY_CTA_FORCE_VARIANT_KEY)
  if (forced === 'A' || forced === 'B') {
    payVariant.value = forced
    localStorage.setItem(PAY_CTA_VARIANT_KEY, forced)
    trackEvent('pay_ab_variant_exposed', {
      variant: forced,
      from: String(route.query.from || 'unknown'),
      forced: true,
    })
    return
  }
  const fromQuery = String(route.query.ab || '').toUpperCase()
  const existing = localStorage.getItem(PAY_CTA_VARIANT_KEY)
  const variant =
    fromQuery === 'B'
      ? 'B'
      : fromQuery === 'A'
        ? 'A'
        : existing === 'B'
          ? 'B'
          : existing === 'A'
            ? 'A'
            : Math.random() < 0.5
              ? 'A'
              : 'B'
  localStorage.setItem(PAY_CTA_VARIANT_KEY, variant)
  payVariant.value = variant
  trackEvent('pay_ab_variant_exposed', {
    variant,
    from: String(route.query.from || 'unknown'),
    forced: false,
  })
})

const payHeadline = computed(() =>
  payVariant.value === 'A' ? '成长营报名与支付' : '选择最适合你的成长方案',
)
const paySubline = computed(() =>
  payVariant.value === 'A'
    ? '当前为支付入口版。若未配置支付链接，将展示“即将开放支付”提示。'
    : '先试学再付费：对比方案产出后再决定，降低决策风险。',
)

function openCompare(id: 'basic' | 'pro' | 'team') {
  activeCompare.value = id
  trackEvent('plan_compare_click', { plan: id, from: String(route.query.from || 'unknown'), variant: payVariant.value })
}

function openPay(id: 'basic' | 'pro' | 'team', link: string) {
  trackEvent('pay_click', { plan: id, from: String(route.query.from || 'unknown'), variant: payVariant.value })
  if (import.meta.client && link) {
    window.open(link, '_blank', 'noopener,noreferrer')
  }
}

function submitTeamWaitlist() {
  if (!import.meta.client) return
  trackEvent('pay_team_inquiry_click', { from: String(route.query.from || 'unknown') })
  navigateTo('/camp?plan=team#waitlist')
}
</script>

<template>
  <div class="mx-auto max-w-4xl space-y-6">
    <section class="glass-panel rounded-2xl border border-slate-200 p-6">
      <h1 class="text-2xl font-bold text-primary">{{ payHeadline }}</h1>
      <p class="mt-2 text-sm text-slate-600">{{ paySubline }}</p>
      <p class="mt-1 text-xs text-slate-500">可在环境变量里配置 paymentLinks.basic / pro / team。</p>
      <p class="mt-1 text-xs text-slate-500">当前文案版本：{{ payVariant }}</p>
    </section>

    <section class="grid gap-4 sm:grid-cols-3">
      <article
        v-for="plan in plans"
        :key="plan.id"
        class="rounded-2xl border border-slate-200 bg-white p-5"
      >
        <h2 class="text-lg font-semibold text-primary">{{ plan.name }}</h2>
        <p class="mt-1 text-xl font-bold text-accent">{{ plan.price }}</p>
        <p class="mt-2 text-sm text-slate-600">{{ plan.desc }}</p>
        <p class="mt-2 text-xs text-slate-500">适合人群：{{ plan.audience }}</p>
        <p class="mt-1 text-xs text-slate-500">预期产出：{{ plan.output }}</p>
        <button
          type="button"
          class="mt-3 rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
          @click="openCompare(plan.id as 'basic' | 'pro' | 'team')"
        >
          查看方案对比
        </button>
        <a
          v-if="plan.link"
          href="#"
          class="mt-4 inline-block rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
          @click.prevent="openPay(plan.id as 'basic' | 'pro' | 'team', plan.link)"
        >
          立即支付
        </a>
        <span
          v-else-if="plan.id === 'team'"
          class="mt-4 inline-block cursor-pointer rounded-lg border border-primary px-4 py-2 text-sm font-medium text-primary hover:bg-slate-50"
          @click="submitTeamWaitlist"
        >
          企业团报咨询
        </span>
        <span
          v-else
          class="mt-4 inline-block rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-500"
        >
          即将开放支付
        </span>
      </article>
    </section>

    <section class="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 class="text-lg font-semibold text-primary">信任与保障</h2>
      <ul class="mt-3 list-disc space-y-1 pl-5 text-xs text-slate-600">
        <li><strong>试学 7 天：</strong>报告页一键导入任务包，零成本验证执行节奏。</li>
        <li><strong>7 天退款：</strong>标准/进阶席位，试学期内未使用答疑额度可申请全额退。</li>
        <li><strong>成果可验证：</strong>项目 Lab / Eval Lab 可发布公开成果页，便于面试展示。</li>
        <li><strong>团队席位：</strong>支持 5 人起团报、定制 KPI、组织级 ops 看板（联系咨询）。</li>
        <li>支持花呗 / 对公发票（开营后按实际通道开通）。</li>
      </ul>
    </section>

    <section class="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 class="text-lg font-semibold text-primary">方案对比</h2>
      <p class="mt-1 text-xs text-slate-600">当前查看：{{ plans.find((p) => p.id === activeCompare)?.name }}</p>
      <div class="mt-3 grid gap-3 sm:grid-cols-3">
        <article
          v-for="plan in plans"
          :key="`compare-${plan.id}`"
          class="rounded-xl border p-3"
          :class="activeCompare === plan.id ? 'border-accent bg-accent-muted/20' : 'border-slate-200 bg-slate-50'"
        >
          <p class="text-sm font-semibold text-primary">{{ plan.name }}</p>
          <p class="mt-1 text-xs text-slate-600">{{ plan.audience }}</p>
          <p class="mt-1 text-xs text-slate-600">{{ plan.output }}</p>
        </article>
      </div>
      <ul class="mt-3 list-disc space-y-1 pl-5 text-xs text-slate-600">
        <li>常见问题：付款后会收到对应节奏的任务引导与执行入口。</li>
        <li>常见问题：若暂未开放支付，可先走“试学 7 天”验证执行节奏。</li>
        <li>常见问题：团队席位支持定制 KPI、复盘机制和主理人看板。</li>
      </ul>
    </section>
  </div>
</template>
