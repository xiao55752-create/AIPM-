<script setup lang="ts">
import { CHECKLIST_STORAGE_KEY } from '~/lib/checklist'
import { trackEvent } from '~/lib/analytics'
import { resources, type LearningResource } from '~/lib/resources'

type TopicStage = 'foundation' | 'architecture' | 'governance' | 'interview'
const AI_TOPIC_PROGRESS_KEY = 'apgc-ai-topic-progress-v1'
const AI_TOPIC_STAGE_CHECKIN_KEY = 'apgc-ai-topic-stage-checkin-v1'
const AI_TOPIC_TASKS_KEY = 'apgc-ai-topic-weekly-tasks-v1'

interface TopicWeeklyTask {
  id: string
  resourceId: string
  title: string
  week: number
  stage: TopicStage
  priority: 'high' | 'medium' | 'low'
  done: boolean
  createdAt: string
}

const stageMeta: Record<TopicStage, { title: string; desc: string }> = {
  foundation: {
    title: '1) 入门全景',
    desc: '先建立完整认知：从 Prompt 到 RAG，到产品化落地路径。',
  },
  architecture: {
    title: '2) 架构与编排',
    desc: '理解 Agent / Tool Use / Multi-Agent 的系统设计取舍。',
  },
  governance: {
    title: '3) 评估与治理',
    desc: '确保可发布、可观测、可回滚，面向企业级场景稳定运行。',
  },
  interview: {
    title: '4) 面试表达',
    desc: '把技术判断翻译成业务价值，形成可复用的面试话术。',
  },
}

const stageOrder: TopicStage[] = ['foundation', 'architecture', 'governance', 'interview']

const aiTopicResources = computed(() =>
  resources
    .filter((item) => {
      if (item.type !== 'article') return false
      const text = `${item.title} ${item.summary}`
      return /(大模型|智能体|agent|rag|llm|function calling|tool use|llmops)/i.test(text)
    })
    .sort((a, b) => a.week - b.week),
)

const groupedResources = computed(() => {
  const grouped: Record<TopicStage, LearningResource[]> = {
    foundation: [],
    architecture: [],
    governance: [],
    interview: [],
  }
  aiTopicResources.value.forEach((item) => {
    grouped[stageOf(item)].push(item)
  })
  return grouped
})

const completedTopicIds = ref<string[]>([])
const stageCheckins = ref<Record<TopicStage, boolean>>({
  foundation: false,
  architecture: false,
  governance: false,
  interview: false,
})

const totalCount = computed(() => aiTopicResources.value.length)
const completedCount = computed(() =>
  aiTopicResources.value.filter((item) => completedTopicIds.value.includes(item.id)).length,
)
const overallProgressPct = computed(() =>
  totalCount.value ? Math.round((completedCount.value / totalCount.value) * 100) : 0,
)
const stageDoneCount = computed(() => stageOrder.filter((stage) => stageCheckins.value[stage]).length)
const topicTasks = ref<TopicWeeklyTask[]>([])
const outcomeExported = ref(false)

function stageCompletion(stage: TopicStage) {
  const list = groupedResources.value[stage]
  if (!list.length) return { done: 0, total: 0, pct: 0 }
  const done = list.filter((item) => completedTopicIds.value.includes(item.id)).length
  return {
    done,
    total: list.length,
    pct: Math.round((done / list.length) * 100),
  }
}

const nextSuggestedStage = computed(() => {
  const firstUnchecked = stageOrder.find((stage) => !stageCheckins.value[stage])
  return firstUnchecked || stageOrder[stageOrder.length - 1]
})

const nextStageTop2 = computed(() => {
  const stage = nextSuggestedStage.value
  const candidates = groupedResources.value[stage].filter((item) => !completedTopicIds.value.includes(item.id))
  if (candidates.length) return candidates.slice(0, 2)
  return groupedResources.value[stage].slice(0, 2)
})

