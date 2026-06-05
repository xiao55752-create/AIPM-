<script setup lang="ts">
import { CHECKLIST_STORAGE_KEY } from '~/lib/checklist'
import { dimLabels, weakTips } from '~/lib/scoring'
import { computeJobFit, roleProfiles } from '~/lib/job-market'
import type { RoleLevel } from '~/lib/job-market'
import { trackEvent } from '~/lib/analytics'
import { PAY_CTA_FORCE_VARIANT_KEY, REPORT_CTA_FORCE_VARIANT_KEY } from '~/lib/ab-experiment'
import { resources } from '~/lib/resources'

const { result, loadFromStorage } = useAssessment()
const REPORT_CTA_VARIANT_KEY = 'apgc-report-cta-variant'
onMounted(() => {
  loadFromStorage()
  if (!import.meta.client) return
  const forced = localStorage.getItem(REPORT_CTA_FORCE_VARIANT_KEY)
  if (forced === 'A' || forced === 'B') {
    reportCtaVariant.value = forced
    localStorage.setItem(REPORT_CTA_VARIANT_KEY, forced)
    trackEvent('report_ab_variant_exposed', { variant: forced, forced: true })
    return
  }
  const existing = localStorage.getItem(REPORT_CTA_VARIANT_KEY)
  const variant = existing === 'B' ? 'B' : existing === 'A' ? 'A' : Math.random() < 0.5 ? 'A' : 'B'
  localStorage.setItem(REPORT_CTA_VARIANT_KEY, variant)
  reportCtaVariant.value = variant
  trackEvent('report_ab_variant_exposed', { variant, forced: false })
})

const campCta = computed(() => {
  const m = result.value?.campMatch
  if (m === '高') return '与第 1 期成长营匹配度高'
  if (m === '中') return '建议先完成免费 W1～W2，再考虑第 1 期'
  return '可收藏路径；第 1 期偏 3～10 年进阶 PM'
})

const role = ref<RoleLevel>('ai-pm')
const AI_TOPIC_TASKS_KEY = 'apgc-ai-topic-weekly-tasks-v1'
const reportCtaVariant = ref<'A' | 'B'>('A')
const fit = computed(() => {
  if (!result.value) return null
  return computeJobFit(result.value, role.value)
})

const dimOrder = ['D1', 'D2', 'D3', 'D4', 'D5', 'D6'] as const
const syncedToChecklist = ref(false)
const trialStarted = ref(false)
const topWeakTag = computed(() => result.value?.weakest?.[0] || 'D1')
const tasksCtaText = computed(() =>
  reportCtaVariant.value === 'A' ? '进入周任务中心（主动作）' : '先执行今天的关键任务（推荐）',
)
const trialCtaText = computed(() =>
  reportCtaVariant.value === 'A' ? '开始试学 7 天（导入任务包）' : '先试学 7 天，再决定是否报名',
)

const careerSteps = computed(() => [
  {
    id: 'position',
    title: '1. 定位',
    desc: `当前阶段 ${result.value?.stage || '—'}，对标 ${roleProfiles[role.value].title}`,
    to: '/market',
    event: 'career_step_position',
  },
  {
    id: 'project',
    title: '2. 选项目',
    desc: '从项目 Lab 选一个可写进简历的实战（MVP / RAG / Eval）',
    to: '/tools/project-lab',
    event: 'career_step_project',
  },
  {
    id: 'resume',
    title: '3. 写简历',
    desc: '用清单导出 STAR 与简历条目，绑定真实指标',
    to: '/tools/checklist',
    event: 'career_step_resume',
  },
  {
    id: 'interview',
    title: '4. 模拟面试',
    desc: '按招聘对标缺口准备 3 个追问与项目叙事',
    to: '/tools/narrative',
    event: 'career_step_interview',
  },
])

function goCareerStep(to: string, event: string) {
  trackEvent(event, { stage: result.value?.stage, role: role.value })
  navigateTo(to)
}

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

watch(
  () => result.value,
  (val, prev) => {
    if (!val || prev) return
    trackEvent('report_view', {
      stage: val.stage,
      startWeek: val.startWeek,
    })
  },
  { immediate: true },
)

