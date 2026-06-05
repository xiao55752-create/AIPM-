<script setup lang="ts">
import type { Dimension } from '~/lib/scoring'
import { dimLabels } from '~/lib/scoring'

const props = defineProps<{
  scores: Record<Dimension, number>
}>()

const dims: Dimension[] = ['D1', 'D2', 'D3', 'D4', 'D5', 'D6']
const size = 220
const center = size / 2
const maxR = 90

function point(i: number, value: number) {
  const angle = (Math.PI * 2 * i) / dims.length - Math.PI / 2
  const r = (value / 100) * maxR
  return {
    x: center + r * Math.cos(angle),
    y: center + r * Math.sin(angle),
  }
}

const polygon = computed(() => {
  return dims
    .map((d, i) => {
      const p = point(i, props.scores[d])
      return `${p.x},${p.y}`
    })
    .join(' ')
})

const gridLevels = [25, 50, 75, 100]
</script>

<template>
  <div class="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
    <svg :width="size" :height="size" class="shrink-0">
      <g v-for="level in gridLevels" :key="level">
        <polygon
          :points="
            dims
              .map((_, i) => {
                const p = point(i, level)
                return `${p.x},${p.y}`
              })
              .join(' ')
          "
          fill="none"
          stroke="#E2E8F0"
          stroke-width="1"
        />
      </g>
      <polygon :points="polygon" fill="rgba(13, 148, 136, 0.25)" stroke="#0D9488" stroke-width="2" />
      <text
        v-for="(d, i) in dims"
        :key="d"
        :x="point(i, 115).x"
        :y="point(i, 115).y"
        text-anchor="middle"
        dominant-baseline="middle"
        class="fill-slate-600 text-[10px]"
      >
        {{ dimLabels[d].slice(0, 4) }}
      </text>
    </svg>
    <ul class="space-y-1 text-sm">
      <li v-for="d in dims" :key="d" class="flex justify-between gap-8">
        <span>{{ dimLabels[d] }}</span>
        <span class="font-medium text-accent">{{ scores[d] }}</span>
      </li>
    </ul>
  </div>
</template>