function stageOf(item: LearningResource): TopicStage {
  const text = `${item.title} ${item.summary}`.toLowerCase()
  if (/(面试|题库|表达)/.test(text)) return 'interview'
  if (/(治理|合规|审计|llmops|发布|监控|回滚|评估|eval)/.test(text)) return 'governance'
  if (/(agent|智能体|function calling|tool use|multi-agent|rag)/.test(text)) return 'architecture'
  return 'foundation'
}

function resolveResourceLink(item: LearningResource) {
  if (item.href) return item.href
  return `https://www.google.com/search?q=${encodeURIComponent(item.title)}`
}

function durationLabel(item: LearningResource) {
  const text = `${item.title} ${item.summary}`
  if (/(完整路径|体系|实践|治理|协同)/.test(text)) return '40-60 分钟'
  return '20-40 分钟'
}

function difficulty(item: LearningResource) {
  const text = `${item.title} ${item.summary}`.toLowerCase()
  if (/(题库|面试)/.test(text)) return '实战'
  if (/(llmops|治理|合规|评估|multi-agent)/.test(text)) return '进阶'
  return '基础'
}

function taskPriorityByStage(stage: TopicStage): TopicWeeklyTask['priority'] {
  if (stage === 'architecture' || stage === 'governance') return 'high'
  if (stage === 'interview') return 'medium'
  return 'low'
}

function priorityLabel(priority: TopicWeeklyTask['priority']) {
  if (priority === 'high') return '高优先级'
  if (priority === 'medium') return '中优先级'
  return '低优先级'
}

function onOpenResource(item: LearningResource) {
  trackEvent('resource_open', {
    id: item.id,
    week: item.week,
    type: item.type,
    source: item.source || '专题页',
  })
}

function isTopicCompleted(id: string) {
  return completedTopicIds.value.includes(id)
}

function toggleTopicCompleted(id: string) {
  const set = new Set(completedTopicIds.value)
  if (set.has(id)) set.delete(id)
  else set.add(id)
  completedTopicIds.value = [...set]
  if (import.meta.client) {
    localStorage.setItem(AI_TOPIC_PROGRESS_KEY, JSON.stringify(completedTopicIds.value))
  }
  trackEvent('resource_ai_topic_complete_toggle', { id, completed: completedTopicIds.value.includes(id) })
}

function toggleStageCheckin(stage: TopicStage) {
  stageCheckins.value[stage] = !stageCheckins.value[stage]
  if (import.meta.client) {
    localStorage.setItem(AI_TOPIC_STAGE_CHECKIN_KEY, JSON.stringify(stageCheckins.value))
  }
  trackEvent('resource_ai_topic_stage_checkin', { stage, checked: stageCheckins.value[stage] })
}

function persistTopicTasks() {
  if (!import.meta.client) return
  localStorage.setItem(AI_TOPIC_TASKS_KEY, JSON.stringify(topicTasks.value))
}

function addTopicTask(item: LearningResource, stage: TopicStage) {
  const existed = topicTasks.value.some((task) => task.resourceId === item.id)
  if (existed) return
  const priority = taskPriorityByStage(stage)
  topicTasks.value = [
    {
      id: `topic-task-${item.id}`,
      resourceId: item.id,
      title: `专题学习：${item.title}`,
      week: item.week,
      stage,
      priority,
      done: false,
      createdAt: new Date().toISOString(),
    },
    ...topicTasks.value,
  ]
  persistTopicTasks()
  trackEvent('resource_ai_topic_add_task', { id: item.id, week: item.week, stage, priority })
}

function addNextStageTop2ToTasks() {
  const stage = nextSuggestedStage.value
  nextStageTop2.value.forEach((item) => addTopicTask(item, stage))
  trackEvent('resource_ai_topic_add_top2_tasks', { stage, count: nextStageTop2.value.length })
}

