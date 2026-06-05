<script setup lang="ts">
import { CHECKLIST_STORAGE_KEY } from '~/lib/checklist'
import { corePathSteps } from '~/lib/core-path'
import { EXPORT_HISTORY_KEY, type ExportRecord } from '~/lib/export-history'

const ASSESSMENT_STORAGE_KEY = 'apgc-assessment'
const RESOURCE_PROGRESS_KEY = 'apgc-resource-progress-v1'
const WEEK_TASKS_KEY = 'apgc-week-tasks-v1'
const DEVICE_ID_KEY = 'apgc-device-id'
const CTA_VARIANT_KEY = 'apgc-cta-variant'
const SYNC_VERSION_KEY = 'apgc-sync-version'
const SYNC_UPDATED_AT_KEY = 'apgc-sync-updated-at'
const SYNC_PAYLOAD_VERSION = 2

const exportHistory = ref<ExportRecord[]>([])
const deviceId = ref('')
const backupImported = ref(false)
const cloudSynced = ref(false)
const cloudPulled = ref(false)
const advancedOpen = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

const primaryToolCards = [
  {
    step: '3 项目 Lab',
    title: '项目 Lab',
    desc: '把学习转成一个可写进简历的项目交付物。',
    to: '/tools/project-lab',
    cta: '开始项目',
    class: 'border-emerald-200 bg-emerald-50/50',
  },
  {
    step: '4 路演 Demo',
    title: '路演 Demo Rubric',
    desc: '准备 5 分钟项目讲解、录播链接和点评材料。',
    to: '/tools/showcase',
    cta: '准备路演',
    class: 'border-violet-200 bg-violet-50/50',
  },
  {
    step: '5 作业批改',
    title: '作业提交',
    desc: '提交项目或路演稿，拿到模板反馈或真人批改。',
    to: '/tools/homework',
    cta: '提交批改',
    class: 'border-amber-200 bg-amber-50/50',
  },
  {
    step: '6 成果页',
    title: '在线决策清单',
    desc: '补齐评审字段，导出求职包或公开成果页。',
    to: '/tools/checklist',
    cta: '整理成果',
    class: 'border-accent/40 bg-accent-muted/10',
  },
]

const backupKeys = [
  ASSESSMENT_STORAGE_KEY,
  CHECKLIST_STORAGE_KEY,
  EXPORT_HISTORY_KEY,
  RESOURCE_PROGRESS_KEY,
  WEEK_TASKS_KEY,
  DEVICE_ID_KEY,
  CTA_VARIANT_KEY,
]

onMounted(() => {
  if (!import.meta.client) return

  let existingId = localStorage.getItem(DEVICE_ID_KEY)
  if (!existingId) {
    existingId = crypto.randomUUID().split('-')[0].toUpperCase()
    localStorage.setItem(DEVICE_ID_KEY, existingId)
  }
  deviceId.value = existingId

  try {
    const raw = localStorage.getItem(EXPORT_HISTORY_KEY)
    if (!raw) return
    exportHistory.value = JSON.parse(raw) as ExportRecord[]
  } catch {
    // noop
  }
})

function roleLabel(role: 'ai-pm' | 'ai-director') {
  return role === 'ai-pm' ? 'AI PM' : 'AI 总监'
}

