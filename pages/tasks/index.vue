<script setup lang="ts">
import { weeks } from '~/lib/weeks'
import { resources } from '~/lib/resources'
import { trackEvent } from '~/lib/analytics'
import { projectLabTemplates } from '~/lib/project-lab'
import { CHECKLIST_STORAGE_KEY } from '~/lib/checklist'

const WEEK_TASKS_KEY = 'apgc-week-tasks-v1'
const RESOURCE_PROGRESS_KEY = 'apgc-resource-progress-v1'
const AI_TOPIC_TASKS_KEY = 'apgc-ai-topic-weekly-tasks-v1'

interface TopicWeeklyTask {
  id: string
  resourceId: string
  title: string
  week: number
  stage: 'foundation' | 'architecture' | 'governance' | 'interview'
  priority: 'high' | 'medium' | 'low'
  done: boolean
  createdAt: string
}

const { result, loadFromStorage } = useAssessment()
const weekDone = ref<Record<number, boolean>>({})
const completedResourceIds = ref<string[]>([])
const topicTasks = ref<TopicWeeklyTask[]>([])
const topicTaskViewMode = ref<'all' | 'pending'>('all')

onMounted(() => {
  loadFromStorage()
  if (!import.meta.client) return
  trackEvent('tasks_view')
  try {
    const raw = localStorage.getItem(WEEK_TASKS_KEY)
    if (raw) weekDone.value = JSON.parse(raw) as Record<number, boolean>
  } catch {
    // noop
  }
  try {
    const rawResources = localStorage.getItem(RESOURCE_PROGRESS_KEY)
    if (rawResources) completedResourceIds.value = JSON.parse(rawResources) as string[]
  } catch {
    // noop
  }
  try {
    const rawTopicTasks = localStorage.getItem(AI_TOPIC_TASKS_KEY)
    if (rawTopicTasks) {
      const parsed = JSON.parse(rawTopicTasks) as Array<Partial<TopicWeeklyTask>>
      topicTasks.value = Array.isArray(parsed)
        ? parsed.map((item) => ({
            id: String(item.id || ''),
            resourceId: String(item.resourceId || ''),
            title: String(item.title || ''),
            week: Number(item.week || 1),
            stage: (item.stage as TopicWeeklyTask['stage']) || 'foundation',
            priority: (item.priority as TopicWeeklyTask['priority']) || 'medium',
            done: Boolean(item.done),
            createdAt: String(item.createdAt || new Date().toISOString()),
          }))
        : []
    }
  } catch {
    // noop
  }
})

const weekCards = computed(() =>
  weeks.map((w) => {
    const weekResources = resources.filter((r) => r.week === w.week)
    const doneResources = weekResources.filter((r) => completedResourceIds.value.includes(r.id)).length
    const progress = weekResources.length ? Math.round((doneResources / weekResources.length) * 100) : 0
    const isFocus = result.value?.focusWeeks.includes(w.week) || false
    return {
      ...w,
      totalResources: weekResources.length,
      doneResources,
      resourceProgress: progress,
      isFocus,
      done: !!weekDone.value[w.week],
    }
  }),
)

