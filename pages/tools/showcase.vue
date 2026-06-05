<script setup lang="ts">
import {
  SHOWCASE_STORAGE_KEY,
  showcaseAgenda,
  showcaseRubric,
  showcaseVideoChecklist,
  showcaseSampleVideoUrl,
  computeShowcaseScore,
} from '~/lib/showcase'
import { trackEvent } from '~/lib/analytics'
import { demoShowcasePitch } from '~/lib/demo-data'

const projectName = ref('')
const pitchNotes = ref('')
const demoVideoUrl = ref('')
const checklist = ref<Record<string, boolean>>({})
const videoChecklist = ref<Record<string, boolean>>({})
const copied = ref(false)

const score = computed(() => computeShowcaseScore(checklist.value))

onMounted(() => {
  if (!import.meta.client) return
  trackEvent('showcase_view')
  try {
    const raw = localStorage.getItem(SHOWCASE_STORAGE_KEY)
    if (!raw) return
    const data = JSON.parse(raw) as {
      projectName?: string
      pitchNotes?: string
      demoVideoUrl?: string
      checklist?: Record<string, boolean>
      videoChecklist?: Record<string, boolean>
    }
    projectName.value = data.projectName || ''
    pitchNotes.value = data.pitchNotes || ''
    demoVideoUrl.value = data.demoVideoUrl || ''
    checklist.value = data.checklist || {}
    videoChecklist.value = data.videoChecklist || {}
  } catch {
    // noop
  }
})

function persist() {
  if (!import.meta.client) return
  localStorage.setItem(
    SHOWCASE_STORAGE_KEY,
    JSON.stringify({
      projectName: projectName.value,
      pitchNotes: pitchNotes.value,
      demoVideoUrl: demoVideoUrl.value,
      checklist: checklist.value,
      videoChecklist: videoChecklist.value,
    }),
  )
}

function toggleItem(id: string) {
  checklist.value = { ...checklist.value, [id]: !checklist.value[id] }
  persist()
  trackEvent('showcase_rubric_toggle', { id, score: score.value })
}

function toggleVideoItem(id: string) {
  videoChecklist.value = { ...videoChecklist.value, [id]: !videoChecklist.value[id] }
  persist()
  trackEvent('showcase_video_check', { id })
}

async function copyPitchOutline() {
  if (!import.meta.client || !navigator.clipboard) return
  const lines = [
    `# 路演稿 · ${projectName.value || '未命名项目'}`,
    '',
    '## 5 分钟议程',
    ...showcaseAgenda.map((line) => `- ${line}`),
    '',
    '## 备注',
    pitchNotes.value || '（待补充）',
    '',
    demoVideoUrl.value ? `## 录播链接\n${demoVideoUrl.value}` : '## 录播链接\n（开营后上传或粘贴 B 站/飞书链接）',
    '',
    `## Rubric 自评：${score.value}/100`,
    ...showcaseRubric.map((r) => `- [${checklist.value[r.id] ? 'x' : ' '}] ${r.label}`),
  ]
  await navigator.clipboard.writeText(lines.join('\n'))
  copied.value = true
  trackEvent('showcase_pitch_copy', { score: score.value })
  setTimeout(() => {
    copied.value = false
  }, 1500)
}