function syncToChecklist() {
  if (!import.meta.client || !result.value) return
  try {
    const currentRaw = localStorage.getItem(CHECKLIST_STORAGE_KEY)
    const current = currentRaw
      ? (JSON.parse(currentRaw) as { form?: Record<string, string>; savedAt?: string })
      : { form: {} }

    const today = new Date().toISOString().slice(0, 10)
    const weakestDims = result.value.weakest.map((d) => dimLabels[d]).join('、')

    const nextForm: Record<string, string> = {
      ...(current.form || {}),
      project: current.form?.project || `成长路径执行计划（W${result.value.startWeek}起）`,
      owner: current.form?.owner || '我',
      date: today,
      decision: current.form?.decision || '推进试点',
      route: current.form?.route || 'RAG + Agent 小范围试点',
      scene_user: current.form?.scene_user || result.value.profileSentence,
      scene_kpi:
        current.form?.scene_kpi ||
        `12周内补强维度：${weakestDims}；本周一件事：${result.value.weeklyAction}`,
      eval_biz:
        current.form?.eval_biz ||
        `重点周（W${result.value.focusWeeks.join('/W') || '待定'}）完成一次可量化复盘并形成结果记录`,
    }

    localStorage.setItem(
      CHECKLIST_STORAGE_KEY,
      JSON.stringify({
        form: nextForm,
        savedAt: new Date().toLocaleString('zh-CN'),
      }),
    )
    trackEvent('report_sync_to_checklist', {
      stage: result.value.stage,
      startWeek: result.value.startWeek,
    })
    syncedToChecklist.value = true
    setTimeout(() => {
      syncedToChecklist.value = false
    }, 1800)
  } catch {
    // noop
  }
}

function goTasks() {
  if (result.value) {
    trackEvent('report_cta_primary_tasks', {
      stage: result.value.stage,
      startWeek: result.value.startWeek,
      variant: reportCtaVariant.value,
    })
  }
  navigateTo('/tasks')
}

function goResources() {
  if (result.value) {
    trackEvent('report_cta_secondary_resources', {
      weakTag: topWeakTag.value,
      startWeek: result.value.startWeek,
    })
  }
  navigateTo({
    path: '/resources',
    query: { tag: topWeakTag.value, from: 'report' },
  })
}

function stageByWeek(week: number): TopicWeeklyTask['stage'] {
  if (week <= 4) return 'foundation'
  if (week <= 6) return 'architecture'
  if (week <= 9) return 'governance'
  return 'interview'
}

function priorityByWeek(week: number): TopicWeeklyTask['priority'] {
  if (week <= 6) return 'high'
  if (week <= 9) return 'medium'
  return 'low'
}

function startTrialPlan() {
  if (!import.meta.client || !result.value) return
  const candidates = resources
    .filter((item) => item.tags.includes(topWeakTag.value))
    .sort((a, b) => a.week - b.week)
    .slice(0, 3)

  const raw = localStorage.getItem(AI_TOPIC_TASKS_KEY)
  const existing = raw ? (JSON.parse(raw) as TopicWeeklyTask[]) : []
  const merged = [...existing]
  for (const item of candidates) {
    if (merged.some((task) => task.resourceId === item.id)) continue
    merged.unshift({
      id: `trial-task-${item.id}`,
      resourceId: item.id,
      title: `试学7天：${item.title}`,
      week: item.week,
      stage: stageByWeek(item.week),
      priority: priorityByWeek(item.week),
      done: false,
      createdAt: new Date().toISOString(),
    })
  }
  localStorage.setItem(AI_TOPIC_TASKS_KEY, JSON.stringify(merged.slice(0, 30)))
  trackEvent('trial_start', {
    weakTag: topWeakTag.value,
    startWeek: result.value.startWeek,
    added: candidates.length,
    variant: reportCtaVariant.value,
  })
  trialStarted.value = true
  navigateTo('/tasks?from=trial')
}
</script>

