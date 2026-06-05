<script setup lang="ts">
import { cases } from '~/lib/cases'
import { resources, resourceTypes, type LearningResource } from '~/lib/resources'
import { CHECKLIST_STORAGE_KEY } from '~/lib/checklist'
import type { Dimension } from '~/lib/scoring'
import { trackEvent } from '~/lib/analytics'
import { getCurrentWeeklyPicks, getWeeklyPickLabel } from '~/lib/weekly-picks'

const RESOURCE_PROGRESS_KEY = 'apgc-resource-progress-v1'
const EXPORT_HISTORY_KEY = 'apgc-export-history'
const CURATED_TOP3_KEY = 'apgc-curated-top3-v1'
const route = useRoute()
const router = useRouter()
const { active: founderMode, loadFounderMode } = useFounderMode()
const activeType = ref<'all' | 'article' | 'book' | 'video'>('all')
const activeTag = ref('')
const viewMode = ref<'list' | 'week'>('list')
const activeDuration = ref<'all' | 'short' | 'medium' | 'long'>('all')
const activeDifficulty = ref<'all' | '基础' | '进阶' | '实战'>('all')
const resumeReadyOnly = ref(false)
const completedIds = ref<string[]>([])
const roleTarget = ref<'ai-pm' | 'ai-director'>('ai-pm')
const recommendNotice = ref('')
const curatedEditMode = ref(false)
const curatedIds = ref<string[]>(['r10', 'r16', 'r32'])
const platformBooks = ref<
  Array<{
    id: string
    title: string
    author: string
    publisher: string
    summary: string
    week: number
    tags: string
    source: string
    href: string
  }>
>([])
const platformBooksSyncedAt = ref('')
const syncingBooks = ref(false)
const videoHotMap = ref<
  Record<string, { play: number; quality: number; url?: string; author?: string }>
>({})
const videoFetchedAt = ref('')
const loadingVideoHot = ref(false)
const listLimit = ref(8)
const weekLimit = ref(4)
const expandedResourceIds = ref<string[]>([])

const weeklyPicks = computed(() => getCurrentWeeklyPicks())
const weeklyPickLabel = computed(() => getWeeklyPickLabel())

const { result, loadFromStorage } = useAssessment()

watch([activeType, activeTag, activeDuration, activeDifficulty, resumeReadyOnly], () => {
  listLimit.value = 8
  weekLimit.value = 4
  expandedResourceIds.value = []
})

onMounted(() => {
  loadFromStorage()
  loadFounderMode()
  if (!import.meta.client) return
  try {
    const raw = localStorage.getItem(RESOURCE_PROGRESS_KEY)
    if (!raw) return
    const ids = JSON.parse(raw) as string[]
    completedIds.value = Array.isArray(ids) ? ids : []
  } catch {
    // noop
  }

  try {
    const rawHistory = localStorage.getItem(EXPORT_HISTORY_KEY)
    if (rawHistory) {
      const history = JSON.parse(rawHistory) as Array<{ role?: 'ai-pm' | 'ai-director' }>
      if (history?.[0]?.role) roleTarget.value = history[0].role
    }
  } catch {
    // noop
  }

  try {
    const rawCurated = localStorage.getItem(CURATED_TOP3_KEY)
    if (rawCurated) {
      const ids = JSON.parse(rawCurated) as string[]
      if (Array.isArray(ids) && ids.length) curatedIds.value = ids.slice(0, 3)
    }
  } catch {
    // noop
  }

  const tagFromQuery = route.query.tag
  if (
    typeof tagFromQuery === 'string' &&
    resources.some((item) => item.tags.includes(tagFromQuery))
  ) {
    activeTag.value = tagFromQuery
  }

  if (route.query.from === 'report') {
    recommendNotice.value = '已根据你的测评报告自动筛选短板维度资源'
    setTimeout(() => {
      recommendNotice.value = ''
    }, 1800)
  }

  loadVideoHot()
  loadPlatformBooks()
})

const tags = computed(() => {
  const set = new Set<string>()
  for (const item of resources) {
    item.tags.forEach((t) => set.add(t))
  }
  return [...set]
})

const aiTopicResources = computed(() =>
  resources
    .filter((item) => {
      if (item.type !== 'article') return false
      const text = `${item.title} ${item.summary}`
      return /(大模型|智能体|agent|rag|llm|function calling|tool use|llmops)/i.test(text)
    })
    .sort((a, b) => a.week - b.week),
)

const filteredResources = computed(() =>
  resources.filter((item) => {
    const typeOk = activeType.value === 'all' || item.type === activeType.value
    const tagOk = !activeTag.value || item.tags.includes(activeTag.value)
    const durationOk =
      activeDuration.value === 'all' || durationBucket(item) === activeDuration.value
    const difficultyOk =
      activeDifficulty.value === 'all' || difficulty(item) === activeDifficulty.value
    const resumeOk = !resumeReadyOnly.value || isResumeReady(item)
    return typeOk && tagOk && durationOk && difficultyOk && resumeOk
  }),
)

const visibleResources = computed(() => filteredResources.value.slice(0, listLimit.value))

const weeklyGroups = computed(() => {
  const grouped = new Map<number, typeof filteredResources.value>()
  for (const item of filteredResources.value) {
    if (!grouped.has(item.week)) grouped.set(item.week, [])
    grouped.get(item.week)!.push(item)
  }
  return [...grouped.entries()].sort((a, b) => a[0] - b[0])
})

const visibleWeeklyGroups = computed(() => weeklyGroups.value.slice(0, weekLimit.value))

const recommendedOrder = computed(() =>
  [...resources]
    .sort((a, b) => a.week - b.week)
    .map((item) => ({
      ...item,
      reason: item.type === 'book' ? '先建立认知框架' : item.type === 'article' ? '补齐方法论与细节' : '看真实项目怎么落地',
    })),
)

const completedCount = computed(() =>
  filteredResources.value.filter((item) => completedIds.value.includes(item.id)).length,
)