function syncToChecklist(item: LearningResource) {
  if (!import.meta.client) return
  const currentRaw = localStorage.getItem(CHECKLIST_STORAGE_KEY)
  const current = currentRaw
    ? (JSON.parse(currentRaw) as { form?: Record<string, string>; savedAt?: string })
    : { form: {} }

  const form = {
    ...(current.form || {}),
    project: current.form?.project || `专题学习转实战：${item.title}`,
    route: current.form?.route || 'RAG / Agent / Tool Use',
    scene_kpi:
      current.form?.scene_kpi || `本周完成资源并产出 1 份可复用材料：${item.title}`,
    eval_biz: current.form?.eval_biz || `来源：${item.source || '专题'}；完成标准：输出一段可面试复述的结论`,
  }
  localStorage.setItem(
    CHECKLIST_STORAGE_KEY,
    JSON.stringify({
      form,
      savedAt: new Date().toLocaleString('zh-CN'),
    }),
  )
  trackEvent('resource_ai_topic_to_checklist', { id: item.id, week: item.week })
  navigateTo('/tools/checklist?synced=1&from=ai-topics')
}

function exportOutcomePack() {
  if (!import.meta.client) return
  const completedArticles = aiTopicResources.value.filter((item) => completedTopicIds.value.includes(item.id))
  const completedTasks = topicTasks.value.filter((task) => task.done)
  const checklistRaw = localStorage.getItem(CHECKLIST_STORAGE_KEY)
  const checklist = checklistRaw
    ? (JSON.parse(checklistRaw) as { form?: Record<string, string>; savedAt?: string })
    : null
  const keyConclusion = checklist?.form?.eval_biz || checklist?.form?.scene_kpi || '建议补充清单结论后再次导出'

  const lines: string[] = [
    '# 大模型与智能体阶段成果包',
    '',
    `导出时间：${new Date().toLocaleString('zh-CN')}`,
    `学习进度：${completedCount.value}/${totalCount.value}（${overallProgressPct.value}%）`,
    `阶段打卡：${stageDoneCount.value}/${stageOrder.length}`,
    '',
    '## 阶段完成情况',
    ...stageOrder.map((stage) => {
      const c = stageCompletion(stage)
      return `- ${stageMeta[stage].title}：${c.done}/${c.total}（${c.pct}%）${stageCheckins.value[stage] ? ' · 已打卡' : ''}`
    }),
    '',
    '## 已完成专题文章',
    ...(completedArticles.length
      ? completedArticles.map((item) => `- W${item.week} · ${item.title}`)
      : ['- 暂无（建议先完成 1-2 篇核心文章）']),
    '',
    '## 已完成专题任务',
    ...(completedTasks.length
      ? completedTasks.map((task) => `- [${task.priority}] W${task.week} · ${task.title}`)
      : ['- 暂无（建议先在任务池完成高优先级任务）']),
    '',
    '## 清单链接与结论',
    '- 决策清单页：/tools/checklist',
    `- 关键结论：${keyConclusion}`,
    '',
  ]

  const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `ai-topic-outcome-pack-${Date.now()}.md`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  outcomeExported.value = true
  trackEvent('topic_outcome_pack_exported', {
    completedArticles: completedArticles.length,
    completedTasks: completedTasks.length,
    progress: overallProgressPct.value,
  })
  setTimeout(() => {
    outcomeExported.value = false
  }, 1800)
}

