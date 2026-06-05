<script setup lang="ts">
import {
  EVAL_LAB_STORAGE_KEY,
  evalScenarios,
  buildEvalReport,
  evalCompletionScore,
  type EvalLabState,
} from '~/lib/eval-lab'
import { trackEvent } from '~/lib/analytics'
import { makeShareSlug } from '~/lib/share-payload'

const defaultState = (): EvalLabState => ({
  scenarioId: evalScenarios[0]!.id,
  project: '',
  metrics: [...evalScenarios[0]!.defaultMetrics] as [string, string, string],
  metricTargets: ['', '', ''],
  badcases: '',
  actions: '',
  updatedAt: new Date().toISOString(),
})

const state = reactive<EvalLabState>(defaultState())
const savedAt = ref('')
const copied = ref(false)
const publishedUrl = ref('')

const scenario = computed(() => evalScenarios.find((s) => s.id === state.scenarioId))
const report = computed(() => buildEvalReport(state))
const score = computed(() => evalCompletionScore(state))

onMounted(() => {
  if (!import.meta.client) return
  trackEvent('eval_lab_view')
  try {
    const raw = localStorage.getItem(EVAL_LAB_STORAGE_KEY)
    if (!raw) return
    Object.assign(state, JSON.parse(raw) as EvalLabState)
  } catch {
    // noop
  }
})

function persist() {
  if (!import.meta.client) return
  state.updatedAt = new Date().toISOString()
  localStorage.setItem(EVAL_LAB_STORAGE_KEY, JSON.stringify(state))
  savedAt.value = new Date().toLocaleString('zh-CN')
}

function selectScenario(id: string) {
  state.scenarioId = id
  const s = evalScenarios.find((item) => item.id === id)
  if (s) state.metrics = [...s.defaultMetrics] as [string, string, string]
  persist()
  trackEvent('eval_lab_scenario_change', { scenarioId: id })
}

watch(
  () => [state.project, state.metrics, state.metricTargets, state.badcases, state.actions],
  () => persist(),
  { deep: true },
)

async function copyReport() {
  if (!import.meta.client || !navigator.clipboard) return
  await navigator.clipboard.writeText(report.value)
  copied.value = true
  trackEvent('eval_lab_report_copy')
  setTimeout(() => {
    copied.value = false
  }, 1500)
}

async function publishShare() {
  if (!import.meta.client) return
  const slug = makeShareSlug(state.project || 'eval-report')
  const highlights = state.metrics.filter(Boolean)
  try {
    const res = await $fetch<{ ok: boolean; url: string }>('/api/share/publish', {
      method: 'POST',
      body: {
        slug,
        title: `Eval 报告 · ${state.project || '未命名项目'}`,
        subtitle: scenario.value?.title || '',
        kind: 'eval-lab',
        score: score.value,
        highlights,
        body: report.value,
      },
    })
    publishedUrl.value = res.url
    trackEvent('eval_lab_publish_share', { score: score.value })
  } catch {
    // noop
  }
}
</script>

<template>
  <div class="space-y-8">
    <section class="glass-panel rounded-2xl border border-slate-200 p-6">
      <h1 class="text-2xl font-bold text-primary">Eval Lab</h1>
      <p class="mt-2 text-slate-600">对标竞品评测模块：选场景 → 定 3 指标 → 录 Badcase → 出 Eval 报告。完成度 {{ score }} 分。</p>
    </section>

    <section class="flex flex-wrap gap-2">
      <button
        v-for="s in evalScenarios"
        :key="s.id"
        type="button"
        class="rounded-full border px-4 py-1.5 text-sm"
        :class="state.scenarioId === s.id ? 'border-accent bg-accent-muted/30 text-accent' : 'border-slate-200'"
        @click="selectScenario(s.id)"
      >
        {{ s.title }}
      </button>
    </section>

    <div class="grid gap-6 lg:grid-cols-2">
      <section class="space-y-4">
        <article class="rounded-2xl border border-slate-200 bg-white p-5">
          <label class="text-sm font-medium text-primary">项目名称</label>
          <input
            v-model="state.project"
            type="text"
            class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="例如：客服 Copilot V1"
          />
          <p v-if="scenario" class="mt-2 text-xs text-slate-500">{{ scenario.desc }}</p>
        </article>

        <article class="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 class="text-sm font-semibold text-primary">核心指标（3 个）</h2>
          <div v-for="i in 3" :key="i" class="mt-3 grid gap-2 sm:grid-cols-2">
            <input
              v-model="state.metrics[i - 1]"
              type="text"
              class="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="指标名"
            />
            <input
              v-model="state.metricTargets[i - 1]"
              type="text"
              class="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="目标值"
            />
          </div>
        </article>

        <article class="rounded-2xl border border-slate-200 bg-white p-5">
          <label class="text-sm font-medium text-primary">Badcase Top 清单</label>
          <textarea
            v-model="state.badcases"
            rows="5"
            class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="按类型列出：幻觉 / 漏召回 / 格式错误 / 合规风险..."
          />
        </article>

        <article class="rounded-2xl border border-slate-200 bg-white p-5">
          <label class="text-sm font-medium text-primary">改进动作</label>
          <textarea
            v-model="state.actions"
            rows="4"
            class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Prompt 调整 / 数据补标 / 流程兜底 / 模型升级..."
          />
        </article>
      </section>

      <section class="space-y-4">
        <article class="rounded-2xl border border-accent/20 bg-white p-5">
          <div class="flex items-center justify-between gap-2">
            <h2 class="font-semibold text-primary">Eval 报告预览</h2>
            <span class="text-lg font-bold text-accent">{{ score }}分</span>
          </div>
          <pre class="mt-3 max-h-96 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-xs text-slate-700">{{ report }}</pre>
          <div class="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              class="rounded-lg bg-accent px-4 py-2 text-sm text-white hover:bg-accent-hover"
              @click="copyReport"
            >
              {{ copied ? '已复制' : '复制报告' }}
            </button>
            <button
              type="button"
              class="rounded-lg border border-primary px-4 py-2 text-sm text-primary hover:bg-slate-50"
              @click="publishShare"
            >
              发布公开成果页
            </button>
            <NuxtLink to="/tools/homework?type=eval-lab" class="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50">
              提交作业反馈
            </NuxtLink>
          </div>
          <p v-if="savedAt" class="mt-2 text-xs text-slate-500">已保存：{{ savedAt }}</p>
          <p v-if="publishedUrl" class="mt-1 text-xs text-emerald-700">
            <NuxtLink :to="publishedUrl" class="underline">{{ publishedUrl }}</NuxtLink>
          </p>
        </article>
      </section>
    </div>
  </div>
</template>
