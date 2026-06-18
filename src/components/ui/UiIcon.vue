<script setup lang="ts">
interface Props {
  name: string
  size?: 'sm' | 'md' | 'lg'
  filled?: boolean
}

const { name, size = 'md', filled = false } = defineProps<Props>()

const sizeClasses = {
  sm: 'text-[18px]',
  md: 'text-[20px]',
  lg: 'text-[24px]',
} as const
</script>

<template>
  <span
    class="material-symbols-outlined select-none leading-none"
    :class="[sizeClasses[size], filled && 'filled-icon']"
    :style="{ fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' 300, 'GRAD' 0, 'opsz' 20` }"
  >{{ name }}</span>
</template>
