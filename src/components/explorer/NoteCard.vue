<script setup lang="ts">
import { computed } from 'vue'
import UiIcon from '@/components/ui/UiIcon.vue'
import type { Note } from '@/types'

interface Props {
  note: Note
}

const { note } = defineProps<Props>()

defineEmits<{
  dblclick: []
  toggleFavorite: []
}>()

const contentPreview = computed(() => {
  const div = document.createElement('div')
  div.innerHTML = note.content
  const text = div.textContent || div.innerText || ''
  return text.slice(0, 120).trim()
})

const relativeDate = computed(() => {
  const now = Date.now()
  const updated = new Date(note.updatedAt).getTime()
  const diffMs = now - updated
  const diffMin = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMin < 1) return 'Ahora'
  if (diffMin < 60) return `${diffMin}m`
  if (diffHours < 24) return `${diffHours}h`
  if (diffDays < 7) return `${diffDays}d`
  return new Date(note.updatedAt).toLocaleDateString()
})
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
      <span v-if="note.emoji" class="text-2xl leading-none">{{ note.emoji }}</span>
      <UiIcon
        v-else
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
      <p class="text-[11px] text-secondary/60 mt-1">
        {{ relativeDate }}
      </p>
    </div>

    <!-- Preview -->
    <p class="text-sm text-secondary line-clamp-2">
      {{ contentPreview }}
    </p>

    <!-- Footer -->
    <div class="flex items-center justify-between mt-auto pt-2">
      <div class="flex gap-1">
        <router-link
          v-for="tag in note.tags.slice(0, 2)"
          :key="tag"
          :to="{ name: 'tag-view', params: { tag } }"
          class="px-2 py-0.5 rounded bg-white/40 border border-white/50 text-[10px] uppercase font-bold text-secondary hover:bg-primary-fixed/50 hover:text-on-primary-fixed transition-colors"
          @click.stop
        >
          {{ tag }}
        </router-link>
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
