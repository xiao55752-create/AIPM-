<script setup lang="ts">
import { corePathSteps } from '~/lib/core-path'

const route = useRoute()

const activeIndex = computed(() => {
  const idx = corePathSteps.findIndex((step) => route.path === step.to || route.path.startsWith(`${step.to}/`))
  return idx >= 0 ? idx : 0
})
</script>

<template>
  <section class="rounded-2xl border border-slate-200 bg-white p-4">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div>
        <p class="text-xs font-medium text-accent">核心路径</p>
        <p class="mt-1 text-sm text-slate-600">
          自测 → 资源 → 项目 → 路演 → 批改 → 成果
        </p>
      </div>
      <span class="rounded-full border border-accent/20 bg-accent-muted px-3 py-1 text-xs text-accent">
        当前第 {{ activeIndex + 1 }} / {{ corePathSteps.length }} 步
      </span>
    </div>
    <div class="mt-4 grid gap-2 md:grid-cols-6">
      <NuxtLink
        v-for="(step, index) in corePathSteps"
        :key="step.id"
        :to="step.to"
        class="rounded-xl border px-3 py-2 text-xs transition-colors"
        :class="index === activeIndex
          ? 'border-accent bg-accent-muted/40 text-accent'
          : index < activeIndex
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
            : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-accent hover:text-accent'"
      >
        <p class="font-medium">{{ step.shortLabel }}</p>
        <p class="mt-0.5 truncate">{{ step.title }}</p>
      </NuxtLink>
    </div>
  </section>
</template>
