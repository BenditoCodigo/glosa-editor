<script setup lang="ts">
import type { SearchResultNote } from '@/types/search'
import UiIcon from '@/components/ui/UiIcon.vue'

interface Props {
  result: SearchResultNote
  isHighlighted: boolean
}

interface Emits {
  (e: 'select', result: SearchResultNote): void
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
    <!-- Icon: emoji or default note icon -->
    <span
      v-if="result.emoji"
      class="flex items-center justify-center w-8 h-8 text-lg shrink-0"
    >
      {{ result.emoji }}
    </span>
    <span
      v-else
      class="flex items-center justify-center w-8 h-8 shrink-0 text-on-surface-variant"
    >
      <UiIcon name="description" size="md" />
    </span>

    <!-- Content -->
    <div class="flex flex-col min-w-0 gap-0.5">
      <span class="text-sm font-medium text-on-surface truncate">
        {{ result.title }}
      </span>
      <span class="text-xs text-on-surface-variant truncate">
        {{ result.snippet }}
      </span>
    </div>
  </button>
</template>
