<script setup lang="ts">
const WEEKLY_KEY = 'apgc-weekly-report-v1'

const form = reactive({
  week: '',
  project: '',
  progress: '',
  metrics: '',
  risks: '',
  asks: '',
  nextPlan: '',
})

const savedAt = ref('')
const copied = ref(false)

onMounted(() => {
  if (!import.meta.client) return
  try {
    const raw = localStorage.getItem(WEEKLY_KEY)
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
  localStorage.setItem(WEEKLY_KEY, JSON.stringify({ form: { ...form }, savedAt: savedAt.value }))
}

const markdown = computed(() =>
  [
    '# 周报一页纸',
    '',
    `- 周次：${form.week || '—'}`,
    `- 项目：${form.project || '—'}`,
    '',
    '## 本周进展',
    form.progress || '—',
    '',
    '## 关键指标',
    form.metrics || '—',
    '',
    '## 风险与阻塞',
    form.risks || '—',
    '',
    '## 需要支持',
    form.asks || '—',
    '',
    '## 下周计划',
    form.nextPlan || '—',
    '',
  ].join('\n'),
)

function exportMarkdown() {
  if (!import.meta.client) return
  const blob = new Blob([markdown.value], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `weekly-report-${Date.now()}.md`
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
      <h1 class="text-2xl font-bold text-primary">周报一页纸模板</h1>
      <p class="mt-2 text-sm text-slate-600">用同一结构同步老板/团队，突出结果、风险和下周动作。</p>
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
          {{ copied ? '已复制' : '复制周报' }}
        </button>
        <p v-if="savedAt" class="text-xs text-slate-500">上次保存：{{ savedAt }}</p>
      </div>
    </section>

    <section class="rounded-2xl border border-slate-200 bg-white p-6">
      <div class="grid gap-4">
        <label class="text-sm">
          <span class="mb-1 block font-medium text-slate-700">周次</span>
          <input
            v-model="form.week"
            type="text"
            placeholder="例如：2026-W23"
            class="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-accent focus:outline-none"
          />
        </label>
        <label class="text-sm">
          <span class="mb-1 block font-medium text-slate-700">项目/战役</span>
          <input
            v-model="form.project"
            type="text"
            placeholder="例如：招投标智能体试点"
            class="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-accent focus:outline-none"
          />
        </label>
        <label class="text-sm">
          <span class="mb-1 block font-medium text-slate-700">本周进展</span>
          <textarea
            v-model="form.progress"
            rows="4"
            class="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-accent focus:outline-none"
          />
        </label>
        <label class="text-sm">
          <span class="mb-1 block font-medium text-slate-700">关键指标</span>
          <textarea
            v-model="form.metrics"
            rows="3"
            placeholder="例如：召回率 71%→84%，采纳率 42%→65%"
            class="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-accent focus:outline-none"
          />
        </label>
        <label class="text-sm">
          <span class="mb-1 block font-medium text-slate-700">风险与阻塞</span>
          <textarea
            v-model="form.risks"
            rows="3"
            class="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-accent focus:outline-none"
          />
        </label>
        <label class="text-sm">
          <span class="mb-1 block font-medium text-slate-700">需要支持</span>
          <textarea
            v-model="form.asks"
            rows="3"
            class="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-accent focus:outline-none"
          />
        </label>
        <label class="text-sm">
          <span class="mb-1 block font-medium text-slate-700">下周计划</span>
          <textarea
            v-model="form.nextPlan"
            rows="3"
            class="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-accent focus:outline-none"
          />
        </label>
      </div>
    </section>
  </div>
</template>
