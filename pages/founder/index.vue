<script setup lang="ts">
import { trackEvent } from '~/lib/analytics'

const {
  enabled: founderModeEnabled,
  authorized,
  active: founderMode,
  authorizedUntil,
  loadFounderMode,
  setAuthorized,
  setFounderMode,
  revokeAuthorization,
} = useFounderMode()

const password = ref('')
const authError = ref('')
const authInfo = ref('')
const verifying = ref(false)

onMounted(() => {
  loadFounderMode()
  detectOpenMode()
})

async function detectOpenMode() {
  try {
    const res = await $fetch<{
      ok: boolean
      requirePassword: boolean
      verified: boolean
    }>('/api/founder/verify', {
      method: 'POST',
      body: {},
    })
    if (!res.requirePassword && res.verified) {
      setAuthorized(true)
      authInfo.value = '当前未配置口令，已自动授权主理人模式。'
    }
  } catch {
    // noop
  }
}

async function verifyPassword() {
  authError.value = ''
  authInfo.value = ''
  verifying.value = true
  try {
    const res = await $fetch<{
      ok: boolean
      requirePassword: boolean
      verified: boolean
      message?: string
    }>('/api/founder/verify', {
      method: 'POST',
      body: { password: password.value },
    })
    if (res.verified) {
      setAuthorized(true)
      authInfo.value = '口令验证通过，可开启主理人模式。'
      password.value = ''
    } else {
      authError.value = res.message || '口令错误'
    }
  } catch {
    authError.value = '验证失败，请稍后重试'
  } finally {
    verifying.value = false
  }
}

function toggleMode() {
  if (founderMode.value) {
    setFounderMode(false)
  } else {
    if (!authorized.value) {
      authError.value = '请先通过口令验证后再开启。'
      return
    }
    setFounderMode(true)
  }
  trackEvent('founder_mode_toggle', { enabled: founderMode.value })
}

function revokeNow() {
  revokeAuthorization()
  authInfo.value = '已立即失效当前设备授权，请重新输入口令。'
  authError.value = ''
  trackEvent('founder_mode_revoke')
}
</script>

<template>
  <div class="space-y-8">
    <section class="glass-panel rounded-2xl border border-slate-200 p-6">
      <h1 class="text-2xl font-bold text-primary">关于主理人</h1>
      <p class="mt-2 text-slate-600">十年政企 AI 产品总监 · 陈总监</p>
      <p class="mt-4 text-slate-700 leading-relaxed">
        AI 学不完，但人可以不必乱学。这个站把我自用的自测、12 周节奏、决策清单公开出来；案例均来自真实经历（已脱敏）。
      </p>
    </section>

    <div class="rounded-2xl border border-slate-200 bg-white p-6 space-y-4 text-slate-700 leading-relaxed">
      <p>
        十年里，我从 ToB 数据与政务产品，走到 AI 平台与产业协同，再到政企智能体与合规交付——在项目里做判断、扛结果、建机制。
      </p>
      <p>
        经历过多省落地、累计创收过亿级；带队做校企协同与产业大脑，促成数千项技术合作，所在项目系列回款达数千万级；近年聚焦招投标场景的标书智能体，配合私有化与信创部署，解决数据不出域、过程可审计的要求。
      </p>
      <p>
        <strong>AI 学不完，但人可以不必乱学。</strong> 这个站把我自用的自测、12 周节奏、决策清单公开出来。我是这套方法的第一个使用者；案例库均来自真实经历（已脱敏）。
      </p>
      <p class="text-sm text-slate-500">完整职业履历可在职业沟通中提供。</p>
    </div>

    <section class="rounded-2xl border border-slate-200 bg-white p-6">
      <div class="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p class="text-sm font-medium text-primary">主理人模式</p>
        <p class="mt-1 text-xs text-slate-600">
          开启后显示运营看板、资源维护等运营入口；关闭则回到学员视角。
        </p>
        <p class="mt-1 text-xs text-slate-500">授权有效期为 12 小时，过期后需重新输入口令。</p>
        <div
          v-if="!authorized && !founderModeEnabled"
          class="mt-3 rounded-lg border border-slate-200 bg-white p-3"
        >
          <p class="text-xs text-slate-600">输入主理人口令后才能开启。</p>
          <div class="mt-2 flex flex-wrap items-center gap-2">
            <input
              v-model="password"
              type="password"
              placeholder="输入主理人口令"
              class="rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:border-accent focus:outline-none"
            />
            <button
              type="button"
              class="rounded-lg border border-primary px-3 py-1.5 text-xs text-primary hover:bg-slate-50"
              :disabled="verifying"
              @click="verifyPassword"
            >
              {{ verifying ? '验证中...' : '验证口令' }}
            </button>
          </div>
          <p v-if="authError" class="mt-2 text-xs text-rose-600">{{ authError }}</p>
          <p v-if="authInfo" class="mt-2 text-xs text-emerald-700">{{ authInfo }}</p>
        </div>
        <div class="mt-3 flex items-center gap-3">
          <span
            class="rounded-full px-2.5 py-1 text-xs"
            :class="founderMode ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-200 text-slate-600'"
          >
            {{ founderMode ? '已开启' : '已关闭' }}
          </span>
          <button
            type="button"
            class="rounded-lg border border-primary px-3 py-1.5 text-xs text-primary hover:bg-white"
            @click="toggleMode"
          >
            {{ founderMode ? '关闭主理人模式' : '开启主理人模式' }}
          </button>
          <button
            v-if="authorized || founderModeEnabled"
            type="button"
            class="rounded-lg border border-rose-300 px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50"
            @click="revokeNow"
          >
            立即失效当前设备授权
          </button>
        </div>
        <p v-if="authorizedUntil" class="mt-2 text-xs text-slate-500">本次授权截止：{{ authorizedUntil }}</p>
      </div>
      <h2 class="text-lg font-semibold text-primary">脱敏经历</h2>
      <ul class="mt-4 space-y-2 text-sm border-l-2 border-accent pl-4">
        <li><strong>2024.06～今</strong> 某政企 AI 科技公司 · 产品总监</li>
        <li><strong>2023～2024</strong> 产业服务 / 双创平台 · 产品总监</li>
        <li><strong>2020～2022</strong> AI 科技公司 · 高级产品经理</li>
        <li><strong>2016～2020</strong> 大数据 / 政务科技 · 产品经理</li>
      </ul>
    </section>

    <div class="flex flex-wrap gap-3">
      <NuxtLink
        to="/founder/cases"
        class="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-accent-hover"
      >
        实战案例库
      </NuxtLink>
      <NuxtLink
        to="/assessment"
        class="rounded-lg border border-primary px-5 py-2.5 text-sm font-medium text-primary"
      >
        开始自测
      </NuxtLink>
    </div>
  </div>
</template>
