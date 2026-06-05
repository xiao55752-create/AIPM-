<script setup lang="ts">
import { trackEvent } from '~/lib/analytics'

const WAITLIST_KEY = 'apgc-camp-waitlist-v1'
const route = useRoute()
const teamInquiry = ref(false)

const form = reactive({
  name: '',
  contact: '',
  currentRole: '',
  goal: '',
})

const records = ref<
  { id?: string; name: string; contact: string; currentRole: string; goal: string; createdAt: string }[]
>([])
const submitted = ref(false)
const submitError = ref('')

onMounted(() => {
  if (!import.meta.client) return
  if (route.query.plan === 'team') {
    teamInquiry.value = true
    form.goal = form.goal || '企业/团队席位咨询（5人起）'
    trackEvent('camp_team_inquiry_view')
  }
  loadWaitlist()
})

async function loadWaitlist() {
  try {
    const res = await $fetch<{
      ok: boolean
      records: { id: string; name: string; contact: string; currentRole: string; goal: string; createdAt: string }[]
    }>('/api/waitlist')
    records.value = res.records.map((r) => ({
      ...r,
      createdAt: new Date(r.createdAt).toLocaleString('zh-CN'),
    }))
    if (import.meta.client) {
      localStorage.setItem(WAITLIST_KEY, JSON.stringify(records.value))
    }
  } catch {
    try {
      const raw = localStorage.getItem(WAITLIST_KEY)
      if (raw) records.value = JSON.parse(raw)
    } catch {
      // noop
    }
  }
}

async function submitWaitlist() {
  if (!import.meta.client) return
  if (!form.name.trim() || !form.contact.trim()) return
  submitError.value = ''
  try {
    const payload = {
      name: form.name.trim(),
      contact: form.contact.trim(),
      currentRole: form.currentRole.trim(),
      goal: form.goal.trim(),
      source: teamInquiry.value ? 'camp-team-inquiry' : 'camp-page',
      campaign: teamInquiry.value ? 'team' : 'default',
    }
    await $fetch('/api/waitlist', { method: 'POST', body: payload })
    trackEvent('camp_waitlist_submit', {
      hasRole: !!payload.currentRole,
      hasGoal: !!payload.goal,
      team: teamInquiry.value,
    })
    form.name = ''
    form.contact = ''
    form.currentRole = ''
    form.goal = ''
    submitted.value = true
    await loadWaitlist()
    setTimeout(() => {
      submitted.value = false
    }, 1600)
  } catch {
    submitError.value = '提交失败，请稍后再试'
  }
}

