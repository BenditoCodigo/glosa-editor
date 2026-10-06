<script setup lang="ts">
import type { SearchResultFolder } from '@/types/search'
import UiIcon from '@/components/ui/UiIcon.vue'

interface Props {
  result: SearchResultFolder
  isHighlighted: boolean
}

interface Emits {
  (e: 'select', result: SearchResultFolder): void
}

const { result, isHighlighted } = defineProps<Props>()
const emit = defineEmits<Emits>()
</script>

<template>
  <button
    type="button"
    :class="[
      'flex items-center w-full gap-3 px-3 py-2 text-left rounded-lg transition-colors',
      isHighlighted && 'bg-primary/10',
    ]"
    @click="emit('select', result)"
  >
    <UiIcon name="folder" size="sm" class="shrink-0 text-on-surface-variant" />

    <div class="min-w-0">
      <p class="truncate text-sm font-medium text-on-surface">
        {{ result.name }}
      </p>
      <p v-if="result.parentPath" class="truncate text-xs text-on-surface-variant">
        en /{{ result.parentPath }}
      </p>
    </div>
  </button>
</template>