function exportBackup() {
  if (!import.meta.client) return
  const payload: Record<string, string> = {}
  backupKeys.forEach((key) => {
    const raw = localStorage.getItem(key)
    if (raw !== null) payload[key] = raw
  })

  const backup = {
    version: 1,
    exportedAt: new Date().toLocaleString('zh-CN'),
    deviceId: deviceId.value,
    payload,
  }
  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: 'application/json;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `apgc-backup-${Date.now()}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

async function pushToCloud() {
  if (!import.meta.client || !deviceId.value) return
  const payload: Record<string, string> = {}
  backupKeys.forEach((key) => {
    const raw = localStorage.getItem(key)
    if (raw !== null) payload[key] = raw
  })
  await $fetch('/api/sync/push', {
    method: 'POST',
    body: {
      deviceId: deviceId.value,
      payload,
      payloadVersion: SYNC_PAYLOAD_VERSION,
      clientUpdatedAt: localStorage.getItem(SYNC_UPDATED_AT_KEY) || '',
      conflictStrategy: 'last_write_wins',
    },
  })
  localStorage.setItem(SYNC_VERSION_KEY, String(SYNC_PAYLOAD_VERSION))
  localStorage.setItem(SYNC_UPDATED_AT_KEY, new Date().toISOString())
  cloudSynced.value = true
  setTimeout(() => {
    cloudSynced.value = false
  }, 1800)
}

async function pullFromCloud() {
  if (!import.meta.client || !deviceId.value) return
  const res = await $fetch<{
    ok: boolean
    found: boolean
    stale?: boolean
    record?: { payload: Record<string, string>; payloadVersion: number; updatedAt: string }
  }>('/api/sync/pull', {
    method: 'POST',
    body: {
      deviceId: deviceId.value,
      clientPayloadVersion: Number(localStorage.getItem(SYNC_VERSION_KEY) || 0),
    },
  })
  if (!res.found || !res.record) return

  Object.entries(res.record.payload).forEach(([key, value]) => {
    if (backupKeys.includes(key) && typeof value === 'string') {
      localStorage.setItem(key, value)
    }
  })
  localStorage.setItem(SYNC_VERSION_KEY, String(res.record.payloadVersion || SYNC_PAYLOAD_VERSION))
  localStorage.setItem(SYNC_UPDATED_AT_KEY, res.record.updatedAt || new Date().toISOString())
  cloudPulled.value = true
  setTimeout(() => {
    cloudPulled.value = false
  }, 1800)
  window.location.reload()
}

function openImportPicker() {
  fileInput.value?.click()
}

async function importBackup(event: Event) {
  if (!import.meta.client) return
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  try {
    const text = await file.text()
    const parsed = JSON.parse(text) as {
      payload?: Record<string, string>
    }
    if (!parsed.payload) return

    Object.entries(parsed.payload).forEach(([key, value]) => {
      if (backupKeys.includes(key) && typeof value === 'string') {
        localStorage.setItem(key, value)
      }
    })
    backupImported.value = true
    setTimeout(() => {
      backupImported.value = false
    }, 1800)
    window.location.reload()
  } catch {
    // noop
  } finally {
    target.value = ''
  }
}
</script>

<template>
  <div class="space-y-8">
    <CorePathRibbon />

    <section class="glass-panel rounded-2xl border border-slate-200 p-6">
      <h1 class="text-2xl font-bold text-primary">工具箱</h1>
      <p class="mt-2 text-slate-600">
        工具不再按功能堆放，而是按主路径排列：做项目、讲项目、拿反馈、沉淀成果。
      </p>
      <div class="mt-5 grid gap-2 md:grid-cols-6">
        <NuxtLink
          v-for="step in corePathSteps"
          :key="`tools-path-${step.id}`"
          :to="step.to"
          class="rounded-xl border border-slate-200 bg-white p-3 text-sm hover:border-accent"
        >
          <p class="text-xs text-slate-500">{{ step.label }}</p>
          <p class="mt-1 font-medium text-primary">{{ step.shortLabel }}</p>
        </NuxtLink>
      </div>
    </section>

    <section class="rounded-2xl border border-slate-200 bg-white p-6">
      <div class="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 class="font-semibold text-primary">主线工具</h2>
          <p class="mt-1 text-sm text-slate-500">按顺序使用即可完成“学习 → 项目 → 点评 → 成果”。</p>
        </div>
        <NuxtLink to="/resources" class="text-sm text-accent hover:underline">先回资源中心 →</NuxtLink>
      </div>
      <div class="grid gap-4 sm:grid-cols-2">
        <NuxtLink
          v-for="card in primaryToolCards"
          :key="card.to"
          :to="card.to"
          class="block rounded-2xl border p-5 hover:border-accent"
          :class="card.class"
        >
          <p class="text-xs font-medium text-accent">{{ card.step }}</p>
          <h3 class="mt-1 font-semibold text-primary">{{ card.title }}</h3>
          <p class="mt-2 text-sm text-slate-600">{{ card.desc }}</p>
          <p class="mt-3 text-sm font-medium text-accent">{{ card.cta }} →</p>
        </NuxtLink>
      </div>
      <NuxtLink
        to="/tools/eval-lab"
        class="mt-4 block rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 hover:border-accent"
      >
        <p class="font-medium text-primary">补充工具：Eval Lab</p>
        <p class="mt-1 text-sm text-slate-600">项目中需要评测闭环时使用：指标 → Badcase → 改进动作。</p>
      </NuxtLink>
    </section>

    <section class="rounded-2xl border border-slate-200 bg-white p-6">
      <div class="flex items-end justify-between gap-3">
        <h2 class="font-semibold text-primary">最近导出记录</h2>
        <NuxtLink to="/tools/checklist" class="text-sm text-accent hover:underline">去工具内回填 →</NuxtLink>
      </div>
      <ul v-if="exportHistory.length" class="mt-3 space-y-2">
        <li
          v-for="(item, idx) in exportHistory.slice(0, 3)"
          :key="`${item.at}-${idx}`"
          class="rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm"
        >
          <p class="font-medium text-primary">{{ item.project }}</p>
          <p class="mt-1 text-xs text-slate-500">
            {{ item.at }} · {{ roleLabel(item.role) }} · 评分 {{ item.score }}
          </p>
          <NuxtLink
            :to="`/tools/checklist?historyIdx=${idx}#export-history`"
            class="mt-2 inline-block text-xs text-accent hover:underline"
          >
            直达并回填此记录 →
          </NuxtLink>
        </li>
      </ul>
      <div v-else class="mt-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
        暂无导出记录。先在在线清单中导出一次“求职包”。
      </div>
    </section>

    <section class="rounded-2xl border border-slate-200 bg-white p-6">
      <div class="mb-3 flex items-end justify-between gap-3">
        <h2 class="font-semibold text-primary">数据备份中心</h2>
        <span class="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600">
          设备码：{{ deviceId }}
        </span>
      </div>
      <p class="text-sm text-slate-600">支持导出本机草稿、报告、打卡和任务状态，并在新设备一键恢复。</p>
      <div class="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          class="rounded-lg border border-primary px-4 py-2 text-sm font-medium text-primary hover:bg-slate-50"
          @click="exportBackup"
        >
          导出备份文件
        </button>
        <button
          type="button"
          class="rounded-lg border border-primary px-4 py-2 text-sm font-medium text-primary hover:bg-slate-50"
          @click="pushToCloud"
        >
          同步到云端（Beta）
        </button>
        <button
          type="button"
          class="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
          @click="pullFromCloud"
        >
          从云端恢复（Beta）
        </button>
        <button
          type="button"
          class="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
          @click="openImportPicker"
        >
          导入备份文件
        </button>
        <p v-if="cloudSynced" class="text-sm text-emerald-700">已同步到云端</p>
        <p v-if="cloudPulled" class="text-sm text-emerald-700">已从云端恢复，正在刷新...</p>
        <p v-if="backupImported" class="text-sm text-emerald-700">导入成功，正在刷新...</p>
        <input
          ref="fileInput"
          type="file"
          accept="application/json"
          class="hidden"
          @change="importBackup"
        />
      </div>
    </section>

    <section class="rounded-2xl border border-slate-200 bg-white p-6">
      <div class="flex items-center justify-between gap-3">
        <h2 class="font-semibold text-primary">模板工作区</h2>
        <button
          type="button"
          class="rounded-full border border-slate-300 px-3 py-1 text-xs text-slate-600 hover:bg-slate-50"
          @click="advancedOpen = !advancedOpen"
        >
          {{ advancedOpen ? '收起进阶工具' : '展开进阶工具' }}
        </button>
      </div>
      <p class="mt-1 text-xs text-slate-500">先做高频产出工具，再按需进入进阶模块。</p>
      <div class="mt-3 grid gap-3 sm:grid-cols-2">
        <NuxtLink to="/tools/project-lab" class="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 hover:border-accent">
          <p class="font-medium text-primary">项目 Lab（实战）</p>
          <p class="mt-1 text-sm text-slate-600">对标竞品项目实战，产出可写简历。</p>
        </NuxtLink>
        <NuxtLink to="/tools/eval-lab" class="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 hover:border-accent">
          <p class="font-medium text-primary">Eval Lab</p>
          <p class="mt-1 text-sm text-slate-600">评测闭环：指标、Badcase、报告。</p>
        </NuxtLink>
        <NuxtLink to="/tools/homework" class="rounded-xl border border-amber-100 bg-amber-50/50 p-4 hover:border-accent">
          <p class="font-medium text-primary">作业提交（模板反馈）</p>
          <p class="mt-1 text-sm text-slate-600">对标竞品作业点评，可升级真人批改。</p>
        </NuxtLink>
        <NuxtLink to="/tools/showcase" class="rounded-xl border border-violet-100 bg-violet-50/50 p-4 hover:border-accent">
          <p class="font-medium text-primary">路演 Demo Rubric</p>
          <p class="mt-1 text-sm text-slate-600">5 分钟路演自评 + 大纲复制，对标竞品结业 Demo。</p>
        </NuxtLink>
        <NuxtLink to="/tools/checklist" class="rounded-xl border border-accent/40 bg-accent-muted/10 p-4 hover:border-accent">
          <p class="font-medium text-primary">在线决策清单（高频）</p>
          <p class="mt-1 text-sm text-slate-600">立项与评审必备，支持导出求职包。</p>
        </NuxtLink>
        <NuxtLink to="/tools/weekly" class="rounded-xl border border-slate-100 bg-slate-50 p-4 hover:border-accent">
          <p class="font-medium text-primary">周报一页纸（高频）</p>
          <p class="mt-1 text-sm text-slate-600">面向老板/团队同步进度与风险。</p>
        </NuxtLink>
        <NuxtLink to="/tools/notes" class="rounded-xl border border-slate-100 bg-slate-50 p-4 hover:border-accent">
          <p class="font-medium text-primary">学习笔记模板</p>
          <p class="mt-1 text-sm text-slate-600">按周沉淀“输入 -> 输出 -> 复盘”闭环。</p>
        </NuxtLink>
      </div>
      <div v-if="advancedOpen" class="mt-3 grid gap-3 sm:grid-cols-2">
        <NuxtLink to="/tools/narrative" class="rounded-xl border border-slate-100 bg-slate-50 p-4 hover:border-accent">
          <p class="font-medium text-primary">战役叙事 / 述职模板</p>
          <p class="mt-1 text-sm text-slate-600">把项目讲成业务结果，支持 STAR 叙事与简历条目一键生成。</p>
        </NuxtLink>
        <NuxtLink to="/tools/metrics" class="rounded-xl border border-slate-100 bg-slate-50 p-4 hover:border-accent">
          <p class="font-medium text-primary">AI 指标看板</p>
          <p class="mt-1 text-sm text-slate-600">统一追踪召回率、采纳率、成本、效率，自动汇总健康分。</p>
        </NuxtLink>
      </div>
    </section>
  </div>
</template>