function exportWaitlistCsv() {
  if (!import.meta.client || !records.value.length) return
  const header = ['提交时间', '姓名', '联系方式', '当前岗位', '目标']
  const lines = [header.join(',')]
  records.value.forEach((r) => {
    const row = [r.createdAt, r.name, r.contact, r.currentRole, r.goal].map(
      (v) => `"${String(v).replaceAll('"', '""')}"`,
    )
    lines.push(row.join(','))
  })
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `camp-waitlist-${Date.now()}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  trackEvent('camp_waitlist_export_csv', { count: records.value.length })
}
</script>

<template>
  <div class="mx-auto max-w-4xl space-y-8">
    <section class="glass-panel rounded-2xl border border-slate-200 p-6">
      <p class="inline-flex rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs text-primary">
        第 1 期 · 12 周实战陪跑
      </p>
      <h1 class="mt-3 text-3xl font-bold text-primary sm:text-4xl">AI 产品成长营</h1>
      <p class="mt-3 text-slate-600">限 30 人，每月直播答疑 + 社群同伴 + 作业反馈。目标是做出可复用的工作成果。</p>
      <div class="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
        <span class="rounded-full bg-white px-2.5 py-1">真实项目导向</span>
        <span class="rounded-full bg-white px-2.5 py-1">每周1个交付物</span>
        <span class="rounded-full bg-white px-2.5 py-1">可直接用于求职/晋升</span>
      </div>
    </section>

    <section class="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 class="font-semibold text-primary">为什么选成长营（对标慕课/起点）</h2>
      <div class="mt-4 grid gap-3 sm:grid-cols-3 text-sm">
        <article class="rounded-xl border border-slate-100 bg-slate-50 p-4">
          <p class="font-medium text-primary">10 分钟知道该干什么</p>
          <p class="mt-1 text-xs text-slate-600">自测驱动路径，不等 100 小时录播才上手。</p>
        </article>
        <article class="rounded-xl border border-slate-100 bg-slate-50 p-4">
          <p class="font-medium text-primary">3 个项目 Lab 可写简历</p>
          <p class="mt-1 text-xs text-slate-600">MVP / RAG / Eval，对标竞品 6 大实战项目。</p>
        </article>
        <article class="rounded-xl border border-slate-100 bg-slate-50 p-4">
          <p class="font-medium text-primary">工具自动陪跑</p>
          <p class="mt-1 text-xs text-slate-600">任务池 + 清单 + 成果页，执行闭环可追踪。</p>
        </article>
      </div>
    </section>

    <section class="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 class="font-semibold text-primary">主理人背书</h2>
      <div class="mt-3 flex gap-4">
        <div class="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
          陈
        </div>
        <div class="text-sm text-slate-700">
          <p class="font-medium text-primary">陈总监 · 十年政企 AI 产品负责人</p>
          <p class="mt-1 text-slate-600">
            沉淀自真实 ToG / ToB AI 落地：从场景选型、RAG/Agent 架构到 Eval 与组织推进。不讲空理论，只给可执行模板。
          </p>
          <ul class="mt-2 list-disc pl-5 text-xs text-slate-600 space-y-1">
            <li>决策清单、指标看板、战役叙事等工具均来自一线实践</li>
            <li>每月直播答疑（录播回放）</li>
            <li>模板级作业反馈（非 1v1 私教，但可升级）</li>
          </ul>
        </div>
      </div>
    </section>

    <section class="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-6">
      <h2 class="font-semibold text-primary">学员路径样例</h2>
      <div class="mt-3 grid gap-3 md:grid-cols-3 text-sm">
        <article class="rounded-xl border border-indigo-100 bg-white p-4">
          <p class="text-xs text-slate-500">路径 A · 传统 PM 转岗</p>
          <p class="mt-1 font-medium text-primary">自测 → 试学 7 天 → 项目 Lab MVP</p>
          <p class="mt-1 text-xs text-slate-600">产出公开成果页 + 求职包，对标起点「项目包装」。</p>
        </article>
        <article class="rounded-xl border border-indigo-100 bg-white p-4">
          <p class="text-xs text-slate-500">路径 B · 在职 AI PM</p>
          <p class="mt-1 font-medium text-primary">Eval Lab → RAG 试点 → 周复盘</p>
          <p class="mt-1 text-xs text-slate-600">补强评测闭环，对标 MSUP「评测体系构建」模块。</p>
        </article>
        <article class="rounded-xl border border-indigo-100 bg-white p-4">
          <p class="text-xs text-slate-500">路径 C · 负责人 / 总监</p>
          <p class="mt-1 font-medium text-primary">清单评审 → 指标看板 → 团队席位</p>
          <p class="mt-1 text-xs text-slate-600">组织级复盘机制，可定制 KPI 与 ops 看板。</p>
        </article>
      </div>
      <div class="mt-4 flex flex-wrap gap-4">
        <NuxtLink to="/tools/project-lab" class="text-sm font-medium text-accent hover:underline">
          预览项目 Lab 模板 →
        </NuxtLink>
        <NuxtLink to="/tools/showcase" class="text-sm font-medium text-accent hover:underline">
          路演 5 分钟 Demo Rubric →
        </NuxtLink>
      </div>
    </section>

    <div class="grid gap-4 md:grid-cols-2">
      <section class="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-700">
        <h2 class="font-semibold text-primary">适合人群</h2>
        <ul class="mt-3 list-disc pl-5 space-y-1">
          <li>3～10 年经验，AI / 智能化产品经理</li>
          <li>已完成自测，匹配度「高」或「中」</li>
          <li>愿意每周完成 1 个可交付物</li>
        </ul>
      </section>

      <section class="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-700">
        <h2 class="font-semibold text-primary">内容包含</h2>
        <ul class="mt-3 list-disc pl-5 space-y-1">
          <li>12 周打卡与作业指引</li>
          <li>每月 1 次直播答疑（录播）</li>
          <li>飞书 / 社群（开营时通知）</li>
          <li>模板批改（轻量）</li>
        </ul>
      </section>
    </div>

    <section class="rounded-2xl border border-accent/20 bg-accent-muted/40 p-5 text-sm">
      <p><strong>首发价：</strong>399～699 元 / 期（标准/进阶）· 团队席位联系咨询</p>
      <p class="mt-2 text-slate-600">试学 7 天不满意可全额退（未使用进阶答疑额度）。不承诺就业与晋升。</p>
      <p class="mt-1 text-xs text-slate-500">请先完成免费自测，匹配度「高/中」再报名效率最高。</p>
    </section>

    <section id="waitlist" class="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 class="font-semibold text-primary mb-2">
        {{ teamInquiry ? '企业团报咨询' : '加入等候名单' }}
      </h2>
      <p v-if="teamInquiry" class="mb-3 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-primary">
        团队席位：5 人起 · 定制 KPI · 组织级复盘 · 可选内训节奏。填写后由主理人跟进。
      </p>
      <p class="text-sm text-slate-600 mb-4">
        填写后会保存在本机，可导出 CSV 统一跟进（后续可接入飞书表单/CRM）。
      </p>
      <div class="grid gap-3 sm:grid-cols-2">
        <input
          v-model="form.name"
          type="text"
          placeholder="姓名"
          class="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-accent focus:outline-none"
        />
        <input
          v-model="form.contact"
          type="text"
          placeholder="联系方式（微信/手机号/邮箱）"
          class="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-accent focus:outline-none"
        />
        <input
          v-model="form.currentRole"
          type="text"
          placeholder="当前岗位（可选）"
          class="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-accent focus:outline-none"
        />
        <input
          v-model="form.goal"
          type="text"
          placeholder="目标（例如：转 AI 总监）"
          class="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-accent focus:outline-none"
        />
      </div>
      <div class="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          class="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
          @click="submitWaitlist"
        >
          提交报名
        </button>
        <button
          type="button"
          class="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
          :disabled="!records.length"
          :class="!records.length ? 'opacity-50 cursor-not-allowed' : ''"
          @click="exportWaitlistCsv"
        >
          导出报名 CSV
        </button>
        <p v-if="submitted" class="text-sm text-emerald-700">提交成功</p>
        <p v-if="submitError" class="text-sm text-rose-600">{{ submitError }}</p>
        <p class="text-xs text-slate-500">当前本机已记录：{{ records.length }} 条</p>
      </div>
    </section>

    <div class="flex flex-wrap gap-3">
      <NuxtLink
        to="/camp/pay"
        class="rounded-lg border border-accent px-5 py-2.5 text-sm font-medium text-accent hover:bg-accent-muted/20"
      >
        报名与支付入口
      </NuxtLink>
      <NuxtLink
        to="/assessment"
        class="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-accent-hover"
      >
        先做免费自测
      </NuxtLink>
      <NuxtLink
        to="/tools/checklist"
        class="rounded-lg border border-primary px-5 py-2.5 text-sm font-medium text-primary"
      >
        体验决策清单
      </NuxtLink>
    </div>
  </div>
</template>
