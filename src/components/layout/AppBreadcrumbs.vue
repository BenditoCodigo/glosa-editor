<script setup lang="ts">
interface BreadcrumbSegment {
  label: string
  path?: string
}

interface Props {
  segments: BreadcrumbSegment[]
}

defineProps<Props>()

defineEmits<{
  navigate: [path: string]
}>()
</script>

<template>
  <nav class="flex items-center gap-1 text-sm text-secondary px-6 lg:px-12 py-3 border-t border-white/20">
    <template v-for="(segment, index) in segments" :key="index">
      <button
        v-if="segment.path"
        class="hover:text-primary transition-colors"
        @click="$emit('navigate', segment.path)"
      >
        {{ segment.label }}
      </button>
      <span v-else class="text-on-surface font-medium">{{ segment.label }}</span>

      <span v-if="index < segments.length - 1" class="text-outline-variant mx-1">/</span>
    </template>
  </nav>
</template>
