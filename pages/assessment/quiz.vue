<script setup lang="ts">
import { questions } from '~/lib/questions'
import type { OptionKey } from '~/lib/questions'
import { trackEvent } from '~/lib/analytics'

const router = useRouter()
const { save } = useAssessment()
const QUIZ_DRAFT_KEY = 'apgc-assessment-quiz-draft-v1'
const optionOrder: OptionKey[] = ['A', 'B', 'C', 'D']

const scored = questions.filter((q) => !q.background)
const bg = questions.filter((q) => q.background)
const all = [...bg, ...scored]

const index = ref(0)
const answers = reactive<Record<string, OptionKey>>({})
const restored = ref(false)
const showChooseHint = ref(false)

const current = computed(() => all[index.value])
const answeredCount = computed(() => Object.keys(answers).length)
const progress = computed(() => Math.round(((index.value + 1) / all.length) * 100))
const remainingCount = computed(() => Math.max(0, all.length - (index.value + 1)))
const remainingMinutes = computed(() => Math.max(1, Math.ceil((remainingCount.value * 15) / 60)))
const selectedKey = computed<OptionKey | undefined>(() => {
  if (!current.value) return undefined
  return answers[current.value.id]
})

function persistDraft() {
  if (!import.meta.client) return
  const draft = {
    index: index.value,
    answers: { ...answers },
    updatedAt: new Date().toISOString(),
  }
  localStorage.setItem(QUIZ_DRAFT_KEY, JSON.stringify(draft))
}

function clearDraft() {
  if (!import.meta.client) return
  localStorage.removeItem(QUIZ_DRAFT_KEY)
}

function select(key: OptionKey) {
  if (!current.value) return
  showChooseHint.value = false
  answers[current.value.id] = key
  persistDraft()
}

function next() {
  if (!current.value) return
  const picked = answers[current.value.id]
  if (!picked) {
    showChooseHint.value = true
    return
  }
  if (index.value < all.length - 1) {
    index.value++
    persistDraft()
  } else {
    save({ ...answers })
    clearDraft()
    router.push('/assessment/report')
  }
}

function previous() {
  if (index.value <= 0) return
  index.value--
  showChooseHint.value = false
  persistDraft()
}

function saveAndExit() {
  persistDraft()
  router.push('/assessment')
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    e.preventDefault()
    next()
    return
  }
  const key = e.key.toUpperCase()
  if (optionOrder.includes(key as OptionKey)) {
    e.preventDefault()
    select(key as OptionKey)
  }
}

onMounted(() => {
  if (!import.meta.client) return
  trackEvent('quiz_started')
  try {
    const raw = localStorage.getItem(QUIZ_DRAFT_KEY)
    if (!raw) return
    const draft = JSON.parse(raw) as {
      index?: number
      answers?: Record<string, OptionKey>
    }
    if (typeof draft.index === 'number' && draft.index >= 0 && draft.index < all.length) {
      index.value = draft.index
    }
    if (draft.answers && typeof draft.answers === 'object') {
      Object.entries(draft.answers).forEach(([qid, key]) => {
        if (optionOrder.includes(key as OptionKey)) answers[qid] = key as OptionKey
      })
      restored.value = Object.keys(draft.answers).length > 0
    }
  } catch {
    // noop
  }
  window.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  if (!import.meta.client) return
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <div class="mx-auto max-w-2xl">
    <div class="mb-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p class="text-xs text-slate-500">自测进行中 · 支持自动草稿恢复</p>
        <button
          type="button"
          class="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
          @click="saveAndExit"
        >
          保存并退出
        </button>
      </div>
      <div class="h-2 rounded-full bg-slate-200">
        <div class="h-2 rounded-full bg-accent transition-all" :style="{ width: `${progress}%` }" />
      </div>
      <div class="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <p>第 {{ index + 1 }} 题 / 共 {{ all.length }} 题（已答 {{ answeredCount }} 题）</p>
        <p>预计剩余 {{ remainingMinutes }} 分钟</p>
      </div>
      <p v-if="restored" class="mt-2 text-xs text-emerald-700">已恢复上次答题草稿，可继续完成。</p>
    </div>

    <section class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h1 class="mb-5 text-xl font-semibold text-primary">{{ current?.text }}</h1>
      <div class="space-y-3">
        <button
          v-for="opt in current?.options"
          :key="opt.key"
          type="button"
          class="w-full rounded-xl border px-4 py-3.5 text-left text-sm transition-colors sm:text-base"
          :class="
            selectedKey === opt.key
              ? 'border-accent bg-accent-muted/25 ring-2 ring-accent/15'
              : 'border-slate-200 bg-surface hover:border-accent hover:bg-accent-muted/15'
          "
          @click="select(opt.key)"
        >
          <span class="mr-2 font-medium text-accent">{{ opt.key }}.</span>
          {{ opt.label }}
        </button>
      </div>

      <p v-if="showChooseHint" class="mt-3 text-sm text-rose-600">请先选择一个选项，再继续下一题。</p>

      <div class="mt-5 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          class="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          :disabled="index === 0"
          @click="previous"
        >
          上一题
        </button>
        <button
          type="button"
          class="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-accent-hover"
          @click="next"
        >
          {{ index === all.length - 1 ? '完成并生成报告' : '下一题' }}
        </button>
      </div>
      <p class="mt-3 text-xs text-slate-500">快捷键：按 A/B/C/D 选择，按 Enter 下一题。</p>
    </section>

    <section class="mt-4 grid gap-2 text-xs text-slate-500 sm:grid-cols-3">
      <p class="rounded-lg border border-slate-200 bg-white px-3 py-2">结果可导出并复用</p>
      <p class="rounded-lg border border-slate-200 bg-white px-3 py-2">支持断点恢复与跨页联动</p>
      <p class="rounded-lg border border-slate-200 bg-white px-3 py-2">不承诺晋升，仅提供行动建议</p>
    </section>
  </div>
</template>
