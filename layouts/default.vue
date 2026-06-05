<script setup lang="ts">
const route = useRoute()
const hideFooter = computed(() => route.path === '/assessment/quiz')
</script>

<template>
  <div class="flex min-h-screen flex-col bg-page text-slate-700">
    <AppHeader />
    <main class="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
      <slot />
    </main>
    <AppFooter v-if="!hideFooter" />
  </div>
</template>