const completedWeeks = computed(() => weekCards.value.filter((w) => w.done).length)
const topicTaskCompleted = computed(() => topicTasks.value.filter((item) => item.done).length)
const sortedTopicTasks = computed(() =>
  [...topicTasks.value].sort((a, b) => {
    const priorityDiff = priorityRank(b.priority) - priorityRank(a.priority)
    if (priorityDiff !== 0) return priorityDiff
    return a.week - b.week
  }),
)
const pendingTopicTasks = computed(() => sortedTopicTasks.value.filter((item) => !item.done))
const shownTopicTasks = computed(() =>
  topicTaskViewMode.value === 'pending'
    ? sortedTopicTasks.value.filter((item) => !item.done)
    : sortedTopicTasks.value,
)
const nextPriorityTask = computed(() => pendingTopicTasks.value[0] || null)
const highPriorityPendingCount = computed(
  () => pendingTopicTasks.value.filter((item) => item.priority === 'high').length,
)
const mediumPriorityPendingCount = computed(
  () => pendingTopicTasks.value.filter((item) => item.priority === 'medium').length,
)
const lowPriorityPendingCount = computed(
  () => pendingTopicTasks.value.filter((item) => item.priority === 'low').length,
)
const copiedWeeklyReview = ref(false)
const overdueTopicTasks = computed(() =>
  pendingTopicTasks.value.filter((item) => taskOverdueDays(item) >= 7),
)
const highPriorityOverdueCount = computed(
  () => overdueTopicTasks.value.filter((item) => item.priority === 'high').length,
)
const priorityReminder = computed(() => {
  if (!pendingTopicTasks.value.length) return '当前无待办专题任务，可去专题页继续加入下一阶段任务。'
  if (highPriorityPendingCount.value > 0) return '优先完成高优先级任务，再处理中/低优先级，避免执行偏离。'
  if (mediumPriorityPendingCount.value > 0) return '当前以中优先级任务为主，建议先完成 1 条再继续新增任务。'
  return '当前主要是低优先级任务，可作为补充学习安排。'
})
const weeklyReviewTemplate = computed(() => {
  const nextTaskText = nextPriorityTask.value
    ? `${priorityLabel(nextPriorityTask.value.priority)} · W${nextPriorityTask.value.week} · ${nextPriorityTask.value.title}`
    : '暂无下一条任务（可去专题页新增 Top2）'
  return [
    '【本周复盘自动模板】',
    `本周周任务完成：${completedWeeks.value}/12`,
    `专题任务完成：${topicTaskCompleted.value}/${topicTasks.value.length}`,
    `本周完成亮点：完成了 ${topicTaskCompleted.value} 条专题任务，并同步到清单形成可复用结论。`,
    `未完成原因：${highPriorityPendingCount.value > 0 ? '高优先级任务仍有待办，执行顺序需继续收敛。' : '暂无高优先级积压，主要是时间分配与节奏问题。'}`,
    `下周承诺：先完成「${nextTaskText}」，再新增任务。`,
  ].join('\n')
})
const highPriorityDonePct = computed(() => {
  const high = topicTasks.value.filter((item) => item.priority === 'high')
  if (!high.length) return 0
  const done = high.filter((item) => item.done).length
  return Math.round((done / high.length) * 100)
})

function priorityRank(priority: TopicWeeklyTask['priority']) {
  if (priority === 'high') return 3
  if (priority === 'medium') return 2
  return 1
}

function stageLabel(stage: TopicWeeklyTask['stage']) {
  if (stage === 'foundation') return '入门全景'
  if (stage === 'architecture') return '架构与编排'
  if (stage === 'governance') return '评估与治理'
  return '面试表达'
}

function priorityLabel(priority: TopicWeeklyTask['priority']) {
  if (priority === 'high') return '高优先级'
  if (priority === 'medium') return '中优先级'
  return '低优先级'
}

function priorityClass(priority: TopicWeeklyTask['priority']) {
  if (priority === 'high') return 'border-rose-200 bg-rose-50 text-rose-700'
  if (priority === 'medium') return 'border-amber-200 bg-amber-50 text-amber-700'
  return 'border-slate-200 bg-slate-50 text-slate-600'
}

function taskOverdueDays(task: TopicWeeklyTask) {
  const created = new Date(task.createdAt).getTime()
  if (!created) return 0
  const diff = Date.now() - created
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)))
}

function toggleWeekDone(week: number) {
  const next = { ...weekDone.value, [week]: !weekDone.value[week] }
  weekDone.value = next
  if (import.meta.client) localStorage.setItem(WEEK_TASKS_KEY, JSON.stringify(next))
  if (week === 1 && next[week]) {
    trackEvent('first_week_done')
  }
}

function openChecklistFromTasks(week: number) {
  trackEvent('tasks_open_checklist', { week })
}

function persistTopicTasks() {
  if (!import.meta.client) return
  localStorage.setItem(AI_TOPIC_TASKS_KEY, JSON.stringify(topicTasks.value))
}

function toggleTopicTaskDone(id: string) {
  topicTasks.value = topicTasks.value.map((item) => (item.id === id ? { ...item, done: !item.done } : item))
  persistTopicTasks()
  const updated = topicTasks.value.find((item) => item.id === id)
  trackEvent('tasks_topic_toggle_done', { id, done: updated?.done || false })
}

function removeTopicTask(id: string) {
  topicTasks.value = topicTasks.value.filter((item) => item.id !== id)
  persistTopicTasks()
  trackEvent('tasks_topic_remove', { id })
}

