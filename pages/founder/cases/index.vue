<script setup lang="ts">
import { cases } from '~/lib/cases'
</script>

<template>
  <div class="space-y-6">
    <h1 class="text-2xl font-bold text-primary">主理人实战案例</h1>
    <p class="mt-2 text-slate-600">脱敏复盘 · 证明成长营方法论来自真实项目</p>
    <div class="mt-8 grid gap-4 sm:grid-cols-2">
      <NuxtLink
        v-for="c in cases"
        :key="c.slug"
        :to="`/founder/cases/${c.slug}`"
        class="rounded-2xl border border-slate-200 bg-white p-5 hover:border-accent"
      >
        <h2 class="font-semibold text-primary">{{ c.title }}</h2>
        <p class="mt-2 text-sm text-slate-600">{{ c.summary }}</p>
        <div class="mt-3 flex gap-2">
          <span
            v-for="t in c.tags"
            :key="t"
            class="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
          >
            {{ t }}
          </span>
        </div>
      </NuxtLink>
    </div>
  </div>
</template>
