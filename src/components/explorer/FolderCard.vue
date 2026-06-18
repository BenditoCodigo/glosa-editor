<script setup lang="ts">
import UiIcon from '@/components/ui/UiIcon.vue'
import type { Folder } from '@/types'

interface Props {
  folder: Folder
  active?: boolean
}

const { active = false } = defineProps<Props>()

defineEmits<{
  dblclick: []
}>()
</script>

<template>
  <div
    class="
      group glass-panel-md
      p-5 rounded-2xl
      cursor-pointer
      transition-all duration-200
      hover:bg-white/50 dark:hover:bg-white/10
      will-change-transform
    "
    :class="active && 'border-l-4 border-l-primary bg-primary/5'"
    @dblclick="$emit('dblclick')"
  >
    <div class="flex items-start justify-between mb-3">
      <UiIcon
        name="folder"
        size="lg"
        :class="active ? 'text-primary' : 'text-secondary'"
      />
      <span class="text-xs text-secondary opacity-0 group-hover:opacity-100 transition-opacity font-medium">
        <!-- item count placeholder -->
      </span>
    </div>
    <h3 class="font-display text-on-surface text-lg font-semibold leading-tight">
      {{ folder.name }}
    </h3>
    <p class="text-xs text-secondary mt-1">
      Actualizado {{ new Date(folder.updatedAt).toLocaleDateString() }}
    </p>
  </div>
</template>