function syncTopicTaskToChecklist(task: TopicWeeklyTask) {
  if (!import.meta.client) return
  const currentRaw = localStorage.getItem(CHECKLIST_STORAGE_KEY)
  const current = currentRaw
    ? (JSON.parse(currentRaw) as { form?: Record<string, string>; savedAt?: string })
    : { form: {} }

  const form = {
    ...(current.form || {}),
    project: current.form?.project || task.title,
    route: current.form?.route || '专题学习 -> 清单转实战',
    scene_kpi: current.form?.scene_kpi || `本周完成专题任务并输出可复述结果：${task.title}`,
    eval_biz: current.form?.eval_biz || `来源：专题任务池；阶段：${stageLabel(task.stage)}；周次：W${task.week}`,
  }

  localStorage.setItem(
    CHECKLIST_STORAGE_KEY,
    JSON.stringify({
      form,
      savedAt: new Date().toLocaleString('zh-CN'),
    }),
  )
  trackEvent('tasks_topic_to_checklist', { id: task.id, stage: task.stage, week: task.week })
  navigateTo('/tools/checklist?synced=1&from=topic-task')
}

function syncPendingTopicTasksToChecklist() {
  const first = pendingTopicTasks.value[0]
  if (!first) return
  syncTopicTaskToChecklist(first)
}

function completeNextPriorityTask() {
  const next = nextPriorityTask.value
  if (!next) return
  toggleTopicTaskDone(next.id)
  trackEvent('tasks_topic_quick_complete_next', {
    id: next.id,
    priority: next.priority,
    week: next.week,
  })
}

function syncNextPriorityTaskToChecklist() {
  const next = nextPriorityTask.value
  if (!next) return
  syncTopicTaskToChecklist(next)
  trackEvent('tasks_topic_quick_sync_next', {
    id: next.id,
    priority: next.priority,
    week: next.week,
  })
}

async function copyWeeklyReviewTemplate() {
  if (!import.meta.client || !navigator.clipboard) return
  await navigator.clipboard.writeText(weeklyReviewTemplate.value)
  copiedWeeklyReview.value = true
  trackEvent('tasks_weekly_review_copy')
  setTimeout(() => {
    copiedWeeklyReview.value = false
  }, 1500)
}

function setTopicTaskViewMode(mode: 'all' | 'pending') {
  topicTaskViewMode.value = mode
  trackEvent('tasks_topic_filter_change', { mode })
}

function clearCompletedTopicTasks() {
  const before = topicTasks.value.length
  topicTasks.value = topicTasks.value.filter((item) => !item.done)
  persistTopicTasks()
  trackEvent('tasks_topic_clear_completed', { removed: before - topicTasks.value.length })
}

function setTopicTaskPriority(id: string, priority: TopicWeeklyTask['priority']) {
  topicTasks.value = topicTasks.value.map((item) => (item.id === id ? { ...item, priority } : item))
  persistTopicTasks()
  trackEvent('tasks_topic_priority_change', { id, priority })
}
</script>

