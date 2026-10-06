<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import type { WriterAnnotationColor } from '@/types/note'
import UiButton from '@/components/ui/UiButton.vue'
import UiIcon from '@/components/ui/UiIcon.vue'

interface Props {
  open: boolean
  isEditing?: boolean
  selectedText?: string
  initialComment?: string
  initialColor?: WriterAnnotationColor
}

const {
  open,
  isEditing = false,
  selectedText = '',
  initialComment = '',
  initialColor = 'amber',
} = defineProps<Props>()

const emit = defineEmits<{
  save: [payload: { comment: string; color: WriterAnnotationColor }]
  cancel: []
}>()

const comment = ref(initialComment)
const color = ref<WriterAnnotationColor>(initialColor)
const textareaRef = ref<HTMLTextAreaElement | null>(null)

const categories: Array<{
  id: WriterAnnotationColor
  label: string
  description: string
  bgClass: string
  borderClass: string
  textClass: string
  dotClass: string
}> = [
  {
    id: 'amber',
    label: 'Justificación',
    description: 'Razón de una palabra, metáfora o giro',
    bgClass: 'bg-amber-500/10',
    borderClass: 'border-amber-500/40',
    textClass: 'text-amber-800 dark:text-amber-200',
    dotClass: 'bg-amber-500',
  },
  {
    id: 'emerald',
    label: 'Referencia / Dato',
    description: 'Fuente histórica, contexto o hecho',
    bgClass: 'bg-emerald-500/10',
    borderClass: 'border-emerald-500/40',
    textClass: 'text-emerald-800 dark:text-emerald-200',
    dotClass: 'bg-emerald-500',
  },
  {
    id: 'rose',
    label: 'Duda / Revisar',
    description: 'Revisar ritmo, cacofonía o repetición',
    bgClass: 'bg-rose-500/10',
    borderClass: 'border-rose-500/40',
    textClass: 'text-rose-800 dark:text-rose-200',
    dotClass: 'bg-rose-500',
  },
  {
    id: 'indigo',
    label: 'Idea / Variación',
    description: 'Alternativas o caminos secundarios',
    bgClass: 'bg-indigo-500/10',
    borderClass: 'border-indigo-500/40',
    textClass: 'text-indigo-800 dark:text-indigo-200',
    dotClass: 'bg-indigo-500',
  },
  {
    id: 'purple',
    label: 'Estilo / Tono',
    description: 'Intención sonora o juego de palabras',
    bgClass: 'bg-purple-500/10',
    borderClass: 'border-purple-500/40',
    textClass: 'text-purple-800 dark:text-purple-200',
    dotClass: 'bg-purple-500',
  },
]

watch(
  () => open,
  (isOpen) => {
    if (isOpen) {
      comment.value = initialComment
      color.value = initialColor
      nextTick(() => {
        textareaRef.value?.focus()
        textareaRef.value?.select()
      })
    }
  },
)

function handleSave() {
  if (!comment.value.trim()) return
  emit('save', {
    comment: comment.value.trim(),
    color: color.value,
  })
}

function handleKeydown(event: KeyboardEvent) {
  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
    event.preventDefault()
    handleSave()
  } else if (event.key === 'Escape') {
    emit('cancel')
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="open" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="emit('cancel')" />

        <!-- Modal Card -->
        <div
          class="glass-panel-md relative z-10 w-full max-w-lg rounded-2xl p-6 flex flex-col gap-5 animate-fade-up shadow-2xl"
        >
          <!-- Header -->
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <div
                class="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary"
              >
                <UiIcon name="rate_review" size="sm" />
              </div>
              <h2 class="font-display text-lg font-semibold text-on-surface">
                {{ isEditing ? 'Editar Glosa de Autor' : 'Añadir Glosa al Manuscrito' }}
              </h2>
            </div>
            <button
              type="button"
              class="text-secondary hover:text-on-surface p-1 rounded-lg transition-colors"
              @click="emit('cancel')"
            >
              <UiIcon name="close" size="sm" />
            </button>
          </div>

          <!-- Quote Preview -->
          <div
            v-if="selectedText"
            class="p-3 rounded-xl bg-surface/50 border border-white/10 text-xs text-secondary italic line-clamp-2 border-l-4 border-l-primary"
          >
            "{{ selectedText }}"
          </div>

          <!-- Comment Input -->
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-medium text-secondary">
              Nota personal o justificación:
            </label>
            <textarea
              ref="textareaRef"
              v-model="comment"
              rows="4"
              placeholder="Escribe por qué elegiste este fragmento, la referencia o tu justificación..."
              class="glass-input w-full px-4 py-3 rounded-xl text-sm text-on-surface placeholder:text-secondary/50 focus:outline-none focus:ring-1 focus:ring-primary/40 resize-none"
              @keydown="handleKeydown"
            />
          </div>

          <!-- Category Selector -->
          <div class="flex flex-col gap-2">
            <label class="text-xs font-medium text-secondary">Categoría:</label>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button
                v-for="cat in categories"
                :key="cat.id"
                type="button"
                class="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all text-left border"
                :class="[
                  color === cat.id
                    ? `${cat.bgClass} ${cat.borderClass} ${cat.textClass} ring-1 ring-primary/30 shadow-sm`
                    : 'border-white/5 bg-surface/30 text-secondary hover:bg-surface/60',
                ]"
                @click="color = cat.id"
              >
                <span class="w-2.5 h-2.5 rounded-full flex-shrink-0" :class="cat.dotClass" />
                <span class="truncate">{{ cat.label }}</span>
              </button>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center justify-between pt-2 border-t border-white/5">
            <span class="text-[11px] text-secondary/60 hidden sm:inline">
              Presiona <kbd class="px-1 py-0.5 rounded bg-surface/60 font-mono text-[10px]">Cmd+Enter</kbd> para guardar
            </span>
            <div class="flex items-center gap-2 ml-auto">
              <UiButton variant="ghost" size="sm" @click="emit('cancel')">
                Cancelar
              </UiButton>
              <UiButton
                variant="solid"
                size="sm"
                :disabled="!comment.trim()"
                @click="handleSave"
              >
                <template #icon-left>
                  <UiIcon name="check" size="sm" />
                </template>
                {{ isEditing ? 'Guardar Cambios' : 'Guardar Glosa' }}
              </UiButton>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
