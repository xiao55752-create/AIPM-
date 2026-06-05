<script setup lang="ts">
import { cases } from '~/lib/cases'
import { corePathSteps } from '~/lib/core-path'
import { demoAssets, demoShare, demoShareSlug } from '~/lib/demo-data'

const features = [
  { title: '5 分钟自测', desc: '18 题 + 招聘对标匹配度报告', to: '/assessment', span: 'col-span-12 md:col-span-5' },
  { title: '12 周路径', desc: '按短板自动聚焦重点周', to: '/path', span: 'col-span-12 md:col-span-7' },
  { title: '招聘对标', desc: 'AI PM / 总监双视角 JD 映射', to: '/market', span: 'col-span-12 md:col-span-4' },
  { title: '学习资源', desc: '案例、书单、视频，按周挂接', to: '/resources', span: 'col-span-12 md:col-span-4' },
  { title: '在线清单', desc: '评审、STAR、求职包一站输出', to: '/tools/checklist', span: 'col-span-12 md:col-span-4' },
]

type CtaVariant = 'a' | 'b'

const route = useRoute()
const ctaVariant = ref<CtaVariant>('a')

const heroContent = computed(() => {
  if (ctaVariant.value === 'b') {
    return {
      lead: '12 周成长冲刺营',
      headlinePrefix: '从“会一点 AI”到',
      headlineHighlight: '拿得出结果的 AI 产品人',
      desc: '围绕真实工作场景，每周产出可交付物，持续积累求职与晋升素材。',
      primary: '领取我的成长路径',
      secondary: '先看岗位差距',
    }
  }
  return {
    lead: 'AI 产品成长操作系统',
    headlinePrefix: '用 12 周，把 AI 学习转成',
    headlineHighlight: '可求职、可晋升的成果',
    desc: '先测能力，再走路径，再用工具交付结果。不是囤课，是每周完成一件对工作有用的事。',
    primary: '开始 5 分钟自测',
    secondary: '查看招聘对标',
  }
})

onMounted(() => {
  const fromQuery = route.query.cta
  if (fromQuery === 'a' || fromQuery === 'b') {
    ctaVariant.value = fromQuery
    localStorage.setItem('apgc-cta-variant', fromQuery)
    return
  }

  const stored = localStorage.getItem('apgc-cta-variant')
  if (stored === 'a' || stored === 'b') {
    ctaVariant.value = stored
    return
  }

  ctaVariant.value = Math.random() > 0.5 ? 'a' : 'b'
  localStorage.setItem('apgc-cta-variant', ctaVariant.value)
})
</script>