const bookResources = computed(() => resources.filter((item) => item.type === 'book'))

const hotVideos = computed(() =>
  resources
    .filter((item) => item.type === 'video')
    .sort((a, b) => {
      const bHot = videoHotMap.value[b.id]?.play || b.hotScore || 0
      const aHot = videoHotMap.value[a.id]?.play || a.hotScore || 0
      const hotDiff = bHot - aHot
      if (hotDiff !== 0) return hotDiff
      const bQuality = videoHotMap.value[b.id]?.quality || b.qualityScore || 0
      const aQuality = videoHotMap.value[a.id]?.quality || a.qualityScore || 0
      return bQuality - aQuality
    })
    .slice(0, 6),
)

const completionPct = computed(() =>
  filteredResources.value.length
    ? Math.round((completedCount.value / filteredResources.value.length) * 100)
    : 0,
)

const resourceStats = computed(() => {
  const article = resources.filter((item) => item.type === 'article').length
  const book = resources.filter((item) => item.type === 'book').length
  const video = resources.filter((item) => item.type === 'video').length
  return {
    total: resources.length,
    article,
    book,
    video,
    resumeReady: resources.filter(isResumeReady).length,
  }
})

const visibleTags = computed(() => tags.value.filter((tag) => /^D\d|^W\d/.test(tag)).slice(0, 18))

const currentFilterLabel = computed(() => {
  const labels: string[] = []
  if (activeType.value !== 'all') {
    labels.push(resourceTypes.find((item) => item.id === activeType.value)?.label || activeType.value)
  }
  if (activeTag.value) labels.push(activeTag.value)
  if (activeDuration.value !== 'all') {
    labels.push(
      activeDuration.value === 'short'
        ? '30 分钟内'
        : activeDuration.value === 'medium'
          ? '30-60 分钟'
          : '60 分钟+',
    )
  }
  if (activeDifficulty.value !== 'all') labels.push(activeDifficulty.value)
  if (resumeReadyOnly.value) labels.push('简历可用')
  return labels.length ? labels.join(' / ') : '全部资源'
})

function toggleCompleted(id: string) {
  const set = new Set(completedIds.value)
  if (set.has(id)) set.delete(id)
  else set.add(id)
  completedIds.value = [...set]
  if (import.meta.client) {
    localStorage.setItem(RESOURCE_PROGRESS_KEY, JSON.stringify(completedIds.value))
  }
  trackEvent('resource_toggle_complete', { id, completed: completedIds.value.includes(id) })
}

function isCompleted(id: string) {
  return completedIds.value.includes(id)
}

function isResourceExpanded(id: string) {
  return expandedResourceIds.value.includes(id)
}

function toggleResourceExpanded(id: string) {
  const set = new Set(expandedResourceIds.value)
  if (set.has(id)) set.delete(id)
  else set.add(id)
  expandedResourceIds.value = [...set]
  trackEvent('resource_detail_toggle', { id, expanded: set.has(id) })
}

function resolveResourceLink(item: LearningResource) {
  if (item.type === 'video' && videoHotMap.value[item.id]?.url) {
    return videoHotMap.value[item.id].url || ''
  }
  if (item.href) return item.href
  const keyword = encodeURIComponent(item.title)
  if (item.type === 'video') return `https://search.bilibili.com/all?keyword=${keyword}`
  if (item.type === 'book') return `https://search.jd.com/Search?keyword=${keyword}`
  return `https://www.google.com/search?q=${keyword}`
}

async function loadVideoHot() {
  loadingVideoHot.value = true
  try {
    const res = await $fetch<{
      ok: boolean
      fetchedAt: string
      items: Array<{ id: string; play: number; quality: number; url: string; author: string }>
    }>('/api/resources/hot-videos')
    const map: Record<string, { play: number; quality: number; url?: string; author?: string }> =
      {}
    res.items.forEach((item) => {
      map[item.id] = {
        play: item.play,
        quality: item.quality,
        url: item.url,
        author: item.author,
      }
    })
    videoHotMap.value = map
    videoFetchedAt.value = res.fetchedAt
  } catch {
    // noop
  } finally {
    loadingVideoHot.value = false
  }
}

function playLabel(item: LearningResource) {
  const play = videoHotMap.value[item.id]?.play
  if (!play) return `热度 ${item.hotScore || 0}`
  if (play >= 10000) return `播放 ${(play / 10000).toFixed(1)} 万`
  return `播放 ${play}`
}

function resourceSourceLabel(item: LearningResource) {
  if (item.source) return item.source
  if (item.href?.includes('bilibili.com')) return 'B站'
  if (item.href?.includes('woshipm.com')) return '人人都是产品经理'
  if (item.href?.includes('jd.com')) return '京东图书'
  if (item.type === 'video') return 'B站搜索'
  if (item.type === 'book') return '图书搜索'
  return '网页搜索'
}

function openArticleInWebPage(item: LearningResource) {
  router.push({
    path: '/resources/view',
    query: { id: item.id },
  })
}

