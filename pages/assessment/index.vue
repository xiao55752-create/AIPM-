<template>
  <div class="mx-auto max-w-4xl space-y-6">
    <section class="glass-panel rounded-2xl border border-slate-200 p-6">
      <p class="inline-flex rounded-full border border-accent/20 bg-accent-muted px-3 py-1 text-xs text-accent">
        5-8 分钟完成 · 结果可落地
      </p>
      <h1 class="mt-3 text-3xl font-bold text-primary">AI 产品能力自测</h1>
      <p class="mt-2 text-sm text-slate-600">
        18 道场景题，输出雷达报告、建议起始周与本周一件事，直接进入你的执行闭环。
      </p>
      <div class="mt-4 grid gap-2 text-xs text-slate-600 sm:grid-cols-3">
        <p class="rounded-lg border border-slate-200 bg-white px-3 py-2">输出个性化成长报告</p>
        <p class="rounded-lg border border-slate-200 bg-white px-3 py-2">可同步到周任务与决策清单</p>
        <p class="rounded-lg border border-slate-200 bg-white px-3 py-2">默认仅本机存储，支持备份</p>
      </div>
    </section>

    <section class="grid gap-4 lg:grid-cols-2">
      <NuxtLink
        to="/assessment/quiz"
        class="group block rounded-2xl border-2 border-accent bg-white p-6 shadow-sm transition hover:bg-accent-muted/20"
      >
        <p class="text-xs text-accent">主路径</p>
        <h2 class="mt-1 text-xl font-semibold text-primary">开始答题</h2>
        <p class="mt-2 text-sm text-slate-600">18 道场景题 · 一题一屏 · 支持断点恢复</p>
        <p class="mt-5 text-sm font-medium text-accent group-hover:translate-x-0.5 transition-transform">
          立即进入 →
        </p>
      </NuxtLink>

      <NuxtLink
        to="/assessment/resume"
        class="group block rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-accent/40 hover:bg-slate-50"
      >
        <p class="text-xs text-slate-500">可选增强</p>
        <h2 class="mt-1 text-xl font-semibold text-primary">粘贴或上传简历</h2>
        <p class="mt-2 text-sm text-slate-600">支持文件上传/粘贴文本，解析后再答题，报告更精准。</p>
        <p class="mt-5 text-sm font-medium text-accent group-hover:translate-x-0.5 transition-transform">
          先导入简历 →
        </p>
      </NuxtLink>
    </section>

    <section class="rounded-2xl border border-slate-200 bg-white p-5">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p class="text-sm font-medium text-primary">已有结果或中途退出？</p>
          <p class="mt-1 text-xs text-slate-500">可以直接回到报告页继续下一步执行。</p>
        </div>
        <NuxtLink
          to="/assessment/report"
          class="rounded-lg border border-primary px-4 py-2 text-sm font-medium text-primary hover:bg-slate-50"
        >
          查看报告 →
        </NuxtLink>
      </div>
    </section>

    <section class="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 class="text-lg font-semibold text-primary">自测后你会得到什么</h2>
      <div class="mt-3 grid gap-3 md:grid-cols-3">
        <article class="rounded-xl border border-slate-100 bg-slate-50 p-4">
          <p class="text-xs text-slate-500">STEP 1</p>
          <p class="mt-1 font-medium text-primary">能力雷达报告</p>
          <p class="mt-1 text-xs text-slate-600">6 维能力得分 + 当前阶段判断。</p>
        </article>
        <article class="rounded-xl border border-slate-100 bg-slate-50 p-4">
          <p class="text-xs text-slate-500">STEP 2</p>
          <p class="mt-1 font-medium text-primary">12 周执行路径</p>
          <p class="mt-1 text-xs text-slate-600">自动给出建议起始周、重点周、本周一件事。</p>
        </article>
        <article class="rounded-xl border border-slate-100 bg-slate-50 p-4">
          <p class="text-xs text-slate-500">STEP 3</p>
          <p class="mt-1 font-medium text-primary">产出可复用成果</p>
          <p class="mt-1 text-xs text-slate-600">同步清单并生成 STAR / 简历条目 / 求职包。</p>
        </article>
      </div>
      <div class="mt-4 flex flex-wrap gap-3 text-sm">
        <NuxtLink to="/assessment/report" class="rounded-lg border border-primary px-4 py-2 text-primary hover:bg-slate-50">
          查看报告样例 →
        </NuxtLink>
        <NuxtLink to="/founder/cases/bid-agent" class="rounded-lg border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50">
          查看真实案例 →
        </NuxtLink>
      </div>
    </section>
  </div>
</template>