<template>
  <div class="space-y-8">
    <section class="glass-panel rounded-2xl border border-slate-200 p-6">
      <h1 class="text-2xl font-bold text-primary">周任务中心</h1>
      <p class="mt-2 text-slate-600">把路径、资源和交付合到一个看板里，按周执行，避免掉队。</p>
      <div class="mt-4 grid gap-3 sm:grid-cols-3">
        <div class="rounded-xl border border-slate-200 bg-white p-3">
          <p class="text-xs text-slate-500">周任务完成</p>
          <p class="mt-1 text-xl font-semibold text-primary">{{ completedWeeks }}/12</p>
        </div>
        <div class="rounded-xl border border-slate-200 bg-white p-3">
          <p class="text-xs text-slate-500">当前建议起点</p>
          <p class="mt-1 text-xl font-semibold text-primary">W{{ result?.startWeek || 1 }}</p>
        </div>
        <div class="rounded-xl border border-slate-200 bg-white p-3">
          <p class="text-xs text-slate-500">本周一件事</p>
          <p class="mt-1 text-sm font-medium text-primary">{{ result?.weeklyAction || '先完成自测生成个性化建议' }}</p>
        </div>
      </div>
    </section>

    <section class="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 class="text-lg font-semibold text-primary">项目 Lab 任务（简历向）</h2>
          <p class="mt-1 text-xs text-slate-600">对标竞品 6 大实战，选一个加入任务池优先执行。</p>
        </div>
        <NuxtLink to="/tools/project-lab" class="text-xs font-medium text-accent hover:underline">
          打开项目 Lab →
        </NuxtLink>
      </div>
      <div class="mt-3 grid gap-2 sm:grid-cols-3">
        <article
          v-for="p in projectLabTemplates"
          :key="p.id"
          class="rounded-xl border border-emerald-100 bg-white p-3 text-sm"
        >
          <p class="font-medium text-primary">{{ p.title }}</p>
          <p class="mt-1 text-xs text-slate-600">{{ p.duration }}</p>
        </article>
      </div>
    </section>

    <section class="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-5">
      <div class="rounded-xl border border-indigo-200 bg-white p-4">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <p class="text-sm font-semibold text-primary">周复盘自动模板</p>
          <button
            type="button"
            class="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs text-slate-700 hover:bg-slate-50"
            @click="copyWeeklyReviewTemplate"
          >
            {{ copiedWeeklyReview ? '已复制复盘模板' : '复制复盘模板' }}
          </button>
        </div>
        <pre class="mt-2 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-xs text-slate-700">{{ weeklyReviewTemplate }}</pre>
      </div>
      <div class="rounded-xl border border-indigo-200 bg-white p-4">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p class="text-sm font-semibold text-primary">自动优先执行建议</p>
            <p class="mt-1 text-xs text-slate-600">{{ priorityReminder }}</p>
            <p class="mt-1 text-xs text-slate-500">
              高 {{ highPriorityPendingCount }} · 中 {{ mediumPriorityPendingCount }} · 低 {{ lowPriorityPendingCount }}（待办）
            </p>
            <p v-if="overdueTopicTasks.length" class="mt-1 text-xs text-rose-700">
              逾期待办 {{ overdueTopicTasks.length }} 条（其中高优先级 {{ highPriorityOverdueCount }} 条）
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-2 text-xs">
            <span
              v-if="nextPriorityTask"
              class="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-indigo-700"
            >
              下一条：{{ priorityLabel(nextPriorityTask.priority) }} · W{{ nextPriorityTask.week }}
            </span>
            <button
              type="button"
              class="rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-40"
              :disabled="!nextPriorityTask"
              @click="completeNextPriorityTask"
            >
              快速完成下一条
            </button>
            <button
              type="button"
              class="rounded-full border border-indigo-300 bg-white px-3 py-1 text-indigo-700 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-40"
              :disabled="!nextPriorityTask"
              @click="syncNextPriorityTaskToChecklist"
            >
              下一条同步清单
            </button>
          </div>
        </div>
      </div>
      <div class="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 class="text-lg font-semibold text-primary">专题学习任务池（来自大模型与智能体专题）</h2>
          <p class="mt-1 text-xs text-slate-600">可在专题页一键加入 Top2，这里统一执行并打卡。</p>
        </div>
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="rounded-full border px-3 py-1 text-xs"
            :class="topicTaskViewMode === 'all' ? 'border-indigo-300 bg-white text-indigo-700' : 'border-slate-200 bg-white text-slate-600'"
            @click="setTopicTaskViewMode('all')"
          >
            全部
          </button>
          <button
            type="button"
            class="rounded-full border px-3 py-1 text-xs"
            :class="topicTaskViewMode === 'pending' ? 'border-indigo-300 bg-white text-indigo-700' : 'border-slate-200 bg-white text-slate-600'"
            @click="setTopicTaskViewMode('pending')"
          >
            仅看待办
          </button>
          <button
            type="button"
            class="rounded-full border border-indigo-300 bg-white px-3 py-1 text-xs text-indigo-700 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-40"
            :disabled="!pendingTopicTasks.length"
            @click="syncPendingTopicTasksToChecklist"
          >
            一键同步待办到清单
          </button>
          <button
            type="button"
            class="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            :disabled="!topicTaskCompleted"
            @click="clearCompletedTopicTasks"
          >
            清理已完成
          </button>
          <div class="rounded-full border border-indigo-200 bg-white px-3 py-1 text-xs text-indigo-700">
            已完成 {{ topicTaskCompleted }}/{{ topicTasks.length }}
          </div>
          <div class="rounded-full border border-rose-200 bg-white px-3 py-1 text-xs text-rose-700">
            高优先级完成率 {{ highPriorityDonePct }}%
          </div>
        </div>
      </div>
      <div v-if="shownTopicTasks.length" class="mt-3 grid gap-3 sm:grid-cols-2">
        <article
          v-for="task in shownTopicTasks"
          :key="task.id"
          class="rounded-xl border border-slate-200 bg-white p-4"
        >
          <div class="flex flex-wrap items-center gap-2">
            <p class="text-xs text-slate-500">W{{ task.week }} · {{ stageLabel(task.stage) }}</p>
            <span class="rounded-full border px-2 py-0.5 text-[11px]" :class="priorityClass(task.priority)">
              {{ priorityLabel(task.priority) }}
            </span>
            <span
              v-if="!task.done && taskOverdueDays(task) >= 7"
              class="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] text-rose-700"
            >
              逾期 {{ taskOverdueDays(task) }} 天
            </span>
          </div>
          <p class="mt-1 text-sm font-medium text-primary">{{ task.title }}</p>
          <div class="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
            <button
              type="button"
              class="rounded-full border px-2 py-0.5"
              :class="task.priority === 'high' ? 'border-rose-300 bg-rose-50 text-rose-700' : 'border-slate-200 text-slate-600'"
              @click="setTopicTaskPriority(task.id, 'high')"
            >
              高
            </button>
            <button
              type="button"
              class="rounded-full border px-2 py-0.5"
              :class="task.priority === 'medium' ? 'border-amber-300 bg-amber-50 text-amber-700' : 'border-slate-200 text-slate-600'"
              @click="setTopicTaskPriority(task.id, 'medium')"
            >
              中
            </button>
            <button
              type="button"
              class="rounded-full border px-2 py-0.5"
              :class="task.priority === 'low' ? 'border-slate-300 bg-slate-100 text-slate-700' : 'border-slate-200 text-slate-600'"
              @click="setTopicTaskPriority(task.id, 'low')"
            >
              低
            </button>
          </div>
          <div class="mt-2 flex flex-wrap items-center gap-3 text-xs">
            <button
              type="button"
              class="hover:underline"
              :class="task.done ? 'text-emerald-700' : 'text-slate-600'"
              @click="toggleTopicTaskDone(task.id)"
            >
              {{ task.done ? '已完成' : '标记完成' }}
            </button>
            <NuxtLink :to="{ path: '/resources/view', query: { id: task.resourceId } }" class="text-accent hover:underline">
              网页内阅读
            </NuxtLink>
            <button type="button" class="text-primary hover:underline" @click="syncTopicTaskToChecklist(task)">
              同步到清单
            </button>
            <button type="button" class="text-slate-500 hover:underline" @click="removeTopicTask(task.id)">移除</button>
          </div>
        </article>
      </div>
      <p v-else class="mt-3 text-xs text-slate-500">
        {{
          topicTaskViewMode === 'pending'
            ? '当前没有待办任务，已完成后可清理或切回全部查看。'
            : '还没有专题任务。'
        }}
        <template v-if="topicTaskViewMode !== 'pending'">
          去 <NuxtLink to="/resources/ai-topics" class="text-accent hover:underline">大模型与智能体专题页</NuxtLink> 一键加入下一阶段 Top2。
        </template>
      </p>
    </section>

    <section class="space-y-3">
      <article
        v-for="item in weekCards"
        :key="item.week"
        class="rounded-2xl border p-5"
        :class="item.isFocus ? 'border-accent/40 bg-accent-muted/20' : 'border-slate-200 bg-white'"
      >
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p class="text-sm text-slate-500">W{{ item.week }} · {{ item.dimension }}</p>
            <h2 class="text-lg font-semibold text-primary">
              {{ item.title }}
              <span
                v-if="item.isFocus"
                class="ml-2 rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent"
              >
                重点周
              </span>
            </h2>
          </div>
          <button
            type="button"
            class="rounded-lg border px-3 py-1.5 text-sm"
            :class="item.done ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-slate-300 text-slate-700 hover:bg-slate-50'"
            @click="toggleWeekDone(item.week)"
          >
            {{ item.done ? '已完成本周任务' : '标记本周完成' }}
          </button>
        </div>

        <p class="mt-2 text-sm text-slate-700"><strong>交付物：</strong>{{ item.deliverable }}</p>
        <p class="mt-1 text-xs text-slate-500">
          配套资源进度：{{ item.doneResources }}/{{ item.totalResources }}（{{ item.resourceProgress }}%）
        </p>

        <div class="mt-2 h-1.5 rounded-full bg-slate-200">
          <div class="h-1.5 rounded-full bg-accent" :style="{ width: `${item.resourceProgress}%` }" />
        </div>

        <div class="mt-3 flex flex-wrap gap-3 text-sm">
          <NuxtLink to="/resources" class="text-accent hover:underline">查看本周资源 →</NuxtLink>
          <NuxtLink
            v-if="item.tool === 'checklist'"
            to="/tools/checklist"
            class="text-accent hover:underline"
            @click="openChecklistFromTasks(item.week)"
          >
            填写决策清单 →
          </NuxtLink>
          <NuxtLink v-if="item.caseSlug" :to="`/founder/cases/${item.caseSlug}`" class="text-accent hover:underline">
            查看关联案例 →
          </NuxtLink>
        </div>
      </article>
    </section>
  </div>
</template>