<template>
  <div class="space-y-14">
    <section class="glass-panel rounded-2xl px-6 py-10 sm:px-10">
      <div class="grid items-center gap-8 md:grid-cols-2">
        <div>
          <p class="inline-flex items-center rounded-full bg-accent-muted px-3 py-1 text-xs font-medium text-accent">
            {{ heroContent.lead }}
          </p>
          <h1 class="mt-4 text-3xl font-bold leading-tight text-primary sm:text-4xl">
            {{ heroContent.headlinePrefix }}
            <span class="text-accent">{{ heroContent.headlineHighlight }}</span>
          </h1>
          <p class="mt-4 text-slate-600">
            {{ heroContent.desc }}
          </p>
          <div class="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
            <span class="rounded-full border border-slate-200 bg-white px-2.5 py-1">真实案例驱动</span>
            <span class="rounded-full border border-slate-200 bg-white px-2.5 py-1">招聘要求对标</span>
            <span class="rounded-full border border-slate-200 bg-white px-2.5 py-1">结果可导出复用</span>
          </div>
          <div class="mt-7 flex flex-wrap gap-3">
            <NuxtLink
              to="/assessment"
              class="rounded-lg bg-accent px-6 py-3 font-medium text-white transition-colors hover:bg-accent-hover"
            >
              {{ heroContent.primary }}
            </NuxtLink>
            <NuxtLink
              to="/market"
              class="rounded-lg border border-primary px-6 py-3 font-medium text-primary hover:bg-slate-50"
            >
              {{ heroContent.secondary }}
            </NuxtLink>
          </div>
        </div>

        <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 class="text-sm font-semibold text-primary">核心路径</h2>
          <ol class="mt-3 space-y-2 text-sm">
            <li
              v-for="step in corePathSteps.slice(0, 6)"
              :key="step.id"
              class="rounded-lg bg-slate-50 p-3"
            >
              <NuxtLink :to="step.to" class="block hover:text-accent">
                <span class="font-medium text-primary">{{ step.label }}：</span>
                {{ step.title }}
              </NuxtLink>
            </li>
          </ol>
          <p class="mt-4 text-xs text-slate-500">主理人：十年政企 AI 产品总监 · 陈总监</p>
        </div>
      </div>
    </section>

    <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div class="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 class="text-xl font-semibold text-primary">一条主路径，少走弯路</h2>
          <p class="mt-1 text-sm text-slate-500">所有页面都围绕这 6 步服务：先定位，再学习，再交付，再被点评。</p>
        </div>
        <NuxtLink to="/resources" class="text-sm font-medium text-accent hover:underline">
          从资源开始 →
        </NuxtLink>
      </div>
      <div class="grid gap-3 md:grid-cols-3">
        <NuxtLink
          v-for="step in corePathSteps"
          :key="`home-path-${step.id}`"
          :to="step.to"
          class="rounded-xl border border-slate-100 bg-slate-50 p-4 hover:border-accent hover:bg-white"
        >
          <p class="text-xs font-medium text-accent">{{ step.label }}</p>
          <h3 class="mt-1 font-semibold text-primary">{{ step.title }}</h3>
          <p class="mt-1 text-sm text-slate-600">{{ step.desc }}</p>
        </NuxtLink>
      </div>
    </section>

    <section class="overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-sm">
      <div class="grid gap-0 lg:grid-cols-[0.95fr_1.05fr]">
        <div class="bg-gradient-to-br from-emerald-50 to-accent-muted/40 p-6">
          <p class="text-xs font-medium text-emerald-700">成果样例</p>
          <h2 class="mt-2 text-2xl font-bold text-primary">最终不是一堆笔记，而是一份可展示成果</h2>
          <p class="mt-3 text-sm leading-6 text-slate-600">
            下面这份样例串起了项目 Lab、Eval、路演、批改和成果页，适合用来理解 12 周后应该沉淀成什么样。
          </p>
          <div class="mt-5 grid gap-3 text-sm">
            <div class="rounded-xl border border-white bg-white/80 p-3">
              <p class="text-xs text-slate-500">项目样例</p>
              <p class="mt-1 font-medium text-primary">{{ demoAssets.projectTitle }}</p>
            </div>
            <div class="rounded-xl border border-white bg-white/80 p-3">
              <p class="text-xs text-slate-500">路演样例</p>
              <p class="mt-1 font-medium text-primary">{{ demoAssets.pitchTitle }}</p>
            </div>
            <div class="rounded-xl border border-white bg-white/80 p-3">
              <p class="text-xs text-slate-500">批改样例</p>
              <p class="mt-1 text-slate-700">{{ demoAssets.reviewSummary }}</p>
            </div>
          </div>
        </div>
        <div class="p-6">
          <div class="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <span class="rounded-full bg-emerald-50 px-3 py-1 text-xs text-emerald-700">
                完成度 {{ demoShare.score }} 分
              </span>
              <span class="text-xs text-slate-500">{{ demoAssets.notificationStatus }}</span>
            </div>
            <h3 class="mt-3 text-lg font-semibold text-primary">{{ demoShare.title }}</h3>
            <p class="mt-2 text-sm text-slate-600">{{ demoShare.subtitle }}</p>
            <div class="mt-4 flex flex-wrap gap-2">
              <span
                v-for="h in demoShare.highlights"
                :key="h"
                class="rounded-full border border-emerald-200 bg-white px-2.5 py-1 text-xs text-emerald-700"
              >
                {{ h }}
              </span>
            </div>
            <div class="mt-5 flex flex-wrap gap-3">
              <NuxtLink
                :to="`/share/${demoShareSlug}`"
                class="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
              >
                查看样例成果页
              </NuxtLink>
              <NuxtLink
                to="/tools/project-lab"
                class="rounded-lg border border-primary px-4 py-2 text-sm font-medium text-primary hover:bg-white"
              >
                我也做一个项目
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="grid gap-3 sm:grid-cols-4">
      <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p class="text-xs text-slate-500">已覆盖能力维</p>
        <p class="mt-1 text-2xl font-bold text-primary">6 大</p>
      </div>
      <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p class="text-xs text-slate-500">成长路径</p>
        <p class="mt-1 text-2xl font-bold text-primary">12 周</p>
      </div>
      <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p class="text-xs text-slate-500">求职输出</p>
        <p class="mt-1 text-2xl font-bold text-primary">一键导出</p>
      </div>
      <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p class="text-xs text-slate-500">目标人群</p>
        <p class="mt-1 text-2xl font-bold text-primary">AI PM/总监</p>
      </div>
    </section>

    <section>
      <div class="mb-5 flex items-end justify-between">
        <h2 class="text-xl font-semibold text-primary">核心能力区（Bento）</h2>
        <p class="text-sm text-slate-500">测 -> 走 -> 学 -> 用</p>
      </div>
      <div class="bento-grid">
        <NuxtLink
          v-for="f in features"
          :key="f.title"
          :to="f.to"
          class="glass-panel rounded-2xl p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/40"
          :class="f.span"
        >
          <h3 class="text-base font-semibold text-primary">{{ f.title }}</h3>
          <p class="mt-2 text-sm text-slate-600">{{ f.desc }}</p>
          <p class="mt-4 text-sm font-medium text-accent">进入 →</p>
        </NuxtLink>
      </div>
    </section>

    <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 class="text-lg font-semibold text-primary">为什么它比“普通学习平台”更有用</h2>
      <div class="mt-4 grid gap-3 sm:grid-cols-3">
        <div class="rounded-xl bg-slate-50 p-4 text-sm">
          <p class="font-medium text-primary">有结果，不只是内容</p>
          <p class="mt-1 text-slate-600">每周至少产出一个可用于工作/求职的交付物。</p>
        </div>
        <div class="rounded-xl bg-slate-50 p-4 text-sm">
          <p class="font-medium text-primary">有对标，不是盲学</p>
          <p class="mt-1 text-slate-600">直接对齐 AI PM / 总监 JD 高频要求。</p>
        </div>
        <div class="rounded-xl bg-slate-50 p-4 text-sm">
          <p class="font-medium text-primary">可复用，不是一次性</p>
          <p class="mt-1 text-slate-600">支持导出求职包、历史回填，持续迭代版本。</p>
        </div>
      </div>
    </section>

    <section>
      <h2 class="mb-6 text-xl font-semibold text-primary">真实项目，脱敏复盘</h2>
      <div class="grid gap-4 sm:grid-cols-3">
        <NuxtLink
          v-for="c in cases"
          :key="c.slug"
          :to="`/founder/cases/${c.slug}`"
          class="rounded-xl border border-slate-200 bg-surface p-4 shadow-sm hover:border-accent"
        >
          <h3 class="font-medium text-primary">{{ c.title }}</h3>
          <p class="mt-2 text-sm text-slate-600 line-clamp-2">{{ c.summary }}</p>
        </NuxtLink>
      </div>
      <p class="mt-4 text-center text-sm text-slate-500">
        数千万级回款 · 过亿级成交 · 十年+ 实战
      </p>
    </section>

    <section class="rounded-2xl bg-accent-muted/50 border border-accent/20 p-6 text-center">
      <h2 class="text-lg font-semibold text-primary">需要有人陪着走完 12 周？</h2>
      <p class="mt-2 text-sm text-slate-600">第 1 期成长营筹备中 · 限 30 人 · 先做自测看匹配度</p>
      <div class="mt-4 flex flex-wrap justify-center gap-3">
        <NuxtLink to="/camp" class="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-accent-hover">
          了解成长营
        </NuxtLink>
        <NuxtLink to="/assessment" class="rounded-lg border border-accent px-5 py-2.5 text-sm font-medium text-accent hover:bg-white/60">
          先做自测
        </NuxtLink>
      </div>
    </section>
  </div>
</template>