onMounted(() => {
  if (import.meta.client) {
    try {
      const raw = localStorage.getItem(AI_TOPIC_PROGRESS_KEY)
      if (raw) {
        const ids = JSON.parse(raw) as string[]
        completedTopicIds.value = Array.isArray(ids) ? ids : []
      }
    } catch {
      // noop
    }

    try {
      const raw = localStorage.getItem(AI_TOPIC_STAGE_CHECKIN_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Record<TopicStage, boolean>>
        stageOrder.forEach((stage) => {
          stageCheckins.value[stage] = Boolean(parsed[stage])
        })
      }
    } catch {
      // noop
    }

    try {
      const raw = localStorage.getItem(AI_TOPIC_TASKS_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as Array<Partial<TopicWeeklyTask>>
        topicTasks.value = Array.isArray(parsed)
          ? parsed.map((task) => ({
              id: String(task.id || ''),
              resourceId: String(task.resourceId || ''),
              title: String(task.title || ''),
              week: Number(task.week || 1),
              stage: (task.stage as TopicStage) || 'foundation',
              priority: (task.priority as TopicWeeklyTask['priority']) || 'medium',
              done: Boolean(task.done),
              createdAt: String(task.createdAt || new Date().toISOString()),
            }))
          : []
      }
    } catch {
      // noop
    }
  }

  trackEvent('resource_ai_topic_view', {
    count: aiTopicResources.value.length,
  })
})
</script>

