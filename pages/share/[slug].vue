<script setup lang="ts">
import type { PublicSharePayload } from '~/lib/share-payload'

const route = useRoute()
const slug = computed(() => String(route.params.slug || ''))

const share = ref<PublicSharePayload | null>(null)
const loading = ref(true)
const errorMsg = ref('')

const kindLabel: Record<PublicSharePayload['kind'], string> = {
  'project-lab': '项目 Lab',
  'eval-lab': 'Eval 报告',
  'outcome-pack': '阶段成果包',
  checklist: '决策清单',
}

onMounted(async () => {
  if (!slug.value) {
    errorMsg.value = '链接无效'
    loading.value = false
    return
  }
  try {
    const res = await $fetch<{ ok: boolean; share: PublicSharePayload }>(`/api/share/${slug.value}`)
    share.value = res.share
  } catch {
    errorMsg.value = '成果页不存在或已过期'
  } finally {
    loading.value = false
  }
})

useSeoMeta({
  title: () => (share.value ? `${share.value.title} · AI 产品成长营` : '学习成果 · AI 产品成长营'),
  description: () => share.value?.subtitle || 'AI 产品成长营学习成果展示',
})
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-6 py-4">
    <div v-if="loading" class="text-center text-slate-500 py-12">加载中...</div>
    <div v-else-if="errorMsg" class="text-center py-12">
      <p class="text-slate-600">{{ errorMsg }}</p>
      <NuxtLink to="/" class="mt-4 inline-block text-accent hover:underline">返回首页</NuxtLink>
    </div>
    <template v-else-if="share">
      <section class="glass-panel rounded-2xl border border-slate-200 p-6">
        <p class="text-xs text-slate-500">{{ kindLabel[share.kind] }} · 完成度 {{ share.score }} 分</p>
        <h1 class="mt-2 text-2xl font-bold text-primary">{{ share.title }}</h1>
        <p v-if="share.subtitle" class="mt-2 text-slate-600">{{ share.subtitle }}</p>
        <p class="mt-2 text-xs text-slate-400">
          发布于 {{ new Date(share.publishedAt).toLocaleString('zh-CN') }}
        </p>
      </section>

      <section v-if="share.highlights.length" class="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5">
        <h2 class="text-sm font-semibold text-emerald-800">已完成交付物</h2>
        <ul class="mt-2 flex flex-wrap gap-2">
          <li
            v-for="h in share.highlights"
            :key="h"
            class="rounded-full bg-white px-3 py-1 text-xs text-emerald-700 border border-emerald-200"
          >
            {{ h }}
          </li>
        </ul>
      </section>

      <section class="rounded-2xl border border-slate-200 bg-white p-6">
        <pre class="whitespace-pre-wrap text-sm text-slate-700 leading-relaxed">{{ share.body }}</pre>
      </section>

      <div class="flex flex-wrap gap-3 text-sm">
        <NuxtLink to="/assessment" class="rounded-lg bg-accent px-4 py-2 text-white hover:bg-accent-hover">
          我也要做自测
        </NuxtLink>
        <NuxtLink to="/camp" class="rounded-lg border border-primary px-4 py-2 text-primary hover:bg-slate-50">
          了解成长营
        </NuxtLink>
      </div>
    </template>
  </div>
</template>
