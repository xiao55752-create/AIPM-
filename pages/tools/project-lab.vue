<script setup lang="ts">
import {
  PROJECT_LAB_STORAGE_KEY,
  projectLabTemplates,
  computeProjectScore,
  type ProjectLabProgress,
} from '~/lib/project-lab'
import { trackEvent } from '~/lib/analytics'
import { demoProjectLabProgress } from '~/lib/demo-data'
import { makeShareSlug } from '~/lib/share-payload'

const activeId = ref(projectLabTemplates[0]!.id)
const progressMap = ref<Record<string, ProjectLabProgress>>({})
const savedAt = ref('')
const publishedUrl = ref('')
const publishError = ref('')

const template = computed(() => projectLabTemplates.find((p) => p.id === activeId.value)!)
const progress = computed(() => progressMap.value[activeId.value])
const score = computed(() => {
  const t = template.value
  const p = progress.value
  if (!t || !p) return 0
  return computeProjectScore(t, p.checklist)
})

onMounted(() => {
  if (!import.meta.client) return
  trackEvent('project_lab_view')
  try {
    const raw = localStorage.getItem(PROJECT_LAB_STORAGE_KEY)
    if (raw) progressMap.value = JSON.parse(raw) as Record<string, ProjectLabProgress>
  } catch {
    // noop
  }
  for (const t of projectLabTemplates) {
    if (!progressMap.value[t.id]) {
      progressMap.value[t.id] = {
        projectId: t.id,
        fields: {},
        checklist: {},
        updatedAt: new Date().toISOString(),
      }
    }
  }
})

function persist() {
  if (!import.meta.client) return
  localStorage.setItem(PROJECT_LAB_STORAGE_KEY, JSON.stringify(progressMap.value))
  savedAt.value = new Date().toLocaleString('zh-CN')
}

function setField(fieldId: string, value: string) {
  const cur = progressMap.value[activeId.value]!
  progressMap.value[activeId.value] = {
    ...cur,
    fields: { ...cur.fields, [fieldId]: value },
    updatedAt: new Date().toISOString(),
  }
  persist()
}

function toggleCheck(fieldId: string) {
  const cur = progressMap.value[activeId.value]!
  progressMap.value[activeId.value] = {
    ...cur,
    checklist: { ...cur.checklist, [fieldId]: !cur.checklist[fieldId] },
    updatedAt: new Date().toISOString(),
  }
  trackEvent('project_lab_deliverable_toggle', { projectId: activeId.value, fieldId })
  persist()
}

function addToTasks() {
  if (!import.meta.client) return
  const t = template.value
  const AI_TOPIC_TASKS_KEY = 'apgc-ai-topic-weekly-tasks-v1'
  const raw = localStorage.getItem(AI_TOPIC_TASKS_KEY)
  const existing = raw ? (JSON.parse(raw) as Array<Record<string, unknown>>) : []
  const taskId = `project-lab-${t.id}`
  if (existing.some((item) => item.id === taskId)) {
    navigateTo('/tasks?from=project-lab')
    return
  }
  existing.unshift({
    id: taskId,
    resourceId: `project-lab-${t.id}`,
    title: `项目Lab：${t.title}`,
    week: 1,
    stage: 'governance',
    priority: 'high',
    done: false,
    createdAt: new Date().toISOString(),
  })
  localStorage.setItem(AI_TOPIC_TASKS_KEY, JSON.stringify(existing.slice(0, 30)))
  trackEvent('project_lab_add_tasks', { projectId: t.id })
  navigateTo('/tasks?from=project-lab')
}

async function publishShare() {
  if (!import.meta.client) return
  publishError.value = ''
  publishedUrl.value = ''
  const t = template.value
  const p = progress.value!
  const highlights = t.deliverables
    .filter((d) => p.checklist[d.id])
    .map((d) => d.label)
  const body = t.deliverables
    .map((d) => `### ${d.label}\n${p.fields[d.id] || '（待填写）'}`)
    .join('\n\n')
  const slug = makeShareSlug(t.title)
  try {
    const res = await $fetch<{ ok: boolean; url: string }>('/api/share/publish', {
      method: 'POST',
      body: {
        slug,
        title: `项目 Lab · ${t.title}`,
        subtitle: t.subtitle,
        kind: 'project-lab',
        score: score.value,
        highlights,
        body: `${body}\n\n---\n简历一句话：${t.resumeLine}`,
      },
    })
    publishedUrl.value = res.url
    trackEvent('project_lab_publish_share', { projectId: t.id, score: score.value })
  } catch {
    publishError.value = '发布失败，请稍后重试'
  }
}

async function copyResumeLine() {
  if (!import.meta.client || !navigator.clipboard) return
  await navigator.clipboard.writeText(template.value.resumeLine)
  trackEvent('project_lab_copy_resume_line', { projectId: activeId.value })
}

function fillDemoProject() {
  activeId.value = demoProjectLabProgress.projectId
  progressMap.value[demoProjectLabProgress.projectId] = {
    projectId: demoProjectLabProgress.projectId,
    fields: demoProjectLabProgress.fields,
    checklist: demoProjectLabProgress.checklist,
    updatedAt: new Date().toISOString(),
  }
  persist()
  trackEvent('project_lab_demo_fill', { projectId: demoProjectLabProgress.projectId })
}
</script>

