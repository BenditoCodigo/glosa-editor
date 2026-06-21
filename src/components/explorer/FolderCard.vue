<script setup lang="ts">
import UiIcon from '@/components/ui/UiIcon.vue'
import UiIconButton from '@/components/ui/UiIconButton.vue'
import type { Folder } from '@/types'

interface Props {
  folder: Folder
  active?: boolean
}

const { active = false } = defineProps<Props>()

const emit = defineEmits<{
  dblclick: []
  contextmenu: [event: { x: number; y: number }]
}>()

function handleContextMenu(event: MouseEvent) {
  event.preventDefault()
  emit('contextmenu', { x: event.clientX, y: event.clientY })
}

function handleMenuClick(event: MouseEvent) {
  event.stopPropagation()
  const target = event.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  emit('contextmenu', { x: rect.left, y: rect.bottom + 4 })
}
</script>

<template>
  <div
    class="
      group glass-panel-md
      relative
      p-5 rounded-2xl
      cursor-pointer
      transition-all duration-200
      hover:bg-white/50 dark:hover:bg-white/10
      will-change-transform
    "
    :class="active && 'border-l-4 border-l-primary bg-primary/5'"
    @dblclick="$emit('dblclick')"
    @contextmenu="handleContextMenu"
  >
    <div class="flex items-start justify-between mb-3">
      <UiIcon
        name="folder"
        size="lg"
        :class="active ? 'text-primary' : 'text-secondary'"
      />

      <!-- 3-dot menu button -->
      <UiIconButton
        icon="more_vert"
        size="sm"
        variant="ghost"
        ariaLabel="Opciones de carpeta"
        class="opacity-0 group-hover:opacity-100 transition-opacity -mr-2 -mt-1"
        @click="handleMenuClick"
      />
    </div>

    <div class="flex items-center gap-2">
      <UiIcon
        v-if="folder.isFavorite"
        name="star"
        size="sm"
        class="text-primary shrink-0"
      />
      <h3 class="font-display text-on-surface text-lg font-semibold leading-tight truncate">
        {{ folder.name }}
      </h3>
    </div>
    <p class="text-xs text-secondary mt-1">
      Actualizado {{ new Date(folder.updatedAt).toLocaleDateString() }}
    </p>
  </div>
</template>
