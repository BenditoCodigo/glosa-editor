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
  <nav class="flex items-center px-4 lg:px-6 py-2 pointer-events-none">
    <div class="glass-panel-md flex items-center gap-1 px-5 py-2.5 rounded-full text-sm pointer-events-auto">
      <template v-for="(segment, index) in segments" :key="index">
        <button
          v-if="segment.path"
          class="text-secondary hover:text-primary transition-colors whitespace-nowrap"
          @click="$emit('navigate', segment.path)"
        >
          {{ segment.label }}
        </button>
        <span v-else class="text-on-surface font-medium whitespace-nowrap">{{ segment.label }}</span>

        <span v-if="index < segments.length - 1" class="text-outline-variant mx-1">/</span>
      </template>
    </div>
  </nav>
</template>
