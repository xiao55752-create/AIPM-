<script setup lang="ts">
import {
  homeworkStatusLabels,
  homeworkTypeLabels,
  type HomeworkRecord,
} from '~/lib/homework'
import { trackEvent } from '~/lib/analytics'

const route = useRoute()
const id = computed(() => String(route.params.id || ''))
const loading = ref(true)
const loadError = ref('')
const record = ref<(HomeworkRecord & { feedback: string }) | null>(null)

onMounted(async () => {
  if (!import.meta.client) return
  trackEvent('homework_detail_view', { id: id.value })
  await loadRecord()
})

async function loadRecord() {
  loading.value = true
  loadError.value = ''
  try {
    const res = await $fetch<{
      ok: boolean
      record: HomeworkRecord & { feedback: string }
    }>(`/api/homework/${id.value}`)
    record.value = res.record
    if (res.record.status === 'human_reviewed') {
      await markFeedbackRead()
    }
  } catch {
    loadError.value = '未找到作业，或链接已失效'
  } finally {
    loading.value = false
  }
}

async function markFeedbackRead() {
  try {
    const res = await $fetch<{
      ok: boolean
      record: HomeworkRecord & { feedback: string }
    }>(`/api/homework/${id.value}/read`, { method: 'POST' })
    record.value = res.record
    trackEvent('homework_feedback_read', { id: id.value })
  } catch {
    // 已读记录失败不影响学员查看反馈
  }
}

const statusLabel = computed(() => {
  if (!record.value) return ''
  return homeworkStatusLabels[record.value.status] || record.value.status
})

const typeLabel = computed(() => {
  if (!record.value) return ''
  return homeworkTypeLabels[record.value.type] || record.value.type
})
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-6">
    <CorePathRibbon />

    <section class="glass-panel rounded-2xl border border-slate-200 p-6">
      <p class="text-xs text-slate-500">作业批改结果</p>
      <h1 class="mt-1 text-2xl font-bold text-primary">
        {{ record?.title || '正在加载作业...' }}
      </h1>
      <p class="mt-2 text-sm text-slate-600">
        通知链接直达本页；打开后会自动记录已读状态，方便主理人判断是否需要二次跟进。
      </p>
    </section>

    <section v-if="loading" class="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
      正在加载...
    </section>

    <section v-else-if="loadError" class="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
      {{ loadError }}
    </section>

    <template v-else-if="record">
      <section class="rounded-2xl border border-slate-200 bg-white p-6">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p class="text-sm font-semibold text-primary">{{ typeLabel }}</p>
            <p class="mt-1 text-xs text-slate-500">
              提交：{{ new Date(record.createdAt).toLocaleString('zh-CN') }}
              <span v-if="record.reviewedAt">
                · 批改：{{ new Date(record.reviewedAt).toLocaleString('zh-CN') }}
              </span>
            </p>
          </div>
          <span class="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs text-emerald-700">
            {{ statusLabel }}
          </span>
        </div>
        <p v-if="record.feedbackReadAt" class="mt-3 text-xs text-emerald-700">
          已记录打开时间：{{ new Date(record.feedbackReadAt).toLocaleString('zh-CN') }}
        </p>
      </section>

      <section class="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 class="font-semibold text-primary">模板反馈</h2>
        <pre class="mt-3 whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm text-slate-700">{{ record.feedback }}</pre>
      </section>

      <section
        v-if="record.humanFeedback"
        class="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-6"
      >
        <h2 class="font-semibold text-primary">主理人真人批改</h2>
        <pre class="mt-3 whitespace-pre-wrap rounded-xl border border-emerald-100 bg-white p-4 text-sm text-emerald-950">{{ record.humanFeedback }}</pre>
      </section>

      <section class="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 class="font-semibold text-primary">原始提交</h2>
        <pre class="mt-3 max-h-72 overflow-y-auto whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-xs text-slate-600">{{ record.content }}</pre>
      </section>

      <div class="flex flex-wrap gap-3">
        <NuxtLink
          to="/tools/homework"
          class="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
        >
          返回作业提交
        </NuxtLink>
        <NuxtLink
          to="/tools/showcase"
          class="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
        >
          准备路演 Demo
        </NuxtLink>
      </div>
    </template>
  </div>
</template>
