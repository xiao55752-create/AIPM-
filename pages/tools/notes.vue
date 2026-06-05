<script setup lang="ts">
const NOTES_KEY = 'apgc-notes-template-v1'

const form = reactive({
  week: '',
  theme: '',
  input: '',
  output: '',
  reflection: '',
  nextAction: '',
})

const savedAt = ref('')
const copied = ref(false)

onMounted(() => {
  if (!import.meta.client) return
  try {
    const raw = localStorage.getItem(NOTES_KEY)
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
  localStorage.setItem(NOTES_KEY, JSON.stringify({ form: { ...form }, savedAt: savedAt.value }))
}

const markdown = computed(() =>
  [
    '# 学习笔记（成长营）',
    '',
    `- 周次：${form.week || '—'}`,
    `- 主题：${form.theme || '—'}`,
    '',
    '## 输入',
    form.input || '—',
    '',
    '## 输出',
    form.output || '—',
    '',
    '## 复盘',
    form.reflection || '—',
    '',
    '## 下周动作',
    form.nextAction || '—',
    '',
  ].join('\n'),
)

function exportMarkdown() {
  if (!import.meta.client) return
  const blob = new Blob([markdown.value], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `growth-notes-${Date.now()}.md`
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
      <h1 class="text-2xl font-bold text-primary">学习笔记模板</h1>
      <p class="mt-2 text-sm text-slate-600">按“输入 -> 输出 -> 复盘 -> 下周动作”沉淀每周学习成果。</p>
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
          {{ copied ? '已复制' : '复制内容' }}
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
            placeholder="例如：W6"
            class="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-accent focus:outline-none"
          />
        </label>
        <label class="text-sm">
          <span class="mb-1 block font-medium text-slate-700">主题</span>
          <input
            v-model="form.theme"
            type="text"
            placeholder="例如：Eval 指标设计"
            class="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-accent focus:outline-none"
          />
        </label>
        <label class="text-sm">
          <span class="mb-1 block font-medium text-slate-700">输入（今天学了什么）</span>
          <textarea
            v-model="form.input"
            rows="4"
            class="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-accent focus:outline-none"
          />
        </label>
        <label class="text-sm">
          <span class="mb-1 block font-medium text-slate-700">输出（产出了什么）</span>
          <textarea
            v-model="form.output"
            rows="4"
            class="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-accent focus:outline-none"
          />
        </label>
        <label class="text-sm">
          <span class="mb-1 block font-medium text-slate-700">复盘（做得好/不足）</span>
          <textarea
            v-model="form.reflection"
            rows="4"
            class="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-accent focus:outline-none"
          />
        </label>
        <label class="text-sm">
          <span class="mb-1 block font-medium text-slate-700">下周一件事</span>
          <textarea
            v-model="form.nextAction"
            rows="3"
            class="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-accent focus:outline-none"
          />
        </label>
      </div>
    </section>
  </div>
</template>
