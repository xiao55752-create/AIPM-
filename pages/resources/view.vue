<script setup lang="ts">
import { resources } from '~/lib/resources'
import { trackEvent } from '~/lib/analytics'

const route = useRoute()

function resolveResourceLink(item: (typeof resources)[number]) {
  if (item.href) return item.href
  const keyword = encodeURIComponent(item.title)
  if (item.type === 'video') return `https://search.bilibili.com/all?keyword=${keyword}`
  if (item.type === 'book') return `https://search.jd.com/Search?keyword=${keyword}`
  return `https://www.google.com/search?q=${keyword}`
}

const resource = computed(() => {
  const id = route.query.id
  if (typeof id !== 'string') return null
  return resources.find((item) => item.id === id) || null
})

const iframeSrc = computed(() => (resource.value ? resolveResourceLink(resource.value) : ''))

onMounted(() => {
  if (!resource.value) return
  trackEvent('resource_web_view', {
    id: resource.value.id,
    type: resource.value.type,
    week: resource.value.week,
  })
})
</script>

<template>
  <div class="space-y-5">
    <section class="rounded-2xl border border-slate-200 bg-white p-5">
      <h1 class="text-xl font-semibold text-primary">
        {{ resource?.title || '资源网页阅读' }}
      </h1>
      <p class="mt-1 text-sm text-slate-600">
        {{ resource?.summary || '未找到资源，请返回学习资源中心重新选择。' }}
      </p>
      <div class="mt-3 flex flex-wrap items-center gap-3 text-sm">
        <NuxtLink to="/resources" class="text-accent hover:underline">返回资源中心</NuxtLink>
        <a
          v-if="resource"
          :href="iframeSrc"
          target="_blank"
          rel="noopener noreferrer"
          class="text-accent hover:underline"
        >
          新窗口打开原文 →
        </a>
      </div>
    </section>

    <section v-if="resource" class="rounded-2xl border border-slate-200 bg-white p-3">
      <iframe
        :src="iframeSrc"
        class="h-[75vh] w-full rounded-xl border border-slate-200"
        title="资源网页阅读"
        loading="lazy"
      />
      <p class="mt-2 text-xs text-slate-500">
        注：部分网站可能禁止 iframe 嵌入，若空白请使用“新窗口打开原文”。
      </p>
    </section>
  </div>
</template>
