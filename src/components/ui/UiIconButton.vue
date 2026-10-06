<script setup lang="ts">
import { computed } from 'vue'
import UiIcon from './UiIcon.vue'

interface Props {
  icon: string
  variant?: 'ghost' | 'solid'
  size?: 'sm' | 'md' | 'lg'
  ariaLabel: string
  filled?: boolean
  tooltip?: string
}

const {
  icon,
  variant = 'ghost',
  size = 'md',
  ariaLabel,
  filled = false,
  tooltip,
} = defineProps<Props>()

const sizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
} as const

const variantClasses = {
  ghost: 'text-secondary hover:bg-white/20 dark:hover:bg-white/5',
  solid: 'bg-primary-container text-on-primary-container hover:opacity-90',
} as const

const classes = computed(() => [
  'inline-flex items-center justify-center rounded-full transition-all duration-200 active:translate-y-px select-none',
  sizeClasses[size],
  variantClasses[variant],
])
</script>

<template>
  <button :class="classes" :aria-label="ariaLabel" :title="tooltip || ariaLabel">
    <UiIcon :name="icon" :filled="filled" />
  </button>
</template>
