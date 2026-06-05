<script setup lang="ts">
import { corePathSteps } from '~/lib/core-path'

const primaryLinks = [
  { to: '/assessment', label: '自测' },
  { to: '/resources', label: '资源' },
  { to: '/tools/project-lab', label: '项目' },
  { to: '/tools/showcase', label: '路演' },
  { to: '/tools/homework', label: '批改' },
]

const moreLinks = [
  { to: '/path', label: '路径' },
  { to: '/tasks', label: '周任务' },
  { to: '/market', label: '招聘对标' },
  { to: '/tools', label: '工具' },
  { to: '/ops', label: '看板' },
  { to: '/camp', label: '成长营' },
  { to: '/founder', label: '主理人' },
]

const open = ref(false)
const route = useRoute()
const isQuizRoute = computed(() => route.path === '/assessment/quiz')
const { active: founderMode, loadFounderMode } = useFounderMode()

const visibleMoreLinks = computed(() =>
  moreLinks.filter((item) => item.to !== '/ops' || founderMode.value),
)

const pathProgressLabel = computed(() => {
  const idx = corePathSteps.findIndex((step) => route.path === step.to || route.path.startsWith(`${step.to}/`))
  if (idx < 0) return '成长进行中'
  return `${idx + 1}/${corePathSteps.length} ${corePathSteps[idx]?.shortLabel || ''}`
})

onMounted(() => {
  loadFounderMode()
})

watch(
  () => route.fullPath,
  () => {
    open.value = false
  },
)

const statusLabel = computed(() => {
  if (isQuizRoute.value) return '答题中'
  if (route.path.startsWith('/assessment')) return '诊断中'
  if (route.path.startsWith('/resources')) return '学习资源'
  if (route.path.startsWith('/path')) return '路径执行'
  if (route.path.startsWith('/tasks')) return '任务推进'
  if (route.path.startsWith('/tools/project-lab')) return '项目实战'
  if (route.path.startsWith('/tools/showcase')) return '路演准备'
  if (route.path.startsWith('/tools/homework')) return '批改跟进'
  if (route.path.startsWith('/tools')) return '工具实操'
  if (route.path.startsWith('/ops')) return '数据看板'
  if (route.path.startsWith('/market')) return '招聘对标'
  return '成长进行中'
})
</script>

<template>
  <header class="sticky top-0 z-50 border-b border-slate-200/80 bg-white/85 backdrop-blur">
    <div class="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
      <NuxtLink to="/" class="font-semibold text-primary">
        AI 产品成长营
      </NuxtLink>
      <nav v-if="!isQuizRoute" class="hidden items-center gap-4 text-sm lg:flex">
        <NuxtLink
          v-for="l in primaryLinks"
          :key="l.to"
          :to="l.to"
          class="text-slate-600 hover:text-accent transition-colors"
          active-class="!text-accent font-medium"
        >
          {{ l.label }}
        </NuxtLink>
        <details class="relative">
          <summary class="cursor-pointer list-none text-slate-600 hover:text-accent">更多</summary>
          <div class="absolute right-0 mt-2 w-44 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
            <NuxtLink
              v-for="l in visibleMoreLinks"
              :key="`more-${l.to}`"
              :to="l.to"
              class="block rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              active-class="bg-accent-muted/40 text-accent font-medium"
            >
              {{ l.label }}
            </NuxtLink>
          </div>
        </details>
      </nav>
      <div class="flex items-center gap-2">
        <span
          class="hidden rounded-full border border-accent/20 bg-accent-muted px-2.5 py-1 text-xs font-medium text-accent sm:inline-block"
        >
          {{ pathProgressLabel }} · {{ statusLabel }}
        </span>
        <NuxtLink
          to="/assessment"
          class="hidden rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-hover sm:inline-block"
        >
          {{ isQuizRoute ? '退出答题' : '开始自测' }}
        </NuxtLink>
        <button
          v-if="!isQuizRoute"
          type="button"
          class="rounded-lg border border-slate-200 p-2 text-slate-600 lg:hidden"
          aria-label="切换导航菜单"
          @click="open = !open"
        >
          <svg v-if="!open" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm1 4a1 1 0 100 2h12a1 1 0 100-2H4z" clip-rule="evenodd" />
          </svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
    <div v-if="open && !isQuizRoute" class="border-t border-slate-200 bg-white px-4 py-3 lg:hidden">
      <nav class="grid gap-2">
        <NuxtLink
          v-for="l in primaryLinks"
          :key="l.to"
          :to="l.to"
          class="rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          active-class="bg-accent-muted/40 text-accent font-medium"
        >
          {{ l.label }}
        </NuxtLink>
        <p class="px-3 pt-2 text-xs text-slate-400">更多功能</p>
        <NuxtLink
          v-for="l in visibleMoreLinks"
          :key="`mobile-more-${l.to}`"
          :to="l.to"
          class="rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          active-class="bg-accent-muted/40 text-accent font-medium"
        >
          {{ l.label }}
        </NuxtLink>
      </nav>
      <NuxtLink
        to="/assessment"
        class="mt-3 inline-block w-full rounded-lg bg-accent px-3 py-2 text-center text-sm font-medium text-white hover:bg-accent-hover"
      >
        开始自测
      </NuxtLink>
    </div>
  </header>
</template>
