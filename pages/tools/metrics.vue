<script setup lang="ts">
const METRICS_KEY = 'apgc-metrics-dashboard-v1'

const form = reactive({
  project: '',
  period: '',
  owner: '',
  recallBase: '',
  recallNow: '',
  adoptionBase: '',
  adoptionNow: '',
  costBase: '',
  costNow: '',
  efficiencyBase: '',
  efficiencyNow: '',
  notes: '',
})

const savedAt = ref('')
const copied = ref(false)

function toNum(v: string) {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function delta(now: string, base: string) {
  return toNum(now) - toNum(base)
}

const rows = computed(() => [
  {
    key: '召回率',
    base: toNum(form.recallBase),
    now: toNum(form.recallNow),
    unit: '%',
  },
  {
    key: '采纳率',
    base: toNum(form.adoptionBase),
    now: toNum(form.adoptionNow),
    unit: '%',
  },
  {
    key: '单次成本',
    base: toNum(form.costBase),
    now: toNum(form.costNow),
    unit: '元',
    reverseGood: true,
  },
  {
    key: '处理效率',
    base: toNum(form.efficiencyBase),
    now: toNum(form.efficiencyNow),
    unit: '%',
  },
])

const score = computed(() => {
  let s = 0
  rows.value.forEach((r) => {
    const d = r.now - r.base
    if (r.reverseGood) s += d <= 0 ? 25 : 10
    else s += d >= 0 ? 25 : 10
  })
  return Math.min(100, Math.max(0, s))
})

onMounted(() => {
  if (!import.meta.client) return
  try {
    const raw = localStorage.getItem(METRICS_KEY)
    if (!raw) return
    const data = JSON.parse(raw) as { form: typeof form; savedAt: string }
    Object.assign(form, data.form)
    savedAt.value = data.savedAt
  } catch {
    // noop
  }
})

function saveLocal() {
  if (!import.meta.client) return
  savedAt.value = new Date().toLocaleString('zh-CN')
  localStorage.setItem(METRICS_KEY, JSON.stringify({ form: { ...form }, savedAt: savedAt.value }))
}

const markdown = computed(() =>
  [
    '# AI 指标看板',
    '',
    `- 项目：${form.project || '—'}`,
    `- 周期：${form.period || '—'}`,
    `- 负责人：${form.owner || '—'}`,
    `- 健康分：${score.value}/100`,
    '',
    '## 指标变化',
    ...rows.value.map(
      (r) =>
        `- ${r.key}：${r.base}${r.unit} -> ${r.now}${r.unit}（变化 ${(
          r.now - r.base
        ).toFixed(1)}${r.unit}）`,
    ),
    '',
    '## 备注',
    form.notes || '—',
    '',
  ].join('\n'),
)

function exportMarkdown() {
  if (!import.meta.client) return
  const blob = new Blob([markdown.value], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `ai-metrics-dashboard-${Date.now()}.md`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

async function copyMarkdown() {
  if (!import.meta.client || !navigator.clipboard) return
  await navigator.clipboard.writeText(markdown.value)
  copied.value = true
  setTimeout(() => {
    copied.value = false
  }, 1500)
}
</script>

<template>
  <div class="space-y-6">
    <section class="glass-panel rounded-2xl border border-slate-200 p-6">
      <h1 class="text-2xl font-bold text-primary">AI 指标看板</h1>
      <p class="mt-2 text-sm text-slate-600">统一追踪召回率、采纳率、成本、效率，自动生成健康分与汇报文档。</p>
      <div class="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          class="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
          @click="saveLocal"
        >
          保存到本机
        </button>
        <button
          type="button"
          class="rounded-lg border border-primary px-4 py-2 text-sm font-medium text-primary hover:bg-slate-50"
          @click="exportMarkdown"
        >
          导出 Markdown
        </button>
        <button
          type="button"
          class="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
          @click="copyMarkdown"
        >
          {{ copied ? '已复制' : '复制看板' }}
        </button>
        <p v-if="savedAt" class="text-xs text-slate-500">上次保存：{{ savedAt }}</p>
      </div>
    </section>

    <section class="rounded-2xl border border-slate-200 bg-white p-6">
      <div class="grid gap-4 sm:grid-cols-3">
        <label class="text-sm">
          <span class="mb-1 block font-medium text-slate-700">项目名称</span>
          <input
            v-model="form.project"
            type="text"
            class="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-accent focus:outline-none"
          />
        </label>
        <label class="text-sm">
          <span class="mb-1 block font-medium text-slate-700">周期</span>
          <input
            v-model="form.period"
            type="text"
            placeholder="例如：2026-W23"
            class="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-accent focus:outline-none"
          />
        </label>
        <label class="text-sm">
          <span class="mb-1 block font-medium text-slate-700">负责人</span>
          <input
            v-model="form.owner"
            type="text"
            class="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-accent focus:outline-none"
          />
        </label>
      </div>
      <div class="mt-4 overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead>
            <tr class="text-left text-slate-500">
              <th class="px-3 py-2">指标</th>
              <th class="px-3 py-2">基线</th>
              <th class="px-3 py-2">当前</th>
              <th class="px-3 py-2">变化</th>
            </tr>
          </thead>
          <tbody>
            <tr class="border-t border-slate-100">
              <td class="px-3 py-2">召回率（%）</td>
              <td class="px-3 py-2"><input v-model="form.recallBase" type="number" class="w-24 rounded border border-slate-200 px-2 py-1" /></td>
              <td class="px-3 py-2"><input v-model="form.recallNow" type="number" class="w-24 rounded border border-slate-200 px-2 py-1" /></td>
              <td class="px-3 py-2" :class="delta(form.recallNow, form.recallBase) >= 0 ? 'text-emerald-700' : 'text-rose-600'">
                {{ delta(form.recallNow, form.recallBase).toFixed(1) }}%
              </td>
            </tr>
            <tr class="border-t border-slate-100">
              <td class="px-3 py-2">采纳率（%）</td>
              <td class="px-3 py-2"><input v-model="form.adoptionBase" type="number" class="w-24 rounded border border-slate-200 px-2 py-1" /></td>
              <td class="px-3 py-2"><input v-model="form.adoptionNow" type="number" class="w-24 rounded border border-slate-200 px-2 py-1" /></td>
              <td class="px-3 py-2" :class="delta(form.adoptionNow, form.adoptionBase) >= 0 ? 'text-emerald-700' : 'text-rose-600'">
                {{ delta(form.adoptionNow, form.adoptionBase).toFixed(1) }}%
              </td>
            </tr>
            <tr class="border-t border-slate-100">
              <td class="px-3 py-2">单次成本（元）</td>
              <td class="px-3 py-2"><input v-model="form.costBase" type="number" class="w-24 rounded border border-slate-200 px-2 py-1" /></td>
              <td class="px-3 py-2"><input v-model="form.costNow" type="number" class="w-24 rounded border border-slate-200 px-2 py-1" /></td>
              <td class="px-3 py-2" :class="delta(form.costNow, form.costBase) <= 0 ? 'text-emerald-700' : 'text-rose-600'">
                {{ delta(form.costNow, form.costBase).toFixed(1) }} 元
              </td>
            </tr>
            <tr class="border-t border-slate-100">
              <td class="px-3 py-2">处理效率（%）</td>
              <td class="px-3 py-2"><input v-model="form.efficiencyBase" type="number" class="w-24 rounded border border-slate-200 px-2 py-1" /></td>
              <td class="px-3 py-2"><input v-model="form.efficiencyNow" type="number" class="w-24 rounded border border-slate-200 px-2 py-1" /></td>
              <td class="px-3 py-2" :class="delta(form.efficiencyNow, form.efficiencyBase) >= 0 ? 'text-emerald-700' : 'text-rose-600'">
                {{ delta(form.efficiencyNow, form.efficiencyBase).toFixed(1) }}%
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="mt-4 rounded-lg border border-accent/30 bg-accent-muted/20 p-3">
        <p class="text-xs text-slate-500">健康分（规则版）</p>
        <p class="mt-1 text-2xl font-bold text-accent">{{ score }}/100</p>
      </div>
      <label class="mt-4 block text-sm">
        <span class="mb-1 block font-medium text-slate-700">备注</span>
        <textarea
          v-model="form.notes"
          rows="3"
          class="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-accent focus:outline-none"
        />
      </label>
    </section>

    <section class="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 class="text-lg font-semibold text-primary">实时预览</h2>
      <pre class="mt-3 whitespace-pre-wrap rounded-lg bg-slate-50 p-4 text-xs text-slate-700">{{ markdown }}</pre>
    </section>
  </div>
</template>
