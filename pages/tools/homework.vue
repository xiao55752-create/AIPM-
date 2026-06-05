<script setup lang="ts">
import {
  HOMEWORK_STORAGE_KEY,
  homeworkTypeLabels,
  homeworkStatusLabels,
  formatSlaCountdown,
  isSlaOverdue,
  type HomeworkSubmission,
  type HomeworkStatus,
  type HomeworkType,
} from '~/lib/homework'
import { detectNotifyChannel } from '~/lib/notifications'
import { trackEvent } from '~/lib/analytics'
import { demoHomeworkDraft } from '~/lib/demo-data'

const route = useRoute()
const form = reactive({
  type: 'project-lab' as HomeworkType,
  title: '',
  content: '',
  contact: '',
  requestHumanReview: false,
})

const submissions = ref<HomeworkSubmission[]>([])
const submitting = ref(false)
const submitError = ref('')
const refreshingId = ref('')
const nowTick = ref(Date.now())
let slaTimer: ReturnType<typeof setInterval> | null = null

const detectedChannel = computed(() => detectNotifyChannel(form.contact))

const channelHint = computed(() => {
  if (!form.requestHumanReview || !form.contact.trim()) return ''
  if (detectedChannel.value === 'email') return '批改完成后将通过邮件通知（文案由主理人在 ops 发送）'
  if (detectedChannel.value === 'wechat') return '批改完成后将通过企微/微信通知（文案由主理人在 ops 发送）'
  return '请填写有效邮箱或微信号，以便批改完成后通知您'
})

onMounted(() => {
  if (!import.meta.client) return
  trackEvent('homework_view')
  const qType = String(route.query.type || '')
  if (qType in homeworkTypeLabels) form.type = qType as HomeworkType
  loadLocalSubmissions()
  slaTimer = setInterval(() => {
    nowTick.value = Date.now()
  }, 60_000)
})

onUnmounted(() => {
  if (slaTimer) clearInterval(slaTimer)
})

function loadLocalSubmissions() {
  try {
    const raw = localStorage.getItem(HOMEWORK_STORAGE_KEY)
    if (raw) submissions.value = JSON.parse(raw) as HomeworkSubmission[]
  } catch {
    // noop
  }
}

function persistLocal() {
  if (!import.meta.client) return
  localStorage.setItem(HOMEWORK_STORAGE_KEY, JSON.stringify(submissions.value))
}

function statusLabel(status: HomeworkStatus) {
  return homeworkStatusLabels[status] || status
}

function statusClass(status: HomeworkStatus) {
  if (status === 'pending_human') return 'text-amber-700 bg-amber-50 border-amber-200'
  if (status === 'human_reviewed') return 'text-emerald-700 bg-emerald-50 border-emerald-200'
  return 'text-slate-600 bg-slate-50 border-slate-200'
}

function slaText(item: HomeworkSubmission) {
  void nowTick.value
  if (item.status !== 'pending_human' || !item.slaDueAt) return ''
  return formatSlaCountdown(item.slaDueAt)
}

function slaClass(item: HomeworkSubmission) {
  void nowTick.value
  if (item.status !== 'pending_human' || !item.slaDueAt) return 'text-slate-500'
  return isSlaOverdue(item.slaDueAt) ? 'text-rose-600 font-medium' : 'text-amber-700'
}

function fillDemoHomework() {
  form.type = demoHomeworkDraft.type as HomeworkType
  form.title = demoHomeworkDraft.title
  form.content = demoHomeworkDraft.content
  form.contact = demoHomeworkDraft.contact
  form.requestHumanReview = true
  trackEvent('homework_demo_fill')
}

async function submitHomework() {
  if (!import.meta.client) return
  if (form.content.trim().length < 20) {
    submitError.value = '请至少填写 20 字作业内容'
    return
  }
  if (form.requestHumanReview && !form.contact.trim()) {
    submitError.value = '申请真人批改需填写联系方式'
    return
  }
  submitting.value = true
  submitError.value = ''
  try {
    const res = await $fetch<{
      ok: boolean
      record: {
        id: string
        title: string
        autoFeedback: string
        feedback: string
        status: HomeworkStatus
        slaDueAt?: string
        notifyChannel?: string
      }
    }>('/api/homework', {
      method: 'POST',
      body: {
        type: form.type,
        title: form.title.trim(),
        content: form.content.trim(),
        contact: form.contact.trim(),
        requestHumanReview: form.requestHumanReview,
        notifyChannel: detectedChannel.value,
        source: String(route.query.from || 'homework-page'),
      },
    })
    const entry: HomeworkSubmission = {
      id: res.record.id,
      type: form.type,
      title: res.record.title,
      content: form.content.trim(),
      feedback: res.record.feedback || res.record.autoFeedback,
      status: res.record.status,
      slaDueAt: res.record.slaDueAt,
      notifyChannel: res.record.notifyChannel as HomeworkSubmission['notifyChannel'],
      createdAt: new Date().toLocaleString('zh-CN'),
    }
    submissions.value = [entry, ...submissions.value].slice(0, 10)
    persistLocal()
    trackEvent('homework_submit', {
      type: form.type,
      requestHumanReview: form.requestHumanReview,
    })
    form.content = ''
  } catch {
    submitError.value = '提交失败，请稍后重试'
  } finally {
    submitting.value = false
  }
}