function exportBooksJson() {
  if (!import.meta.client || !platformBooks.value.length) return
  const blob = new Blob([JSON.stringify(platformBooks.value, null, 2)], {
    type: 'application/json;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `books-dataset-platform-${Date.now()}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  trackEvent('book_dataset_download_json', { count: platformBooks.value.length })
}

function exportBooksCsv() {
  if (!import.meta.client || !platformBooks.value.length) return
  const header = ['id', 'title', 'author', 'publisher', 'week', 'tags', 'source', 'summary', 'href']
  const rows = platformBooks.value.map((item) => [
    item.id,
    item.title,
    item.author,
    item.publisher,
    String(item.week),
    item.tags,
    item.source,
    item.summary,
    item.href,
  ])
  const csv = [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(','))
    .join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `books-dataset-platform-${Date.now()}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  trackEvent('book_dataset_download_csv', { count: rows.length })
}

async function loadPlatformBooks() {
  try {
    const res = await $fetch<{
      ok: boolean
      exists: boolean
      syncedAt: string
      count: number
      items: Array<{
        id: string
        title: string
        author: string
        publisher: string
        summary: string
        week: number
        tags: string
        source: string
        href: string
      }>
    }>('/api/resources/books')
    if (!res.exists) return
    platformBooks.value = res.items
    platformBooksSyncedAt.value = res.syncedAt
  } catch {
    // noop
  }
}

async function syncBooksToPlatform() {
  syncingBooks.value = true
  try {
    const res = await $fetch<{ ok: boolean; syncedAt: string; count: number }>(
      '/api/resources/books/sync',
      {
        method: 'POST',
      },
    )
    await loadPlatformBooks()
    recommendNotice.value = `书单已同步到平台（${res.count} 本）`
    trackEvent('book_dataset_synced_platform', { count: res.count })
    setTimeout(() => {
      recommendNotice.value = ''
    }, 1800)
  } catch {
    recommendNotice.value = '书单同步失败，请稍后重试'
    setTimeout(() => {
      recommendNotice.value = ''
    }, 1800)
  } finally {
    syncingBooks.value = false
  }
}

function learningReason(item: LearningResource) {
  if (item.tags.includes('D1')) return '这条资源优先帮助你建立 AI 方案判断力（模型/RAG/Agent）。'
  if (item.tags.includes('D2')) return '这条资源用于补战略与增长思维，避免只做功能不做结果。'
  if (item.tags.includes('D3')) return '这条资源聚焦评测与合规，降低上线风险。'
  if (item.tags.includes('D4')) return '这条资源帮助你沉淀复盘方法，形成长期竞争力。'
  if (item.tags.includes('D5')) return '这条资源提升协作与表达能力，直接服务面试与晋升。'
  if (item.tags.includes('D6')) return '这条资源用于补成本与经营视角，避免投入失控。'
  return '这条资源用于补齐当前周的关键能力短板。'
}

function expectedOutput(item: LearningResource) {
  if (item.week <= 3) return '看完后产出：1页目标与路径说明（含3个业务指标）。'
  if (item.week <= 5) return '看完后产出：决策清单关键字段填写稿（路线/边界/风险）。'
  if (item.week <= 8) return '看完后产出：评测门禁或成本风险表（可直接用于评审）。'
  if (item.week <= 10) return '看完后产出：协作机制或复盘文档（可复用模板）。'
  return '看完后产出：简历条目或面试叙事版本（含量化结果）。'
}

function interviewTalkTrack(item: LearningResource) {
  if (item.tags.includes('D1')) return '面试可说：我如何做模型/路线取舍，并设置兜底策略。'
  if (item.tags.includes('D2')) return '面试可说：我如何从业务目标倒推产品策略与优先级。'
  if (item.tags.includes('D3')) return '面试可说：我如何定义发布门禁并控制合规风险。'
  if (item.tags.includes('D4')) return '面试可说：我如何把项目复盘成可复制的方法论。'
  if (item.tags.includes('D5')) return '面试可说：我如何推动跨团队协同并拿到结果。'
  if (item.tags.includes('D6')) return '面试可说：我如何平衡效果、成本与规模化。'
  return '面试可说：我如何把学习内容转成可落地的业务结果。'
}

function estimatedDuration(item: LearningResource) {
  if (item.type === 'book') return '45-90 分钟（精读章节）'
  if (item.type === 'video') return '20-40 分钟'
  return '15-30 分钟'
}

function difficulty(item: LearningResource) {
  if (item.week <= 3) return '基础'
  if (item.week <= 8) return '进阶'
  return '实战'
}

function durationBucket(item: LearningResource) {
  if (item.type === 'article') return 'short'
  if (item.type === 'video') return 'medium'
  return 'long'
}

function isResumeReady(item: LearningResource) {
  const text = `${item.title} ${item.summary}`
  if (item.week >= 10) return true
  return /(面试|简历|表达|复盘|结果|协同)/.test(text)
}

function prerequisites(item: LearningResource) {
  if (item.week <= 2) return '无，直接开始'
  if (item.tags.includes('D1')) return '建议先完成 W2-W3 的场景与指标定义'
  if (item.tags.includes('D3')) return '建议先完成基础方案判断与技术路线梳理'
  if (item.tags.includes('D5')) return '建议先准备一个真实项目作为表达素材'
  return '建议完成前一周学习与笔记产出'
}

function definitionOfDone(item: LearningResource) {
  if (item.week <= 3) return '完成 1 页目标与指标说明，并可复述核心取舍'
  if (item.week <= 6) return '完成清单关键字段或评测门禁草稿并通过自查'
  if (item.week <= 10) return '完成协作/复盘文档并沉淀 2 条可复用规则'
  return '完成 3 条简历/面试表达，含至少 2 个量化结果'
}

function recommendationScore(item: LearningResource) {
  let score = 0
  if (result.value?.focusWeeks.includes(item.week)) score += 4
  if (result.value?.weakest.some((d) => item.tags.includes(d as Dimension))) score += 3
  if (!completedIds.value.includes(item.id)) score += 2
  if (isResumeReady(item)) score += 1

  if (roleTarget.value === 'ai-director') {
    if (item.tags.includes('D5') || item.tags.includes('D2')) score += 2
  } else if (item.tags.includes('D1') || item.tags.includes('D3')) {
    score += 1
  }
  return score
}

const mustLearnTop3 = computed(() =>
  [...resources]
    .sort((a, b) => {
      const diff = recommendationScore(b) - recommendationScore(a)
      if (diff !== 0) return diff
      return a.week - b.week
    })
    .slice(0, 3),
)

const curatedResources = computed(() => {
  const byId = new Map(resources.map((r) => [r.id, r]))
  const selected = curatedIds.value.map((id) => byId.get(id)).filter(Boolean) as LearningResource[]
  if (selected.length >= 3) return selected.slice(0, 3)
  const fallback = mustLearnTop3.value.filter((r) => !selected.some((s) => s.id === r.id))
  return [...selected, ...fallback].slice(0, 3)
})

function recommendationReason(item: LearningResource) {
  const reasons: string[] = []
  if (result.value?.focusWeeks.includes(item.week)) reasons.push('命中你的重点周')
  if (result.value?.weakest.some((d) => item.tags.includes(d as Dimension))) reasons.push('匹配当前短板维度')
  if (isResumeReady(item)) reasons.push('可转化为简历/面试素材')
  if (!reasons.length) reasons.push('适合当前阶段的通用必修资源')
  return reasons.join('；')
}

function onOpenResource(item: LearningResource) {
  trackEvent('resource_open', {
    id: item.id,
    week: item.week,
    type: item.type,
    source: resourceSourceLabel(item),
  })
}

function saveCuratedTop3() {
  const valid = curatedIds.value.filter((id) => resources.some((r) => r.id === id)).slice(0, 3)
  curatedIds.value = valid
  if (import.meta.client) {
    localStorage.setItem(CURATED_TOP3_KEY, JSON.stringify(valid))
  }
  curatedEditMode.value = false
  trackEvent('curated_top3_saved', { count: valid.length })
}

function sendToChecklist(item: LearningResource) {
  if (!import.meta.client) return
  const currentRaw = localStorage.getItem(CHECKLIST_STORAGE_KEY)
  const current = currentRaw
    ? (JSON.parse(currentRaw) as { form?: Record<string, string>; savedAt?: string })
    : { form: {} }

  const form = {
    ...(current.form || {}),
    project: current.form?.project || `学习转实战：${item.title}`,
    scene_kpi:
      current.form?.scene_kpi ||
      `本周目标：完成资源学习并输出「${expectedOutput(item)}」`,
    route: current.form?.route || '结合学习结论完善路线判断',
    eval_biz:
      current.form?.eval_biz || `学习资源来源：${resourceSourceLabel(item)}；完成标准：${definitionOfDone(item)}`,
  }

  localStorage.setItem(
    CHECKLIST_STORAGE_KEY,
    JSON.stringify({
      form,
      savedAt: new Date().toLocaleString('zh-CN'),
    }),
  )
  recommendNotice.value = `已带入清单草稿：${item.title}`
  setTimeout(() => {
    recommendNotice.value = ''
  }, 1800)
  trackEvent('resource_send_to_checklist', { id: item.id, week: item.week })
  navigateTo('/tools/checklist?synced=1')
}

function typeClass(id: string) {
  return activeType.value === id
    ? 'border-accent bg-accent-muted/40 text-accent'
    : 'border-slate-200 bg-white text-slate-600'
}

function tagClass(tag: string) {
  return activeTag.value === tag
    ? 'border-primary bg-primary/10 text-primary'
    : 'border-slate-200 bg-white text-slate-600'
}

function openAiTopic() {
  activeType.value = 'article'
  activeTag.value = 'D1'
  recommendNotice.value = '已切换到「大模型与智能体」专题筛选'
  setTimeout(() => {
    recommendNotice.value = ''
  }, 1800)
  trackEvent('resource_ai_topic_open')
}

function clearResourceFilters() {
  activeType.value = 'all'
  activeTag.value = ''
  activeDuration.value = 'all'
  activeDifficulty.value = 'all'
  resumeReadyOnly.value = false
  listLimit.value = 8
  weekLimit.value = 4
}
</script>

<template>
  <div class="space-y-8">
    <CorePathRibbon />

    <section class="overflow-hidden rounded-3xl border border-slate-200 bg-white">
      <div class="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
        <div class="bg-gradient-to-br from-primary via-slate-900 to-slate-800 p-6 text-white md:p-8">
          <p class="text-xs font-medium uppercase tracking-[0.24em] text-white/60">Learning Hub</p>
          <h1 class="mt-3 max-w-2xl text-3xl font-bold leading-tight md:text-4xl">
            学习资源中心
          </h1>
          <p class="mt-3 max-w-2xl text-sm leading-6 text-white/75">
            不再“收藏一堆链接”。这里把文章、书籍、视频按 12 周能力路径组织，并要求每条资源都对应一个可交付产出。
          </p>
          <div class="mt-6 grid gap-3 sm:grid-cols-4">
            <div class="rounded-2xl border border-white/10 bg-white/10 p-3">
              <p class="text-xs text-white/60">资源总数</p>
              <p class="mt-1 text-2xl font-semibold">{{ resourceStats.total }}</p>
            </div>
            <div class="rounded-2xl border border-white/10 bg-white/10 p-3">
              <p class="text-xs text-white/60">文章 / 书 / 视频</p>
              <p class="mt-1 text-xl font-semibold">
                {{ resourceStats.article }} / {{ resourceStats.book }} / {{ resourceStats.video }}
              </p>
            </div>
            <div class="rounded-2xl border border-white/10 bg-white/10 p-3">
              <p class="text-xs text-white/60">简历素材</p>
              <p class="mt-1 text-2xl font-semibold">{{ resourceStats.resumeReady }}</p>
            </div>
            <div class="rounded-2xl border border-white/10 bg-white/10 p-3">
              <p class="text-xs text-white/60">当前完成</p>
              <p class="mt-1 text-2xl font-semibold">{{ completionPct }}%</p>
            </div>
          </div>
          <div class="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              class="rounded-xl bg-white px-4 py-2 text-sm font-medium text-primary hover:bg-slate-100"
              @click="openAiTopic"
            >
              从大模型专题开始
            </button>
            <button
              type="button"
              class="rounded-xl border border-white/30 px-4 py-2 text-sm font-medium text-white hover:bg-white/10"
              @click="resumeReadyOnly = true"
            >
              只看可写简历的资源
            </button>
            <NuxtLink
              to="/tasks"
              class="rounded-xl border border-white/30 px-4 py-2 text-sm font-medium text-white hover:bg-white/10"
            >
              去周任务中心
            </NuxtLink>
          </div>
        </div>

        <div class="bg-gradient-to-br from-accent-muted/30 to-white p-6 md:p-8">
          <div class="rounded-2xl border border-accent/20 bg-white p-5 shadow-sm">
            <div class="flex items-start justify-between gap-4">
              <div>
                <p class="text-xs font-medium text-accent">今日建议</p>
                <h2 class="mt-1 text-xl font-semibold text-primary">先学这 3 条</h2>
                <p class="mt-1 text-xs text-slate-500">根据测评短板、周路径和简历产出优先级排序。</p>
              </div>
              <span class="rounded-full bg-accent-muted px-3 py-1 text-xs text-accent">
                {{ roleTarget === 'ai-pm' ? 'AI PM' : 'AI 总监' }}
              </span>
            </div>
            <ol class="mt-4 space-y-3">
              <li
                v-for="(item, index) in mustLearnTop3"
                :key="`hero-must-${item.id}`"
                class="rounded-xl border border-slate-100 bg-slate-50 p-3"
              >
                <div class="flex gap-3">
                  <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">
                    {{ index + 1 }}
                  </span>
                  <div class="min-w-0">
                    <p class="truncate text-sm font-medium text-primary">{{ item.title }}</p>
                    <p class="mt-1 text-xs text-slate-500">
                      W{{ item.week }} · {{ estimatedDuration(item) }} · {{ difficulty(item) }}
                    </p>
                  </div>
                </div>
              </li>
            </ol>
          </div>
        </div>
      </div>
      <p
        v-if="recommendNotice"
        class="mx-6 mb-6 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 md:mx-8"
      >
        {{ recommendNotice }}
      </p>
    </section>

    <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="text-lg font-semibold text-primary">筛选资源库</h2>
          <p class="mt-1 text-xs text-slate-500">
            当前：{{ currentFilterLabel }} · 匹配 {{ filteredResources.length }} 条
          </p>
        </div>
        <button
          type="button"
          class="rounded-full border border-slate-300 px-3 py-1 text-xs text-slate-600 hover:bg-slate-50"
          @click="clearResourceFilters"
        >
          重置筛选
        </button>
      </div>
      <div class="mt-4 grid gap-4 lg:grid-cols-[0.8fr_1.2fr_1fr]">
        <div>
          <p class="mb-2 text-xs font-medium text-slate-500">资源类型</p>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="type in resourceTypes"
              :key="type.id"
              type="button"
              class="rounded-full border px-3 py-1 text-xs"
              :class="typeClass(type.id)"
              @click="activeType = type.id as 'all' | 'article' | 'book' | 'video'"
            >
              {{ type.label }}
            </button>
          </div>
        </div>
        <div>
          <p class="mb-2 text-xs font-medium text-slate-500">能力 / 周路径</p>
          <div class="max-h-24 overflow-y-auto pr-1">
            <div class="flex flex-wrap gap-2">
              <button
                type="button"
                class="rounded-full border px-3 py-1 text-xs"
                :class="!activeTag ? 'border-primary bg-primary/10 text-primary' : 'border-slate-200 text-slate-600'"
                @click="activeTag = ''"
              >
                全部标签
              </button>
              <button
                v-for="tag in visibleTags"
                :key="tag"
                type="button"
                class="rounded-full border px-3 py-1 text-xs"
                :class="tagClass(tag)"
                @click="activeTag = tag"
              >
                {{ tag }}
              </button>
            </div>
          </div>
        </div>
        <div>
          <p class="mb-2 text-xs font-medium text-slate-500">学习成本与产出</p>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="item in [
                { id: 'all', label: '全部时长' },
                { id: 'short', label: '30分钟内' },
                { id: 'medium', label: '30-60分钟' },
                { id: 'long', label: '60分钟+' },
              ]"
              :key="item.id"
              type="button"
              class="rounded-full border px-3 py-1 text-xs"
              :class="activeDuration === item.id ? 'border-accent bg-accent-muted/40 text-accent' : 'border-slate-200 text-slate-600'"
              @click="activeDuration = item.id as 'all' | 'short' | 'medium' | 'long'"
            >
              {{ item.label }}
            </button>
            <button
              v-for="level in ['全部难度', '基础', '进阶', '实战']"
              :key="level"
              type="button"
              class="rounded-full border px-3 py-1 text-xs"
              :class="activeDifficulty === (level === '全部难度' ? 'all' : level) ? 'border-primary bg-primary/10 text-primary' : 'border-slate-200 text-slate-600'"
              @click="activeDifficulty = (level === '全部难度' ? 'all' : level) as 'all' | '基础' | '进阶' | '实战'"
            >
              {{ level }}
            </button>
            <button
              type="button"
              class="rounded-full border px-3 py-1 text-xs"
              :class="resumeReadyOnly ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-600'"
              @click="resumeReadyOnly = !resumeReadyOnly"
            >
              简历可用
            </button>
          </div>
        </div>
      </div>
      <div class="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
        <p class="text-xs text-slate-600">书籍数据（平台侧）：</p>
        <button
          type="button"
          class="rounded-full border border-primary px-3 py-1 text-xs text-primary hover:bg-slate-50"
          :disabled="syncingBooks"
          @click="syncBooksToPlatform"
        >
          {{ syncingBooks ? '同步中...' : '同步书单到平台' }}
        </button>
        <button
          type="button"
          class="rounded-full border border-primary px-3 py-1 text-xs text-primary hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          :disabled="!platformBooks.length"
          @click="exportBooksJson"
        >
          下载平台书单 JSON
        </button>
        <button
          type="button"
          class="rounded-full border border-primary px-3 py-1 text-xs text-primary hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          :disabled="!platformBooks.length"
          @click="exportBooksCsv"
        >
          下载平台书单 CSV
        </button>
        <span class="text-xs text-slate-500">共 {{ platformBooks.length || bookResources.length }} 本</span>
        <span v-if="platformBooksSyncedAt" class="text-xs text-slate-500">
          最近同步：{{ new Date(platformBooksSyncedAt).toLocaleString('zh-CN') }}
        </span>
      </div>
    </section>

    <section class="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-5">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 class="text-lg font-semibold text-primary">本周热点 · {{ weeklyPickLabel }}</h2>
          <p class="mt-1 text-xs text-slate-600">对标竞品「每周 AI 工具盘点」，优先跟进可执行动作。</p>
        </div>
      </div>
      <div class="mt-3 grid gap-3 sm:grid-cols-3">
        <NuxtLink
          v-for="pick in weeklyPicks"
          :key="pick.id"
          :to="pick.href"
          class="rounded-xl border border-amber-100 bg-white p-4 hover:border-accent"
          @click="trackEvent('weekly_pick_click', { id: pick.id, type: pick.type })"
        >
          <span class="rounded bg-amber-50 px-2 py-0.5 text-[11px] text-amber-800">{{ pick.tag }}</span>
          <h3 class="mt-2 font-medium text-primary">{{ pick.title }}</h3>
          <p class="mt-1 text-xs text-slate-600">{{ pick.summary }}</p>
        </NuxtLink>
      </div>
    </section>

    <section class="rounded-2xl border border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50 p-5">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 class="text-lg font-semibold text-primary">大模型与智能体专题入口</h2>
          <p class="mt-1 text-xs text-slate-600">聚合核心方法论与面试高频话题，优先补齐 AI 产品的技术判断力。</p>
        </div>
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="rounded-full border border-primary bg-white px-3 py-1 text-xs text-primary hover:bg-slate-50"
            @click="openAiTopic"
          >
            只看专题文章
          </button>
          <button
            type="button"
            class="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs text-slate-600 hover:bg-slate-50"
            @click="clearResourceFilters"
          >
            重置筛选
          </button>
          <NuxtLink
            to="/resources/ai-topics"
            class="rounded-full border border-indigo-300 bg-white px-3 py-1 text-xs text-indigo-700 hover:bg-indigo-50"
            @click="trackEvent('resource_ai_topic_enter_page')"
          >
            进入专题页
          </NuxtLink>
        </div>
      </div>
      <div class="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <article
          v-for="item in aiTopicResources.slice(0, 8)"
          :key="`ai-topic-${item.id}`"
          class="rounded-xl border border-purple-100 bg-white p-4"
        >
          <p class="text-xs text-slate-500">W{{ item.week }} · {{ estimatedDuration(item) }} · {{ difficulty(item) }}</p>
          <h3 class="mt-1 font-medium text-primary">{{ item.title }}</h3>
          <p class="mt-1 text-xs text-slate-600">{{ item.summary }}</p>
          <div class="mt-2 flex items-center gap-2">
            <span class="rounded bg-purple-50 px-2 py-0.5 text-[11px] text-purple-700">{{ resourceSourceLabel(item) }}</span>
            <span class="rounded bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">{{ item.tags.slice(0, 2).join(' · ') }}</span>
          </div>
          <div class="mt-2 flex items-center gap-3 text-xs">
            <a
              :href="resolveResourceLink(item)"
              target="_blank"
              rel="noopener noreferrer"
              class="text-accent hover:underline"
              @click="onOpenResource(item)"
            >
              直接阅读 →
            </a>
            <button type="button" class="text-primary hover:underline" @click="sendToChecklist(item)">
              同步到清单
            </button>
          </div>
        </article>
      </div>
    </section>

    <section class="rounded-2xl border border-slate-200 bg-white p-5">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h2 class="text-lg font-semibold text-primary">优质/高热度视频推荐</h2>
        <div class="flex items-center gap-2">
          <span class="text-xs text-slate-500">
            {{ videoFetchedAt ? `最近抓取：${new Date(videoFetchedAt).toLocaleString('zh-CN')}` : '按热度与质量评分排序' }}
          </span>
          <button
            type="button"
            class="rounded-full border border-slate-300 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50"
            :disabled="loadingVideoHot"
            @click="loadVideoHot"
          >
            {{ loadingVideoHot ? '抓取中...' : '刷新热度' }}
          </button>
        </div>
      </div>
      <div class="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <article
          v-for="item in hotVideos"
          :key="`hot-video-${item.id}`"
          class="rounded-xl border border-slate-100 bg-slate-50 p-4"
        >
          <p class="text-xs text-slate-500">
            W{{ item.week }} · {{ playLabel(item) }} · 质量 {{ videoHotMap[item.id]?.quality || item.qualityScore || 0 }}
          </p>
          <h3 class="mt-1 font-medium text-primary">{{ item.title }}</h3>
          <p class="mt-1 text-xs text-slate-600">{{ item.summary }}</p>
          <a
            :href="resolveResourceLink(item)"
            target="_blank"
            rel="noopener noreferrer"
            class="mt-2 inline-block text-xs text-accent hover:underline"
            @click="onOpenResource(item)"
          >
            打开视频 →
          </a>
        </article>
      </div>
    </section>

    <section class="rounded-2xl border border-slate-200 bg-white p-5">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h2 class="text-lg font-semibold text-primary">主理人精选 Top3（可维护）</h2>
        <button
          v-if="founderMode"
          type="button"
          class="rounded-full border px-3 py-1 text-xs"
          :class="curatedEditMode ? 'border-primary bg-primary/10 text-primary' : 'border-slate-200 text-slate-600'"
          @click="curatedEditMode = !curatedEditMode"
        >
          {{ curatedEditMode ? '收起编辑' : '编辑精选' }}
        </button>
        <span v-else class="text-xs text-slate-500">主理人模式可编辑</span>
      </div>
      <div v-if="curatedEditMode" class="mt-3 grid gap-2 sm:grid-cols-3">
        <label v-for="idx in 3" :key="idx" class="text-xs text-slate-600">
          Top {{ idx }}
          <select
            v-model="curatedIds[idx - 1]"
            class="mt-1 w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs"
          >
            <option v-for="item in resources" :key="item.id" :value="item.id">
              W{{ item.week }} · {{ item.title }}
            </option>
          </select>
        </label>
        <div class="sm:col-span-3">
          <button
            type="button"
            class="rounded-lg border border-primary px-3 py-1.5 text-xs text-primary hover:bg-slate-50"
            @click="saveCuratedTop3"
          >
            保存精选配置
          </button>
        </div>
      </div>
      <div class="mt-3 grid gap-3 sm:grid-cols-3">
        <article
          v-for="item in curatedResources"
          :key="`curated-${item.id}`"
          class="rounded-xl border border-slate-100 bg-slate-50 p-4"
        >
          <p class="text-xs text-slate-500">W{{ item.week }} · {{ estimatedDuration(item) }} · {{ difficulty(item) }}</p>
          <h3 class="mt-1 font-medium text-primary">{{ item.title }}</h3>
          <p class="mt-1 text-xs text-slate-600">{{ learningReason(item) }}</p>
          <a
            :href="resolveResourceLink(item)"
            target="_blank"
            rel="noopener noreferrer"
            class="mt-2 inline-block text-xs text-accent hover:underline"
            @click="onOpenResource(item)"
          >
            打开精选资料 →
          </a>
        </article>
      </div>
    </section>

    <section class="rounded-2xl border border-slate-200 bg-white p-5">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h2 class="text-lg font-semibold text-primary">智能推荐：本周必学 3 条</h2>
        <span class="text-xs text-slate-500">目标岗位：{{ roleTarget === 'ai-pm' ? 'AI PM' : 'AI 总监' }}</span>
      </div>
      <div class="mt-3 grid gap-3 sm:grid-cols-3">
        <article
          v-for="item in mustLearnTop3"
          :key="`must-${item.id}`"
          class="rounded-xl border border-slate-100 bg-slate-50 p-4"
        >
          <p class="text-xs text-slate-500">W{{ item.week }} · {{ estimatedDuration(item) }} · {{ difficulty(item) }}</p>
          <h3 class="mt-1 font-medium text-primary">{{ item.title }}</h3>
          <p class="mt-1 text-xs text-slate-600">{{ recommendationReason(item) }}</p>
          <div class="mt-2 flex flex-wrap gap-2 text-xs">
            <a
              :href="resolveResourceLink(item)"
              target="_blank"
              rel="noopener noreferrer"
              class="rounded-full border border-slate-200 bg-white px-2 py-1 text-accent hover:underline"
              @click="onOpenResource(item)"
            >
              打开资料
            </a>
            <button
              type="button"
              class="rounded-full border border-primary bg-primary/10 px-2 py-1 text-primary"
              @click="sendToChecklist(item)"
            >
              一键带入决策清单
            </button>
          </div>
        </article>
      </div>
    </section>

    <section class="rounded-2xl border border-slate-200 bg-white p-5">
      <div class="mb-4 flex items-center justify-between">
        <h2 class="text-lg font-semibold text-primary">资源列表</h2>
        <div class="flex items-center gap-2">
          <span class="text-xs text-slate-500">
            {{ viewMode === 'list' ? visibleResources.length : visibleWeeklyGroups.length }} / {{ viewMode === 'list' ? filteredResources.length : weeklyGroups.length }}
          </span>
          <button
            type="button"
            class="rounded-full border px-2.5 py-1 text-xs"
            :class="viewMode === 'list' ? 'border-accent bg-accent-muted/40 text-accent' : 'border-slate-200 text-slate-600'"
            @click="viewMode = 'list'"
          >
            列表视图
          </button>
          <button
            type="button"
            class="rounded-full border px-2.5 py-1 text-xs"
            :class="viewMode === 'week' ? 'border-accent bg-accent-muted/40 text-accent' : 'border-slate-200 text-slate-600'"
            @click="viewMode = 'week'"
          >
            按周视图
          </button>
        </div>
      </div>
      <div class="mb-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
        学习进度：已完成 {{ completedCount }} / {{ filteredResources.length }}（{{ completionPct }}%）
      </div>
      <div v-if="viewMode === 'list'" class="space-y-3">
        <article
          v-for="item in visibleResources"
          :key="item.id"
          class="rounded-xl border border-slate-100 bg-slate-50 p-4"
        >
          <div class="flex flex-wrap items-center gap-2 text-xs">
            <span
              class="rounded px-1.5 py-0.5"
              :class="item.type === 'video' ? 'bg-video/10 text-video' : item.type === 'book' ? 'bg-primary/10 text-primary' : 'bg-accent/10 text-accent'"
            >
              {{ item.type === 'video' ? '视频' : item.type === 'book' ? '书籍' : '文章' }}
            </span>
            <span class="rounded bg-white px-1.5 py-0.5 text-slate-500">W{{ item.week }}</span>
            <span class="rounded bg-white px-1.5 py-0.5 text-slate-500">{{ estimatedDuration(item) }}</span>
            <span class="rounded bg-white px-1.5 py-0.5 text-slate-500">难度：{{ difficulty(item) }}</span>
            <span
              v-if="isResumeReady(item)"
              class="rounded bg-emerald-50 px-1.5 py-0.5 text-emerald-700"
            >
              简历可用
            </span>
            <span
              v-for="tag in item.tags"
              :key="tag"
              class="rounded bg-white px-1.5 py-0.5 text-slate-500"
            >
              {{ tag }}
            </span>
          </div>
          <h3 class="mt-2 font-medium text-primary">{{ item.title }}</h3>
          <p class="mt-1 text-sm text-slate-600">{{ item.summary }}</p>
          <div class="mt-2 rounded-lg bg-white p-3 text-xs text-slate-600">
            <p><strong class="text-slate-700">看完产出：</strong>{{ expectedOutput(item) }}</p>
          </div>
          <div
            v-if="isResourceExpanded(item.id)"
            class="mt-2 grid gap-2 text-xs text-slate-600 sm:grid-cols-2"
          >
            <p class="rounded bg-white px-2 py-1"><strong class="text-slate-700">为什么看：</strong>{{ learningReason(item) }}</p>
            <p class="rounded bg-white px-2 py-1"><strong class="text-slate-700">面试表达：</strong>{{ interviewTalkTrack(item) }}</p>
            <p class="rounded bg-white px-2 py-1"><strong class="text-slate-700">前置知识：</strong>{{ prerequisites(item) }}</p>
            <p class="rounded bg-white px-2 py-1"><strong class="text-slate-700">完成标准：</strong>{{ definitionOfDone(item) }}</p>
          </div>
          <div class="mt-3 flex flex-wrap items-center gap-3 text-sm">
            <button
              type="button"
              class="rounded-full border px-2.5 py-1 text-xs"
              :class="isCompleted(item.id) ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-slate-300 bg-white text-slate-600'"
              @click="toggleCompleted(item.id)"
            >
              {{ isCompleted(item.id) ? '已完成' : '标记完成' }}
            </button>
            <button
              type="button"
              class="text-primary hover:underline"
              @click="toggleResourceExpanded(item.id)"
            >
              {{ isResourceExpanded(item.id) ? '收起说明' : '展开说明' }}
            </button>
            <a
              :href="resolveResourceLink(item)"
              target="_blank"
              rel="noopener noreferrer"
              class="text-accent hover:underline"
              @click="onOpenResource(item)"
            >
              打开资料 →
            </a>
            <button
              v-if="item.type === 'article'"
              type="button"
              class="text-accent hover:underline"
              @click="openArticleInWebPage(item)"
            >
              网页内阅读 →
            </button>
            <span class="text-xs text-slate-500">来源：{{ resourceSourceLabel(item) }}</span>
            <NuxtLink
              v-if="item.caseSlug"
              :to="`/founder/cases/${item.caseSlug}`"
              class="text-accent hover:underline"
            >
              关联案例 →
            </NuxtLink>
          </div>
        </article>
        <div v-if="listLimit < filteredResources.length" class="flex justify-center pt-2">
          <button
            type="button"
            class="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            @click="listLimit = Math.min(listLimit + 8, filteredResources.length)"
          >
            再显示 8 条（已显示 {{ visibleResources.length }} / {{ filteredResources.length }}）
          </button>
        </div>
      </div>
      <div v-else class="space-y-4">
        <section
          v-for="[week, weekResources] in visibleWeeklyGroups"
          :key="week"
          class="rounded-xl border border-slate-100 bg-slate-50 p-4"
        >
          <h3 class="text-sm font-semibold text-primary">W{{ week }}</h3>
          <ul class="mt-2 space-y-2 text-sm text-slate-700">
            <li v-for="item in weekResources" :key="item.id" class="rounded-lg bg-white p-3">
              <div class="flex items-center justify-between gap-2">
                <p class="font-medium text-primary">{{ item.title }}</p>
                <button
                  type="button"
                  class="rounded-full border px-2 py-0.5 text-xs"
                  :class="isCompleted(item.id) ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-slate-300 text-slate-600'"
                  @click="toggleCompleted(item.id)"
                >
                  {{ isCompleted(item.id) ? '已完成' : '未完成' }}
                </button>
              </div>
              <p class="mt-1 text-xs text-slate-600">{{ item.summary }}</p>
              <div class="mt-2 rounded bg-slate-50 p-2 text-xs text-slate-600">
                <p><strong class="text-slate-700">看完产出：</strong>{{ expectedOutput(item) }}</p>
              </div>
              <a
                :href="resolveResourceLink(item)"
                target="_blank"
                rel="noopener noreferrer"
                class="mt-2 inline-block text-xs text-accent hover:underline"
                @click="onOpenResource(item)"
              >
                打开资料（{{ resourceSourceLabel(item) }}） →
              </a>
              <button
                v-if="item.type === 'article'"
                type="button"
                class="inline-block text-xs text-accent hover:underline"
                @click="openArticleInWebPage(item)"
              >
                网页内阅读 →
              </button>
            </li>
          </ul>
        </section>
        <div v-if="weekLimit < weeklyGroups.length" class="flex justify-center pt-2">
          <button
            type="button"
            class="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            @click="weekLimit = Math.min(weekLimit + 4, weeklyGroups.length)"
          >
            再显示 4 周（已显示 {{ visibleWeeklyGroups.length }} / {{ weeklyGroups.length }}）
          </button>
        </div>
      </div>
    </section>

    <section class="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 class="text-lg font-semibold text-primary">推荐学习顺序（按周）</h2>
      <p class="mt-1 text-sm text-slate-600">先搭框架，再补方法，最后看案例，确保每周有产出。</p>
      <div class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <article
          v-for="item in recommendedOrder"
          :key="`plan-${item.id}`"
          class="rounded-xl border border-slate-100 bg-slate-50 p-4"
        >
          <p class="text-xs text-slate-500">W{{ item.week }} · {{ item.type === 'video' ? '视频' : item.type === 'book' ? '书籍' : '文章' }}</p>
          <p class="mt-1 font-medium text-primary">{{ item.title }}</p>
          <p class="mt-1 text-xs text-slate-600">{{ item.reason }}</p>
        </article>
      </div>
    </section>

    <section>
      <h2 class="text-lg font-semibold text-primary mb-4">主理人案例（可读版）</h2>
      <div class="grid gap-3 sm:grid-cols-3">
        <NuxtLink
          v-for="c in cases"
          :key="c.slug"
          :to="`/founder/cases/${c.slug}`"
          class="rounded-xl border border-slate-200 bg-white p-4 hover:border-accent text-sm"
        >
          <span class="rounded bg-video/10 text-video text-xs px-1.5 py-0.5">案例</span>
          <p class="mt-2 font-medium text-primary">{{ c.title }}</p>
          <p class="mt-1 text-xs text-slate-500 line-clamp-2">{{ c.summary }}</p>
        </NuxtLink>
      </div>
    </section>
  </div>
</template>
