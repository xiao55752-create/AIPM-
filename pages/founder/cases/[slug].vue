<script setup lang="ts">
import { cases, getCase } from '~/lib/cases'

const route = useRoute()
const slug = route.params.slug as string
const item = getCase(slug)

if (!item) {
  throw createError({ statusCode: 404, message: '案例不存在' })
}
</script>

<template>
  <article v-if="item" class="mx-auto max-w-3xl space-y-6">
    <NuxtLink to="/founder/cases" class="text-sm text-accent hover:underline">← 全部案例</NuxtLink>
    <section class="glass-panel rounded-2xl border border-slate-200 p-6">
      <h1 class="text-2xl font-bold text-primary">{{ item.title }}</h1>
      <p class="mt-2 text-slate-600">{{ item.summary }}</p>
      <div class="mt-3 flex flex-wrap gap-2 text-xs">
        <span v-for="tag in item.tags" :key="tag" class="rounded-full bg-white px-2 py-1 text-slate-600">
          {{ tag }}
        </span>
      </div>
    </section>

    <section class="rounded-2xl border border-slate-200 bg-white p-6">
      <section v-for="s in item.sections" :key="s.heading" class="mt-6 first:mt-0">
        <h2 class="text-lg font-semibold text-primary">{{ s.heading }}</h2>
        <p class="mt-2 text-slate-700 leading-relaxed">{{ s.body }}</p>
      </section>
    </section>

    <section class="rounded-2xl bg-accent-muted/40 border border-accent/20 p-5">
      <h2 class="font-semibold text-primary">本周你可做的一件事</h2>
      <p class="mt-2 text-slate-700">{{ item.weeklyAction }}</p>
      <NuxtLink to="/tools" class="mt-3 inline-block text-sm text-accent font-medium hover:underline">
        打开工具箱 →
      </NuxtLink>
    </section>

    <p class="text-xs text-slate-400">— 陈总监 · 脱敏实战案例</p>
  </article>
</template>