async function refreshSubmission(id: string) {
  if (!import.meta.client) return
  refreshingId.value = id
  try {
    const res = await $fetch<{
      ok: boolean
      record: {
        status: HomeworkStatus
        humanFeedback?: string
        autoFeedback: string
        feedback: string
        slaDueAt?: string
        feedbackReadAt?: string
      }
    }>(`/api/homework/${id}`)
    submissions.value = submissions.value.map((item) =>
      item.id === id
        ? {
            ...item,
            status: res.record.status,
            humanFeedback: res.record.humanFeedback,
            slaDueAt: res.record.slaDueAt || item.slaDueAt,
            feedbackReadAt: res.record.feedbackReadAt || item.feedbackReadAt,
            feedback: res.record.humanFeedback
              ? `${res.record.feedback}\n\n${res.record.humanFeedback}`
              : res.record.feedback,
          }
        : item,
    )
    persistLocal()
    if (res.record.status === 'human_reviewed') {
      trackEvent('homework_human_feedback_received', { id })
    }
  } catch {
    // noop
  } finally {
    refreshingId.value = ''
  }
}
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-6">
    <CorePathRibbon />

    <section class="glass-panel rounded-2xl border border-slate-200 p-6">
      <h1 class="text-2xl font-bold text-primary">作业提交 · 模板 + 真人批改</h1>
      <p class="mt-2 text-sm text-slate-600">
        即时获得模板反馈；勾选「申请真人批改」并留联系方式，48h 内由主理人回复（进阶席位优先）。
      </p>
      <NuxtLink
        to="/tools/showcase"
        class="mt-3 inline-block text-sm font-medium text-accent hover:underline"
      >
        路演 5 分钟 Demo Rubric →
      </NuxtLink>
      <div class="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          class="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100"
          @click="fillDemoHomework"
        >
          一键填入样例作业
        </button>
        <NuxtLink to="/share/demo-copilot-eval" class="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-white">
          查看样例成果页
        </NuxtLink>
      </div>
    </section>

    <section class="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
      <div>
        <label class="text-sm font-medium text-primary">作业类型</label>
        <select
          v-model="form.type"
          class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        >
          <option v-for="(label, key) in homeworkTypeLabels" :key="key" :value="key">
            {{ label }}
          </option>
        </select>
      </div>
      <div>
        <label class="text-sm font-medium text-primary">标题（可选）</label>
        <input
          v-model="form.title"
          type="text"
          class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          placeholder="例如：客服 Copilot Eval 第一轮"
        />
      </div>
      <div>
        <label class="text-sm font-medium text-primary">作业内容</label>
        <textarea
          v-model="form.content"
          rows="8"
          class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          placeholder="粘贴项目交付物、Eval 报告或周复盘全文..."
        />
      </div>
      <div>
        <label class="text-sm font-medium text-primary">联系方式（真人批改必填）</label>
        <input
          v-model="form.contact"
          type="text"
          class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          placeholder="微信 / 邮箱"
        />
      </div>
      <label class="flex items-center gap-2 text-sm text-slate-700">
        <input v-model="form.requestHumanReview" type="checkbox" class="rounded border-slate-300" />
        申请真人批改（需留联系方式，对标竞品 1v1 作业点评）
      </label>
      <p v-if="channelHint" class="text-xs text-slate-500">{{ channelHint }}</p>
      <button
        type="button"
        class="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
        :disabled="submitting"
        @click="submitHomework"
      >
        {{ submitting ? '提交中...' : '提交并获取反馈' }}
      </button>
      <p v-if="submitError" class="text-sm text-rose-600">{{ submitError }}</p>
    </section>

    <section v-if="submissions.length" class="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 class="font-semibold text-primary">最近提交</h2>
      <article
        v-for="item in submissions.slice(0, 5)"
        :key="item.id"
        class="mt-3 rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm"
      >
        <div class="flex flex-wrap items-center justify-between gap-2">
          <p class="font-medium text-primary">{{ item.title }} · {{ homeworkTypeLabels[item.type] }}</p>
          <span
            class="rounded-full border px-2 py-0.5 text-xs"
            :class="statusClass(item.status)"
          >
            {{ statusLabel(item.status) }}
          </span>
        </div>
        <p class="mt-1 text-xs text-slate-500">
          {{ item.createdAt }}
          <span v-if="item.status === 'pending_human' && item.slaDueAt" :class="slaClass(item)">
            · SLA {{ slaText(item) }}
          </span>
          <span v-if="item.feedbackReadAt" class="text-emerald-700">
            · 已读 {{ new Date(item.feedbackReadAt).toLocaleString('zh-CN') }}
          </span>
        </p>
        <pre class="mt-2 whitespace-pre-wrap text-xs text-slate-700">{{ item.feedback }}</pre>
        <pre
          v-if="item.humanFeedback"
          class="mt-2 whitespace-pre-wrap rounded-lg border border-emerald-200 bg-emerald-50/50 p-2 text-xs text-emerald-900"
        >{{ item.humanFeedback }}</pre>
        <button
          v-if="item.status === 'pending_human'"
          type="button"
          class="mt-2 text-xs text-accent hover:underline disabled:opacity-50"
          :disabled="refreshingId === item.id"
          @click="refreshSubmission(item.id)"
        >
          {{ refreshingId === item.id ? '刷新中...' : '刷新批改状态' }}
        </button>
        <NuxtLink
          v-if="item.status === 'human_reviewed'"
          :to="`/tools/homework/${item.id}`"
          class="mt-2 inline-block text-xs text-accent hover:underline"
          @click="trackEvent('homework_open_detail', { id: item.id })"
        >
          查看批改详情 →
        </NuxtLink>
      </article>
    </section>
  </div>
</template>
