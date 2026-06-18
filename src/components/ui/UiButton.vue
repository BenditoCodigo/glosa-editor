<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  variant?: 'solid' | 'ghost' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
}

const { variant = 'solid', size = 'md', disabled = false, loading = false } = defineProps<Props>()

const sizeClasses = {
  sm: 'h-8 px-3 text-sm rounded-lg gap-1.5',
  md: 'h-10 px-4 text-sm rounded-xl gap-2',
  lg: 'h-12 px-6 text-base rounded-xl gap-2',
} as const

const variantClasses = {
  solid: 'bg-primary/90 text-on-primary border border-white/20 shadow-sm hover:opacity-90 active:scale-95',
  ghost: 'bg-transparent text-secondary hover:bg-white/20 dark:hover:bg-white/5',
  outline: 'border border-outline-variant bg-transparent text-on-surface hover:bg-surface-container-high',
} as const

const classes = computed(() => [
  'inline-flex items-center justify-center font-semibold transition-all duration-200 select-none',
  sizeClasses[size],
  variantClasses[variant],
  (disabled || loading) && 'opacity-50 pointer-events-none',
])
</script>

<template>
  <button :class="classes" :disabled="disabled || loading">
    <slot name="icon-left" />
    <slot />
    <slot name="icon-right" />
  </button>
</template>
