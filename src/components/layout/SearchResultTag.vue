<script setup lang="ts">
import type { SearchResultTag } from '@/types/search'
import UiIcon from '@/components/ui/UiIcon.vue'

interface Props {
  result: SearchResultTag
  isHighlighted: boolean
}

interface Emits {
  (e: 'select', result: SearchResultTag): void
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
    <UiIcon name="label" size="sm" class="shrink-0 text-on-surface-variant" />

    <div class="flex items-center min-w-0 gap-2">
      <span class="text-sm font-medium text-on-surface truncate">
        {{ result.name }}
      </span>
      <span class="text-xs text-on-surface-variant shrink-0">
        {{ result.noteCount }} {{ result.noteCount === 1 ? 'nota' : 'notas' }}
      </span>
    </div>
  </button>
</template>
