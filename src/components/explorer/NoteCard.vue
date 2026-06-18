<script setup lang="ts">
import UiIcon from '@/components/ui/UiIcon.vue'
import type { Note } from '@/types'

interface Props {
  note: Note
}

defineProps<Props>()

defineEmits<{
  dblclick: []
  toggleFavorite: []
}>()
</script>

<template>
  <div
    class="
      group glass-panel-md
      p-6 rounded-2xl
      cursor-pointer
      flex flex-col gap-3
      transition-all duration-200
      hover:bg-white/50 dark:hover:bg-white/10
      will-change-transform
    "
    @dblclick="$emit('dblclick')"
  >
    <!-- Header -->
    <div class="flex justify-between items-start">
      <UiIcon
        name="description"
        class="text-secondary group-hover:text-primary transition-colors"
      />
      <UiIcon
        name="more_horiz"
        size="sm"
        class="text-secondary opacity-0 group-hover:opacity-100 transition-opacity"
      />
    </div>

    <!-- Content -->
    <div>
      <h3 class="font-display text-on-surface text-lg font-semibold leading-tight">
        {{ note.title }}
      </h3>
      <p class="text-xs text-secondary mt-1">
        {{ new Date(note.updatedAt).toLocaleDateString() }}
      </p>
    </div>

    <!-- Preview -->
    <p class="text-sm text-secondary line-clamp-2">
      {{ note.content.slice(0, 120) }}
    </p>

    <!-- Footer -->
    <div class="flex items-center justify-between mt-auto pt-2">
      <div class="flex gap-1">
        <span
          v-for="tag in note.tags.slice(0, 2)"
          :key="tag"
          class="px-2 py-0.5 rounded bg-white/40 border border-white/50 text-[10px] uppercase font-bold text-secondary"
        >
          {{ tag }}
        </span>
      </div>
      <button
        class="transition-colors"
        :class="note.isFavorite ? 'text-primary' : 'text-secondary/30 group-hover:text-primary/40'"
        @click.stop="$emit('toggleFavorite')"
      >
        <UiIcon name="star" size="sm" :filled="note.isFavorite" />
      </button>
    </div>
  </div>
</template>
