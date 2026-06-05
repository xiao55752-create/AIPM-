<script setup lang="ts">
const NARRATIVE_KEY = 'apgc-narrative-template-v1'

const form = reactive({
  project: '',
  period: '',
  role: '',
  background: '',
  challenge: '',
  goal: '',
  action1: '',
  action2: '',
  action3: '',
  result: '',
  metric1: '',
  metric2: '',
  reflection: '',
})

const savedAt = ref('')
const copied = ref(false)

onMounted(() => {
  if (!import.meta.client) return
  try {
    const raw = localStorage.getItem(NARRATIVE_KEY)
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
  localStorage.setItem(NARRATIVE_KEY, JSON.stringify({ form: { ...form }, savedAt: savedAt.value }))
}

const starNarrative = computed(() =>
  [
    `S（背景）：${form.background || '补充项目背景和业务上下文。'}`,
    `T（任务）：${form.challenge || '补充你负责解决的核心问题。'}`,
    `A（行动）：${[form.action1, form.action2, form.action3].filter(Boolean).join('；') || '补充关键行动与取舍。'}`,
    `R（结果）：${form.result || '补充量化结果。'}${form.metric1 ? `；指标1：${form.metric1}` : ''}${form.metric2 ? `；指标2：${form.metric2}` : ''}`,
  ].join('\n'),
)

const resumeBullets = computed(() => {
  const project = form.project || 'AI 项目'
  const role = form.role || '产品负责人'
  const action = [form.action1, form.action2, form.action3].filter(Boolean).join('，')
  const metricPart = [form.metric1, form.metric2].filter(Boolean).join('，')
  return [
    `- 作为${role}，主导${project}，围绕“${form.challenge || '核心业务问题'}”完成方案设计与推进。`,
    `- 推动${action || '关键策略落地与跨团队协同'}，建立可复用执行机制。`,
    `- 最终实现${form.result || '业务目标达成'}${metricPart ? `，关键指标：${metricPart}` : ''}。`,
  ].join('\n')
})

const markdown = computed(() =>
  [
    '# 战役叙事 / 述职模板',
    '',
    `- 项目：${form.project || '—'}`,
    `- 周期：${form.period || '—'}`,
    `- 角色：${form.role || '—'}`,
    '',
    '## STAR 叙事',
    starNarrative.value,
    '',
    '## 简历条目（3 条）',
    resumeBullets.value,
    '',
    '## 复盘',
    form.reflection || '—',
    '',
  ].join('\n'),
)

function exportMarkdown() {
  if (!import.meta.client) return
  const blob = new Blob([markdown.value], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `narrative-template-${Date.now()}.md`
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
      <h1 class="text-2xl font-bold text-primary">战役叙事 / 述职模板</h1>
      <p class="mt-2 text-sm text-slate-600">把项目讲成结果：STAR 叙事 + 简历条目，一次填写双场景复用。</p>
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
          <span class="mb-1 block font-medium text-slate-700">项目名称</span>
          <input
            v-model="form.project"
            type="text"
            placeholder="例如：政企投标智能体"
            class="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-accent focus:outline-none"
          />
        </label>
        <div class="grid gap-4 sm:grid-cols-2">
          <label class="text-sm">
            <span class="mb-1 block font-medium text-slate-700">项目周期</span>
            <input
              v-model="form.period"
              type="text"
              placeholder="例如：2025 Q3"
              class="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-accent focus:outline-none"
            />
          </label>
          <label class="text-sm">
            <span class="mb-1 block font-medium text-slate-700">我的角色</span>
            <input
              v-model="form.role"
              type="text"
              placeholder="例如：AI 产品总监"
              class="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-accent focus:outline-none"
            />
          </label>
        </div>
        <label class="text-sm">
          <span class="mb-1 block font-medium text-slate-700">背景（S）</span>
          <textarea
            v-model="form.background"
            rows="3"
            class="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-accent focus:outline-none"
          />
        </label>
        <label class="text-sm">
          <span class="mb-1 block font-medium text-slate-700">任务/挑战（T）</span>
          <textarea
            v-model="form.challenge"
            rows="3"
            class="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-accent focus:outline-none"
          />
        </label>
        <div class="grid gap-4 sm:grid-cols-3">
          <label class="text-sm">
            <span class="mb-1 block font-medium text-slate-700">行动1（A）</span>
            <textarea
              v-model="form.action1"
              rows="3"
              class="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-accent focus:outline-none"
            />
          </label>
          <label class="text-sm">
            <span class="mb-1 block font-medium text-slate-700">行动2（A）</span>
            <textarea
              v-model="form.action2"
              rows="3"
              class="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-accent focus:outline-none"
            />
          </label>
          <label class="text-sm">
            <span class="mb-1 block font-medium text-slate-700">行动3（A）</span>
            <textarea
              v-model="form.action3"
              rows="3"
              class="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-accent focus:outline-none"
            />
          </label>
        </div>
        <label class="text-sm">
          <span class="mb-1 block font-medium text-slate-700">结果（R）</span>
          <textarea
            v-model="form.result"
            rows="3"
            class="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-accent focus:outline-none"
          />
        </label>
        <div class="grid gap-4 sm:grid-cols-2">
          <label class="text-sm">
            <span class="mb-1 block font-medium text-slate-700">指标1（可量化）</span>
            <input
              v-model="form.metric1"
              type="text"
              placeholder="例如：采纳率 42%->65%"
              class="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-accent focus:outline-none"
            />
          </label>
          <label class="text-sm">
            <span class="mb-1 block font-medium text-slate-700">指标2（可量化）</span>
            <input
              v-model="form.metric2"
              type="text"
              placeholder="例如：成本下降 18%"
              class="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-accent focus:outline-none"
            />
          </label>
        </div>
        <label class="text-sm">
          <span class="mb-1 block font-medium text-slate-700">复盘</span>
          <textarea
            v-model="form.reflection"
            rows="3"
            class="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-accent focus:outline-none"
          />
        </label>
      </div>
    </section>

    <section class="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 class="text-lg font-semibold text-primary">实时预览</h2>
      <pre class="mt-3 whitespace-pre-wrap rounded-lg bg-slate-50 p-4 text-xs text-slate-700">{{ markdown }}</pre>
    </section>
  </div>
</template>