function fillDemoPitch() {
  projectName.value = demoShowcasePitch.projectName
  pitchNotes.value = demoShowcasePitch.pitchNotes
  demoVideoUrl.value = demoShowcasePitch.demoVideoUrl
  checklist.value = demoShowcasePitch.checklist
  videoChecklist.value = demoShowcasePitch.videoChecklist
  persist()
  trackEvent('showcase_demo_fill', { score: score.value })
}
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-6">
    <CorePathRibbon />

    <section class="glass-panel rounded-2xl border border-slate-200 p-6">
      <h1 class="text-2xl font-bold text-primary">路演点评 · 5 分钟 Demo</h1>
      <p class="mt-2 text-sm text-slate-600">
        对标起点/慕课「直播路演点评」：按 Rubric 自评后，可提交到作业批改申请真人反馈。
      </p>
      <p class="mt-2 text-lg font-semibold text-accent">Rubric 得分：{{ score }}/100</p>
      <div class="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          class="rounded-lg border border-violet-300 bg-violet-50 px-4 py-2 text-sm font-medium text-violet-700 hover:bg-violet-100"
          @click="fillDemoPitch"
        >
          一键填入样例路演稿
        </button>
        <NuxtLink to="/share/demo-copilot-eval" class="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-white">
          查看样例成果页
        </NuxtLink>
      </div>
    </section>

    <section class="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
      <div>
        <label class="text-sm font-medium text-primary">项目名称</label>
        <input
          v-model="projectName"
          type="text"
          class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          placeholder="例如：客服 Copilot V1"
          @input="persist"
        />
      </div>
      <div>
        <label class="text-sm font-medium text-primary">5 分钟议程（参考）</label>
        <ul class="mt-2 list-disc pl-5 text-xs text-slate-600 space-y-1">
          <li v-for="line in showcaseAgenda" :key="line">{{ line }}</li>
        </ul>
      </div>
      <div>
        <label class="text-sm font-medium text-primary">路演备注 / 讲稿要点</label>
        <textarea
          v-model="pitchNotes"
          rows="6"
          class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          placeholder="痛点、Demo 路径、指标、Q&A 准备..."
          @input="persist"
        />
      </div>
    </section>

    <section class="rounded-2xl border border-rose-100 bg-rose-50/30 p-6 space-y-4">
      <h2 class="font-semibold text-primary">录播占位 · Demo 视频</h2>
      <p class="text-xs text-slate-600">
        对标竞品「结业路演录播」：开营后可上传 B 站/飞书链接，供主理人异步点评。
      </p>
      <div>
        <label class="text-sm font-medium text-primary">录播链接（可选）</label>
        <input
          v-model="demoVideoUrl"
          type="url"
          class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          placeholder="https://www.bilibili.com/video/... 或飞书妙记链接"
          @input="persist"
        />
      </div>
      <ul class="space-y-2">
        <li
          v-for="(tip, index) in showcaseVideoChecklist"
          :key="tip"
          class="flex items-center justify-between gap-2 rounded-lg border border-white bg-white/80 px-3 py-2 text-xs"
        >
          <span>{{ tip }}</span>
          <button
            type="button"
            class="rounded-full border px-2 py-0.5"
            :class="videoChecklist[`v${index}`] ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-slate-200'"
            @click="toggleVideoItem(`v${index}`)"
          >
            {{ videoChecklist[`v${index}`] ? '✓' : '标记' }}
          </button>
        </li>
      </ul>
      <p class="text-xs text-slate-500">
        参考样例（占位）：
        <a :href="showcaseSampleVideoUrl" target="_blank" rel="noopener" class="text-accent hover:underline">
          5 分钟 Demo 结构参考
        </a>
      </p>
    </section>

    <section class="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-6">
      <h2 class="font-semibold text-primary">路演 Rubric 自检</h2>
      <div class="mt-3 space-y-2">
        <article
          v-for="item in showcaseRubric"
          :key="item.id"
          class="rounded-xl border bg-white p-4"
          :class="checklist[item.id] ? 'border-emerald-200' : 'border-slate-200'"
        >
          <div class="flex items-start justify-between gap-2">
            <div>
              <p class="text-sm font-medium text-primary">{{ item.label }}（{{ item.weight }}分）</p>
              <p class="mt-1 text-xs text-slate-500">{{ item.hint }}</p>
            </div>
            <button
              type="button"
              class="shrink-0 rounded-full border px-3 py-1 text-xs"
              :class="checklist[item.id] ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-slate-200'"
              @click="toggleItem(item.id)"
            >
              {{ checklist[item.id] ? '已完成' : '标记' }}
            </button>
          </div>
        </article>
      </div>
    </section>

    <div class="flex flex-wrap gap-3">
      <button
        type="button"
        class="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
        @click="copyPitchOutline"
      >
        {{ copied ? '已复制路演大纲' : '复制路演大纲' }}
      </button>
      <NuxtLink
        to="/tools/homework?type=project-lab&from=showcase"
        class="rounded-lg border border-primary px-4 py-2 text-sm font-medium text-primary hover:bg-slate-50"
        @click="trackEvent('showcase_to_homework')"
      >
        提交路演稿申请点评 →
      </NuxtLink>
      <NuxtLink to="/tools/project-lab" class="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50">
        回到项目 Lab
      </NuxtLink>
    </div>
  </div>
</template>