<template>
  <div class="space-y-6">
    <section class="rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50 p-6">
      <h1 class="text-2xl font-bold text-primary">大模型与智能体专题</h1>
      <p class="mt-2 text-sm text-slate-600">
        按「入门 -> 架构 -> 治理 -> 面试」组织，适合 AI PM / AI 总监按周沉淀可复用方法。
      </p>
      <div class="mt-4 rounded-xl border border-indigo-200 bg-white p-4">
        <div class="flex flex-wrap items-center justify-between gap-2 text-sm">
          <p class="font-medium text-primary">学习进度：{{ completedCount }}/{{ totalCount }}（{{ overallProgressPct }}%）</p>
          <p class="text-xs text-slate-500">阶段打卡：{{ stageDoneCount }}/{{ stageOrder.length }}</p>
        </div>
        <div class="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            class="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all"
            :style="{ width: `${overallProgressPct}%` }"
          />
        </div>
      </div>
      <div class="mt-4 rounded-xl border border-indigo-200 bg-white p-4">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p class="text-sm font-medium text-primary">下一阶段推荐：{{ stageMeta[nextSuggestedStage].title }}</p>
            <p class="mt-1 text-xs text-slate-600">
              已为你挑选 {{ nextStageTop2.length }} 条优先资料，可一键加入周任务中心执行。
            </p>
          </div>
          <button
            type="button"
            class="rounded-full border border-indigo-300 bg-indigo-50 px-3 py-1 text-xs text-indigo-700 hover:bg-indigo-100"
            @click="addNextStageTop2ToTasks"
          >
            一键加入下一阶段 Top2
          </button>
        </div>
        <div class="mt-3 grid gap-2 sm:grid-cols-2">
          <div
            v-for="item in nextStageTop2"
            :key="`next-stage-${item.id}`"
            class="rounded-lg border border-slate-200 bg-slate-50 p-3"
          >
            <p class="text-xs text-slate-500">W{{ item.week }} · {{ difficulty(item) }}</p>
            <p class="mt-1 text-sm font-medium text-primary">{{ item.title }}</p>
            <p class="mt-1 text-[11px] text-slate-500">{{ priorityLabel(taskPriorityByStage(nextSuggestedStage)) }}</p>
            <div class="mt-2 flex items-center gap-3 text-xs">
              <button
                type="button"
                class="text-primary hover:underline"
                @click="addTopicTask(item, nextSuggestedStage)"
              >
                加入周任务
              </button>
              <NuxtLink :to="{ path: '/resources/view', query: { id: item.id } }" class="text-accent hover:underline">
                网页内阅读
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>
      <div class="mt-4 flex flex-wrap items-center gap-3 text-sm">
        <NuxtLink to="/resources" class="text-accent hover:underline">返回学习资源中心</NuxtLink>
        <NuxtLink to="/tools/checklist" class="text-accent hover:underline">直接去决策清单</NuxtLink>
        <NuxtLink to="/tasks" class="text-accent hover:underline">去周任务中心安排本周行动</NuxtLink>
        <button
          type="button"
          class="rounded-full border border-indigo-300 bg-white px-3 py-1 text-xs text-indigo-700 hover:bg-indigo-50"
          @click="exportOutcomePack"
        >
          {{ outcomeExported ? '成果包已导出' : '导出阶段成果包' }}
        </button>
        <span class="rounded-full border border-indigo-200 bg-white px-3 py-1 text-xs text-indigo-700">
          已收录 {{ aiTopicResources.length }} 篇专题文章
        </span>
      </div>
    </section>

    <section class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <article
        v-for="stage in stageOrder"
        :key="stage"
        class="rounded-xl border border-slate-200 bg-white p-4"
      >
        <p class="text-sm font-semibold text-primary">{{ stageMeta[stage].title }}</p>
        <p class="mt-1 text-xs text-slate-600">{{ stageMeta[stage].desc }}</p>
        <p class="mt-3 text-xs text-slate-500">
          当前 {{ groupedResources[stage].length }} 篇 · 已完成 {{ stageCompletion(stage).done }}/{{ stageCompletion(stage).total }}
        </p>
        <button
          type="button"
          class="mt-2 rounded-full border px-2.5 py-1 text-xs"
          :class="stageCheckins[stage] ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-600'"
          @click="toggleStageCheckin(stage)"
        >
          {{ stageCheckins[stage] ? '已完成该阶段打卡' : '标记阶段完成' }}
        </button>
      </article>
    </section>

    <section
      v-for="stage in stageOrder"
      :key="`section-${stage}`"
      class="rounded-2xl border border-slate-200 bg-white p-5"
    >
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 class="text-lg font-semibold text-primary">{{ stageMeta[stage].title }}</h2>
          <p class="mt-1 text-xs text-slate-600">{{ stageMeta[stage].desc }}</p>
        </div>
        <span class="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600">
          {{ groupedResources[stage].length }} 篇 · 完成率 {{ stageCompletion(stage).pct }}%
        </span>
      </div>

      <div v-if="groupedResources[stage].length" class="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <article
          v-for="item in groupedResources[stage]"
          :key="item.id"
          class="rounded-xl border border-slate-100 bg-slate-50 p-4"
        >
          <p class="text-xs text-slate-500">W{{ item.week }} · {{ durationLabel(item) }} · {{ difficulty(item) }}</p>
          <h3 class="mt-1 font-medium text-primary">{{ item.title }}</h3>
          <p class="mt-1 text-xs text-slate-600">{{ item.summary }}</p>
          <div class="mt-2 flex flex-wrap items-center gap-2">
            <span class="rounded bg-indigo-50 px-2 py-0.5 text-[11px] text-indigo-700">
              {{ item.source || '专题资料' }}
            </span>
            <span class="rounded bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
              {{ item.tags.join(' · ') }}
            </span>
          </div>
          <div class="mt-3 flex flex-wrap items-center gap-3 text-xs">
            <a
              :href="resolveResourceLink(item)"
              target="_blank"
              rel="noopener noreferrer"
              class="text-accent hover:underline"
              @click="onOpenResource(item)"
            >
              直接阅读 →
            </a>
            <NuxtLink
              :to="{ path: '/resources/view', query: { id: item.id } }"
              class="text-accent hover:underline"
            >
              网页内阅读
            </NuxtLink>
            <button type="button" class="text-primary hover:underline" @click="syncToChecklist(item)">
              同步到清单
            </button>
            <button
              type="button"
              class="hover:underline"
              :class="isTopicCompleted(item.id) ? 'text-emerald-700' : 'text-slate-600'"
              @click="toggleTopicCompleted(item.id)"
            >
              {{ isTopicCompleted(item.id) ? '已完成打卡' : '标记已完成' }}
            </button>
          </div>
        </article>
      </div>
      <p v-else class="mt-3 text-xs text-slate-500">该阶段暂未配置内容。</p>
    </section>
  </div>
</template>
