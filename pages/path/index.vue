<script setup lang="ts">
import { weeks, weekStatusLabels } from '~/lib/weeks'
import type { WeekStatus } from '~/lib/scoring'

const { result, loadFromStorage } = useAssessment()
onMounted(() => loadFromStorage())

function statusFor(week: number): WeekStatus {
  return result.value?.weekStatuses[week] ?? (week <= 2 ? 'active' : 'review')
}

function statusClass(s: WeekStatus) {
  if (s === 'focus') return 'border-l-4 border-l-accent bg-accent-muted/30'
  if (s === 'skim') return 'opacity-70 border-l-4 border-l-slate-300'
  if (s === 'review') return 'opacity-60 border-l-4 border-l-slate-200'
  return 'border-l-4 border-l-primary/40'
}
</script>

<template>
  <div class="space-y-8">
    <div>
      <h1 class="text-2xl font-bold text-primary">我的 12 周路径</h1>
      <p v-if="result" class="mt-2 text-slate-600">
        {{ result.stage }} · 建议从第 {{ result.startWeek }} 周开始
        <span v-if="result.focusWeeks.length"> · 重点周 W{{ result.focusWeeks.join(', W') }}</span>
      </p>
      <p v-else class="mt-2 text-slate-600">
        完成
        <NuxtLink to="/assessment" class="text-accent underline">自测</NuxtLink>
        后，路径将个性化高亮。
      </p>
    </div>

    <div class="space-y-3">
      <article
        v-for="w in weeks"
        :key="w.week"
        class="rounded-xl border border-slate-200 bg-surface p-5"
        :class="statusClass(statusFor(w.week))"
      >
        <div class="flex flex-wrap items-center gap-2 mb-2">
          <span class="font-bold text-primary">W{{ w.week }}</span>
          <span class="text-sm font-medium">{{ w.title }}</span>
          <span
            class="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
          >
            {{ weekStatusLabels[statusFor(w.week)] }}
          </span>
        </div>
        <p class="text-sm text-slate-600">
          <strong>交付物：</strong>{{ w.deliverable }}
        </p>
        <div class="mt-3 flex flex-wrap gap-2 text-sm">
          <NuxtLink
            v-if="w.caseSlug"
            :to="`/founder/cases/${w.caseSlug}`"
            class="text-accent hover:underline"
          >
            相关案例 →
          </NuxtLink>
          <NuxtLink v-if="w.tool === 'checklist'" to="/tools/checklist" class="text-accent hover:underline">
            决策清单 →
          </NuxtLink>
        </div>
      </article>
    </div>
  </div>
</template>
