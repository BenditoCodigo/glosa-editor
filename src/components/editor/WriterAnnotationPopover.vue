<script setup lang="ts">
import { computed } from 'vue'
import type { WriterAnnotation } from '@/types/note'
import UiIcon from '@/components/ui/UiIcon.vue'

interface Props {
  annotation: WriterAnnotation | null
  position: { top: number; left: number } | null
}

const { annotation, position } = defineProps<Props>()

const emit = defineEmits<{
  edit: [annotation: WriterAnnotation]
  toggleResolved: [annotation: WriterAnnotation]
  delete: [annotation: WriterAnnotation]
  close: []
}>()

const categoryLabels: Record<string, { label: string; dotClass: string; badgeClass: string }> = {
  amber: {
    label: 'Justificación',
    dotClass: 'bg-amber-500',
    badgeClass: 'bg-amber-500/10 text-amber-800 dark:text-amber-200 border-amber-500/30',
  },
  emerald: {
    label: 'Referencia / Dato',
    dotClass: 'bg-emerald-500',
    badgeClass: 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-200 border-emerald-500/30',
  },
  rose: {
    label: 'Duda / Revisar',
    dotClass: 'bg-rose-500',
    badgeClass: 'bg-rose-500/10 text-rose-800 dark:text-rose-200 border-rose-500/30',
  },
  indigo: {
    label: 'Idea / Variación',
    dotClass: 'bg-indigo-500',
    badgeClass: 'bg-indigo-500/10 text-indigo-800 dark:text-indigo-200 border-indigo-500/30',
  },
  purple: {
    label: 'Estilo / Tono',
    dotClass: 'bg-purple-500',
    badgeClass: 'bg-purple-500/10 text-purple-800 dark:text-purple-200 border-purple-500/30',
  },
}

const catInfo = computed(() => {
  const c = annotation?.color || 'amber'
  return categoryLabels[c] || categoryLabels.amber
})

const formattedDate = computed(() => {
  if (!annotation?.createdAt) return ''
  try {
    const d = new Date(annotation.createdAt)
    return d.toLocaleDateString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="annotation && position"
      class="fixed z-[90] animate-fade-up pointer-events-auto"
      :style="{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }"
    >
      <div
        class="relative z-10 w-80 max-w-[90vw] rounded-2xl p-4 shadow-xl flex flex-col gap-3 border border-outline/25 dark:border-white/10 bg-[#f4f6f5]/95 dark:bg-[#131715]/98 backdrop-blur-2xl text-on-surface"
      >
        <!-- Header: Category + Date + Close -->
        <div class="flex items-center justify-between gap-2">
          <div
            class="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border"
            :class="catInfo?.badgeClass"
          >
            <span class="w-2 h-2 rounded-full" :class="catInfo?.dotClass" />
            <span>{{ catInfo?.label }}</span>
          </div>

          <div class="flex items-center gap-1 text-secondary">
            <span class="text-[11px] opacity-70">{{ formattedDate }}</span>
            <button
              type="button"
              class="p-1 hover:text-on-surface rounded-lg transition-colors"
              @click="emit('close')"
            >
              <UiIcon name="close" size="sm" />
            </button>
          </div>
        </div>

        <!-- Target Quote Excerpt -->
        <div
          v-if="annotation.anchor?.exact"
          class="text-xs text-secondary/80 italic line-clamp-1 border-l-2 border-primary/40 pl-2 py-0.5"
        >
          "{{ annotation.anchor.exact }}"
        </div>

        <!-- Author Comment -->
        <div class="text-sm text-on-surface whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
          {{ annotation.comment }}
        </div>

        <!-- Footer Actions -->
        <div class="flex items-center justify-between pt-2 border-t border-outline/15 dark:border-white/10 text-xs">
          <button
            type="button"
            class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-colors font-medium"
            :class="[
              annotation.resolved
                ? 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-500/30'
                : 'bg-surface/50 text-secondary hover:text-on-surface hover:bg-surface',
            ]"
            @click="emit('toggleResolved', annotation)"
          >
            <UiIcon
              :name="annotation.resolved ? 'check_circle' : 'radio_button_unchecked'"
              size="sm"
            />
            <span>{{ annotation.resolved ? 'Resuelta' : 'Marcar resuelta' }}</span>
          </button>

          <div class="flex items-center gap-1">
            <button
              type="button"
              title="Editar nota"
              class="p-1.5 text-secondary hover:text-on-surface hover:bg-surface/60 rounded-lg transition-colors"
              @click="emit('edit', annotation)"
            >
              <UiIcon name="edit" size="sm" />
            </button>
            <button
              type="button"
              title="Eliminar nota"
              class="p-1.5 text-secondary hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
              @click="emit('delete', annotation)"
            >
              <UiIcon name="delete" size="sm" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
