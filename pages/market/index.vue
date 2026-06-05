<script setup lang="ts">
import { computeJobFit, roleProfiles, jobRequirements } from '~/lib/job-market'
import type { RoleLevel } from '~/lib/job-market'
import { dimLabels } from '~/lib/scoring'

const { result, loadFromStorage } = useAssessment()
onMounted(() => loadFromStorage())

const role = ref<RoleLevel>('ai-pm')

const fit = computed(() => {
  if (!result.value) return null
  return computeJobFit(result.value, role.value)
})

const baseReqs = computed(() =>
  jobRequirements.filter((item) => item.role === 'both' || item.role === role.value),
)

function badgeClass(status: 'strong' | 'neutral' | 'gap') {
  if (status === 'strong') return 'bg-emerald-100 text-emerald-700'
  if (status === 'gap') return 'bg-amber-100 text-amber-800'
  return 'bg-slate-100 text-slate-600'
}

function badgeText(status: 'strong' | 'neutral' | 'gap') {
  if (status === 'strong') return '匹配高'
  if (status === 'gap') return '短板'
  return '待加强'
}
</script>

<template>
  <div class="space-y-8">
    <section class="glass-panel rounded-2xl border border-slate-200 p-6">
      <h1 class="text-2xl font-bold text-primary">招聘对标中心</h1>
      <p class="mt-2 text-slate-600">
        把 AI PM / AI 总监招聘要求拆成可执行能力项，映射到你当前分数与平台动作。
      </p>
      <div class="mt-4 grid gap-3 sm:grid-cols-3">
        <div class="rounded-xl border border-slate-200 bg-white p-3">
          <p class="text-xs text-slate-500">岗位视角</p>
          <p class="mt-1 text-base font-semibold text-primary">{{ roleProfiles[role].title }}</p>
        </div>
        <div class="rounded-xl border border-slate-200 bg-white p-3">
          <p class="text-xs text-slate-500">高频要求</p>
          <p class="mt-1 text-base font-semibold text-primary">{{ baseReqs.length }} 项</p>
        </div>
        <div class="rounded-xl border border-slate-200 bg-white p-3">
          <p class="text-xs text-slate-500">当前状态</p>
          <p class="mt-1 text-base font-semibold text-primary">{{ fit ? `${fit.overallPct}%` : '待自测' }}</p>
        </div>
      </div>
    </section>

    <section class="grid gap-4 sm:grid-cols-2">
      <button
        v-for="(profile, key) in roleProfiles"
        :key="key"
        type="button"
        class="rounded-xl border bg-surface p-5 text-left transition-colors"
        :class="
          role === key
            ? 'border-accent ring-1 ring-accent/30'
            : 'border-slate-200 hover:border-slate-300'
        "
        @click="role = key as RoleLevel"
      >
        <h2 class="font-semibold text-primary">{{ profile.title }}</h2>
        <p class="mt-1 text-sm text-slate-600">{{ profile.experience }}</p>
        <div class="mt-3 flex flex-wrap gap-2">
          <span
            v-for="h in profile.highlights"
            :key="h"
            class="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
          >
            {{ h }}
          </span>
        </div>
      </button>
    </section>

    <section
      v-if="fit"
      class="rounded-2xl border border-accent/30 bg-accent-muted/30 p-5 space-y-3"
    >
      <div class="flex items-center justify-between gap-3">
        <h3 class="font-semibold text-primary">你的 JD 匹配度</h3>
        <p class="text-2xl font-bold text-accent">{{ fit.overallPct }}%</p>
      </div>
      <p class="text-sm text-slate-600">{{ fit.matchedStage }}</p>

      <div v-if="fit.topGaps.length" class="space-y-2">
        <p class="text-sm font-medium text-amber-700">优先补的 3 个招聘短板</p>
        <div
          v-for="item in fit.topGaps"
          :key="item.requirement.id"
          class="rounded-lg border border-amber-200 bg-white p-3 text-sm"
        >
          <p class="font-medium text-primary">{{ item.requirement.title }}</p>
          <p class="mt-1 text-slate-600">{{ item.suggestion }}</p>
          <NuxtLink :to="item.requirement.actionTo" class="mt-2 inline-block text-accent hover:underline">
            {{ item.requirement.actionLabel }} →
          </NuxtLink>
        </div>
      </div>
    </section>

    <section v-else class="rounded-2xl border border-dashed border-slate-300 p-6 text-center">
      <p class="text-slate-600">先完成自测，自动生成你的招聘对标结果。</p>
      <NuxtLink to="/assessment" class="mt-3 inline-block text-accent font-medium hover:underline">
        去自测 →
      </NuxtLink>
    </section>

    <section class="rounded-2xl border border-slate-200 bg-white p-5">
      <h3 class="font-semibold text-primary">JD 要求与平台动作映射</h3>
      <div class="mt-4 space-y-3">
        <article
          v-for="req in fit ? fit.items : baseReqs.map((requirement) => ({ requirement, status: 'neutral', score: 0, suggestion: '' }))"
          :key="req.requirement.id"
          class="rounded-xl border border-slate-100 bg-slate-50 p-4"
        >
          <div class="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p class="font-medium text-primary">{{ req.requirement.title }}</p>
              <p class="mt-1 text-sm text-slate-600">{{ req.requirement.summary }}</p>
              <div class="mt-2 flex flex-wrap gap-1">
                <span
                  v-for="dim in req.requirement.dimensions"
                  :key="dim"
                  class="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
                >
                  {{ dimLabels[dim] }}
                </span>
              </div>
            </div>
            <span
              v-if="fit"
              class="rounded-full px-2 py-0.5 text-xs"
              :class="badgeClass(req.status)"
            >
              {{ badgeText(req.status) }} · {{ req.score }}
            </span>
          </div>
          <NuxtLink :to="req.requirement.actionTo" class="mt-3 inline-block text-sm text-accent hover:underline">
            去做：{{ req.requirement.actionLabel }} →
          </NuxtLink>
        </article>
      </div>
    </section>

    <section class="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
      <p class="font-medium text-slate-700 mb-1">参考来源</p>
      <p>
        - <a class="text-accent hover:underline" href="https://www.zhipin.com/web/geek/jobs" target="_blank" rel="noopener noreferrer">BOSS 直聘</a>
        - <a class="text-accent hover:underline" href="https://www.woshipm.com/ai/6348259.html" target="_blank" rel="noopener noreferrer">人人都是产品经理（AI PM JD 解读）</a>
      </p>
      <p>
        - <a class="text-accent hover:underline" href="https://www.woshipm.com/share/6402013.html" target="_blank" rel="noopener noreferrer">AI PM 面试四步法</a>
        - <a class="text-accent hover:underline" href="https://www.nowcoder.com/discuss/876802837026529280" target="_blank" rel="noopener noreferrer">牛客 2026 AI PM 能力清单</a>
      </p>
    </section>
  </div>
</template>
