<script setup lang="ts">
const { active: founderMode, loadFounderMode } = useFounderMode()

onMounted(() => {
  loadFounderMode()
})
</script>

<template>
  <footer class="border-t border-slate-200 bg-surface py-8 text-sm text-slate-500">
    <div class="mx-auto max-w-5xl px-4 sm:px-6">
      <p class="mb-2 font-medium text-primary">AI 产品成长营</p>
      <p class="mb-4">让忙碌的产品人，每周只进步一点，但进步在点子上。</p>
      <div class="flex flex-wrap gap-4">
        <NuxtLink to="/assessment" class="hover:text-accent">自测</NuxtLink>
        <NuxtLink to="/path" class="hover:text-accent">路径</NuxtLink>
        <NuxtLink to="/tasks" class="hover:text-accent">周任务</NuxtLink>
        <NuxtLink to="/market" class="hover:text-accent">招聘对标</NuxtLink>
        <NuxtLink to="/resources" class="hover:text-accent">学习资源</NuxtLink>
        <NuxtLink to="/tools" class="hover:text-accent">工具箱</NuxtLink>
        <NuxtLink v-if="founderMode" to="/ops" class="hover:text-accent">运营看板</NuxtLink>
        <NuxtLink to="/founder" class="hover:text-accent">主理人</NuxtLink>
        <NuxtLink to="/camp" class="hover:text-accent">成长营</NuxtLink>
      </div>
      <p class="mt-6 text-xs">© {{ new Date().getFullYear() }} AI 产品成长营 · 内容仅供参考</p>
    </div>
  </footer>
</template>