<template>
  <div class="space-y-8">
    <CorePathRibbon />

    <section class="glass-panel rounded-2xl border border-slate-200 p-6">
      <p class="inline-flex rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs text-primary">
        对标竞品 · 6 大项目实战
      </p>
      <h1 class="mt-3 text-2xl font-bold text-primary">项目 Lab</h1>
      <p class="mt-2 text-slate-600">
        3 个标准项目模板，产出可写进简历的 PRD / Eval / RAG 交付物。完成度 {{ score }} 分。
      </p>
      <div class="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          class="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100"
          @click="fillDemoProject"
        >
          一键填入参考样例
        </button>
        <NuxtLink to="/share/demo-copilot-eval" class="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-white">
          查看样例成果页
        </NuxtLink>
      </div>
    </section>

    <section class="flex flex-wrap gap-2">
      <button
        v-for="p in projectLabTemplates"
        :key="p.id"
        type="button"
        class="rounded-full border px-4 py-1.5 text-sm"
        :class="activeId === p.id ? 'border-accent bg-accent-muted/30 text-accent' : 'border-slate-200 text-slate-600'"
        @click="activeId = p.id"
      >
        {{ p.title }}
      </button>
    </section>

    <section class="grid gap-6 lg:grid-cols-3">
      <div class="lg:col-span-2 space-y-4">
        <article class="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 class="text-lg font-semibold text-primary">{{ template.title }}</h2>
          <p class="mt-1 text-sm text-slate-600">{{ template.subtitle }}</p>
          <p class="mt-2 text-xs text-slate-500">建议周期：{{ template.duration }}</p>
          <ul class="mt-3 list-disc pl-5 text-sm text-slate-700 space-y-1">
            <li v-for="o in template.outcomes" :key="o">{{ o }}</li>
          </ul>
        </article>

        <article
          v-for="d in template.deliverables"
          :key="d.id"
          class="rounded-2xl border bg-white p-5"
          :class="progress?.checklist[d.id] ? 'border-emerald-200' : 'border-slate-200'"
        >
          <div class="flex items-start justify-between gap-2">
            <div>
              <h3 class="font-medium text-primary">{{ d.label }}</h3>
              <p class="mt-1 text-xs text-slate-500">{{ d.hint }}</p>
            </div>
            <button
              type="button"
              class="shrink-0 rounded-full border px-3 py-1 text-xs"
              :class="progress?.checklist[d.id] ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-slate-200'"
              @click="toggleCheck(d.id)"
            >
              {{ progress?.checklist[d.id] ? '已完成' : '标记完成' }}
            </button>
          </div>
          <textarea
            :value="progress?.fields[d.id] || ''"
            rows="3"
            class="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-accent focus:outline-none"
            :placeholder="d.hint"
            @input="setField(d.id, ($event.target as HTMLTextAreaElement).value)"
          />
        </article>
      </div>

      <aside class="space-y-4">
        <article class="rounded-2xl border border-accent/20 bg-accent-muted/20 p-5">
          <h3 class="font-semibold text-primary">评审 Rubric</h3>
          <ul class="mt-3 space-y-2 text-sm">
            <li v-for="r in template.rubric" :key="r.criterion" class="flex justify-between">
              <span class="text-slate-700">{{ r.criterion }}</span>
              <span class="text-slate-500">{{ r.weight }}%</span>
            </li>
          </ul>
          <p class="mt-3 text-2xl font-bold text-accent">{{ score }}<span class="text-sm font-normal text-slate-500"> / 100</span></p>
        </article>

        <article class="rounded-2xl border border-slate-200 bg-white p-5 text-sm">
          <p class="font-medium text-primary">简历一句话</p>
          <p class="mt-2 text-slate-700">{{ template.resumeLine }}</p>
          <button type="button" class="mt-3 text-xs text-accent hover:underline" @click="copyResumeLine">
            复制到剪贴板
          </button>
        </article>

        <div class="flex flex-col gap-2">
          <button
            type="button"
            class="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
            @click="addToTasks"
          >
            加入周任务池
          </button>
          <button
            type="button"
            class="rounded-lg border border-primary px-4 py-2 text-sm font-medium text-primary hover:bg-slate-50"
            @click="publishShare"
          >
            发布公开成果页
          </button>
          <NuxtLink to="/tools/eval-lab" class="rounded-lg border border-slate-300 px-4 py-2 text-sm text-center hover:bg-slate-50">
            配套 Eval Lab →
          </NuxtLink>
          <NuxtLink to="/tools/homework?type=project-lab" class="rounded-lg border border-slate-300 px-4 py-2 text-sm text-center hover:bg-slate-50">
            提交作业反馈 →
          </NuxtLink>
          <NuxtLink to="/tools/showcase" class="rounded-lg border border-violet-200 bg-violet-50/50 px-4 py-2 text-sm text-center hover:bg-violet-50">
            路演 Demo Rubric →
          </NuxtLink>
          <p v-if="savedAt" class="text-xs text-slate-500">已保存：{{ savedAt }}</p>
          <p v-if="publishedUrl" class="text-xs text-emerald-700">
            已发布：
            <NuxtLink :to="publishedUrl" class="underline">{{ publishedUrl }}</NuxtLink>
          </p>
          <p v-if="publishError" class="text-xs text-rose-600">{{ publishError }}</p>
        </div>
      </aside>
    </section>
  </div>
</template>