<template>
  <div v-if="result" class="space-y-8">
    <section class="glass-panel rounded-2xl border border-slate-200 p-6">
      <div class="grid gap-6 md:grid-cols-3">
        <div class="md:col-span-2">
          <h1 class="text-2xl font-bold text-primary">你的成长报告</h1>
          <p class="mt-2 text-slate-700">{{ result.profileSentence }}</p>
          <div class="mt-5 grid gap-3 sm:grid-cols-3">
            <div class="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <p class="text-xs text-slate-500">当前阶段</p>
              <p class="mt-1 text-lg font-semibold text-primary">{{ result.stage }}</p>
            </div>
            <div class="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <p class="text-xs text-slate-500">建议起始周</p>
              <p class="mt-1 text-lg font-semibold text-primary">W{{ result.startWeek }}</p>
            </div>
            <div class="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <p class="text-xs text-slate-500">重点周</p>
              <p class="mt-1 text-lg font-semibold text-primary">
                {{ result.focusWeeks.length ? `W${result.focusWeeks.join('/W')}` : '—' }}
              </p>
            </div>
          </div>
          <p class="mt-4 rounded-lg bg-accent-muted/40 p-3 text-sm text-slate-700">
            <strong>本周一件事：</strong>{{ result.weeklyAction }}
          </p>
        </div>
        <div class="rounded-2xl border border-accent/20 bg-accent-muted/30 p-4 shadow-sm">
          <p class="text-sm font-semibold text-primary">成长营建议</p>
          <p class="mt-2 text-sm text-slate-700">{{ campCta }}</p>
          <NuxtLink to="/camp" class="mt-4 inline-block text-sm font-medium text-accent hover:underline">
            了解成长营 →
          </NuxtLink>
        </div>
      </div>
    </section>

    <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 class="text-lg font-semibold text-primary">能力雷达与分项</h2>
      <div class="mt-4 grid gap-6 lg:grid-cols-2">
        <RadarChart :scores="result.scores" />
        <div class="space-y-2">
          <article
            v-for="d in dimOrder"
            :key="d"
            class="rounded-xl border border-slate-100 bg-slate-50 p-3"
          >
            <div class="mb-1 flex items-center justify-between">
              <p class="text-sm font-medium text-primary">{{ dimLabels[d] }}</p>
              <p class="text-sm font-semibold text-accent">{{ result.scores[d] }}</p>
            </div>
            <div class="h-1.5 rounded-full bg-slate-200">
              <div
                class="h-1.5 rounded-full bg-accent"
                :style="{ width: `${result.scores[d]}%` }"
              />
            </div>
          </article>
        </div>
      </div>
    </section>

    <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 class="text-lg font-semibold text-primary">优先补强</h2>
      <div class="mt-3 space-y-2 text-sm">
        <article
          v-for="d in result.weakest"
          :key="d"
          class="rounded-xl border border-amber-200 bg-amber-50 p-3"
        >
          <p class="font-medium text-amber-800">{{ dimLabels[d] }}</p>
          <p class="mt-1 text-slate-700">{{ weakTips[d] }}</p>
        </article>
      </div>
    </section>

    <section v-if="fit" class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <h2 class="text-lg font-semibold text-primary">招聘对标匹配度</h2>
        <div class="flex gap-2 text-xs">
          <button
            type="button"
            class="rounded-full border px-2.5 py-1"
            :class="role === 'ai-pm' ? 'border-accent bg-accent-muted/50 text-accent' : 'border-slate-200'"
            @click="role = 'ai-pm'"
          >
            AI PM
          </button>
          <button
            type="button"
            class="rounded-full border px-2.5 py-1"
            :class="role === 'ai-director' ? 'border-accent bg-accent-muted/50 text-accent' : 'border-slate-200'"
            @click="role = 'ai-director'"
          >
            AI 总监
          </button>
        </div>
      </div>
      <div class="mt-3 flex items-end justify-between">
        <p class="text-sm text-slate-600">对标 {{ roleProfiles[role].title }}</p>
        <p class="text-3xl font-bold text-accent">{{ fit.overallPct }}%</p>
      </div>
      <ul v-if="fit.topGaps.length" class="mt-4 space-y-2 text-sm">
        <li v-for="g in fit.topGaps" :key="g.requirement.id" class="rounded-lg bg-slate-50 p-3">
          <span class="font-medium text-primary">{{ g.requirement.title }}</span>
          <span class="text-slate-600"> · {{ g.suggestion }}</span>
          <NuxtLink :to="g.requirement.actionTo" class="ml-1 text-accent hover:underline">
            {{ g.requirement.actionLabel }} →
          </NuxtLink>
        </li>
      </ul>
      <NuxtLink to="/market" class="mt-3 inline-block text-sm font-medium text-accent hover:underline">
        查看完整招聘对标 →
      </NuxtLink>
    </section>

    <section class="rounded-2xl border border-accent/30 bg-white p-5 shadow-sm">
      <h2 class="text-lg font-semibold text-primary">下一步行动（推荐）</h2>
      <p class="mt-1 text-sm text-slate-600">先执行本周任务，再补学习短板，最后沉淀到清单形成可复用成果。</p>
      <button
        type="button"
        class="mt-4 w-full rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-white hover:bg-accent-hover sm:w-auto"
        @click="goTasks"
      >
        {{ tasksCtaText }}
      </button>
      <button
        type="button"
        class="mt-2 w-full rounded-xl border border-primary px-5 py-3 text-sm font-semibold text-primary hover:bg-slate-50 sm:ml-2 sm:mt-4 sm:w-auto"
        @click="startTrialPlan"
      >
        {{ trialStarted ? '已导入试学任务包' : trialCtaText }}
      </button>

      <div class="mt-4 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          class="rounded-xl border border-slate-200 bg-slate-50 p-4 text-left hover:border-accent"
          @click="goResources"
        >
          <p class="text-sm font-medium text-primary">补短板学习资源</p>
          <p class="mt-1 text-xs text-slate-600">已按你的最弱维度 {{ dimLabels[topWeakTag] }} 预筛选</p>
        </button>
        <NuxtLink
          to="/tools/checklist?synced=1"
          class="rounded-xl border border-slate-200 bg-slate-50 p-4 text-left hover:border-accent"
          @click="syncToChecklist"
        >
          <p class="text-sm font-medium text-primary">{{ syncedToChecklist ? '已同步到清单' : '同步本周下一步到清单' }}</p>
          <p class="mt-1 text-xs text-slate-600">用于生成 STAR、简历条目和求职包</p>
        </NuxtLink>
      </div>

      <div class="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
        <NuxtLink to="/path" class="hover:text-accent">查看完整路径</NuxtLink>
        <NuxtLink to="/tools/checklist" class="hover:text-accent">直接打开在线清单</NuxtLink>
        <NuxtLink to="/assessment/quiz" class="hover:text-accent">重新自测</NuxtLink>
      </div>
    </section>

    <section class="rounded-2xl border border-primary/20 bg-primary/5 p-5 shadow-sm">
      <h2 class="text-lg font-semibold text-primary">转岗 AI PM · 4 步路径</h2>
      <p class="mt-1 text-sm text-slate-600">对标起点/慕课「求职指南」，把报告结论落到可执行动作。</p>
      <div class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <button
          v-for="step in careerSteps"
          :key="step.id"
          type="button"
          class="rounded-xl border border-white bg-white p-4 text-left hover:border-accent"
          @click="goCareerStep(step.to, step.event)"
        >
          <p class="text-sm font-semibold text-primary">{{ step.title }}</p>
          <p class="mt-1 text-xs text-slate-600">{{ step.desc }}</p>
        </button>
      </div>
    </section>

    <p class="text-xs text-slate-400">
      本自测仅供参考，不构成职业或晋升承诺。请勿上传敏感信息。
    </p>
  </div>
  <div v-else class="text-center py-12">
    <p class="text-slate-600">暂无报告，请先完成自测。</p>
    <NuxtLink to="/assessment/quiz" class="mt-4 inline-block text-accent font-medium">
      开始答题 →
    </NuxtLink>
  </div>
</template>
