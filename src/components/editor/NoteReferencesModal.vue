<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiIcon from '@/components/ui/UiIcon.vue'
import UiIconButton from '@/components/ui/UiIconButton.vue'
import { isConfigured, chat } from '@/services/ai'

interface Props {
  open: boolean
  sources: string[]
  aiInstructions: string
  description?: string
  noteTitle?: string
  noteContent?: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  save: [payload: { description: string; sources: string[]; aiInstructions: string }]
  cancel: []
}>()

const localSources = ref<string[]>([])
const localInstructions = ref('')
const localDescription = ref('')
const newSourceUrl = ref('')
const urlInputRef = ref<HTMLInputElement | null>(null)
const urlError = ref<string | null>(null)
const aiError = ref<string | null>(null)
const isGeneratingDescription = ref(false)

// Session undo/redo history for description
const descriptionHistory = ref<string[]>([])
const historyIndex = ref<number>(-1)

const canUndo = computed(() => historyIndex.value > 0)
const canRedo = computed(() => historyIndex.value < descriptionHistory.value.length - 1)
const isAiAvailable = computed(() => isConfigured())

function pushHistory(value: string) {
  if (historyIndex.value >= 0 && descriptionHistory.value[historyIndex.value] === value) {
    return
  }
  descriptionHistory.value = descriptionHistory.value.slice(0, historyIndex.value + 1)
  descriptionHistory.value.push(value)
  historyIndex.value = descriptionHistory.value.length - 1
}

function handleDescriptionInput(event: Event) {
  const value = (event.target as HTMLTextAreaElement).value
  localDescription.value = value
  pushHistory(value)
}

function undo() {
  if (!canUndo.value) return
  historyIndex.value--
  localDescription.value = descriptionHistory.value[historyIndex.value] ?? ''
}

function redo() {
  if (!canRedo.value) return
  historyIndex.value++
  localDescription.value = descriptionHistory.value[historyIndex.value] ?? ''
}

function handleDescriptionKeydown(event: KeyboardEvent) {
  if ((event.metaKey || event.ctrlKey) && !event.shiftKey && event.key.toLowerCase() === 'z') {
    event.preventDefault()
    undo()
  } else if (
    ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === 'z') ||
    ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'y')
  ) {
    event.preventDefault()
    redo()
  }
}

async function generateDescriptionWithAI() {
  if (!isAiAvailable.value || isGeneratingDescription.value) return
  isGeneratingDescription.value = true
  aiError.value = null

  try {
    const rawContent = props.noteContent || ''
    const cleanContent = rawContent
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    const response = await chat([
      {
        role: 'system',
        content:
          'Eres un asistente editorial. Tu tarea es generar una descripción breve, concisa y atractiva (máximo 140 caracteres, 1 o 2 oraciones) que resuma la nota para mostrarse en tarjetas de vista previa. Responde ÚNICAMENTE con el texto de la descripción, en español neutro, sin introducciones, sin comillas y sin markdown.',
      },
      {
        role: 'user',
        content:
          `Título: ${props.noteTitle || 'Sin título'}\n\nContenido:\n${cleanContent || 'Nota vacía'}`.slice(
            0,
            4000,
          ),
      },
    ])

    let cleanDesc = response.content.trim()
    cleanDesc = cleanDesc.replace(/^["'«“](.*)["'»”]$/s, '$1').trim()

    if (cleanDesc) {
      localDescription.value = cleanDesc
      pushHistory(cleanDesc)
    }
  } catch (err: unknown) {
    aiError.value = err instanceof Error ? err.message : 'Error al generar descripción con IA.'
  } finally {
    isGeneratingDescription.value = false
  }
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      localSources.value = [...props.sources]
      localInstructions.value = props.aiInstructions || ''
      localDescription.value = props.description || ''
      descriptionHistory.value = [props.description || '']
      historyIndex.value = 0
      newSourceUrl.value = ''
      urlError.value = null
      aiError.value = null
      nextTick(() => {
        urlInputRef.value?.focus()
      })
    }
  },
  { immediate: true },
)

function addSource() {
  const trimmed = newSourceUrl.value.trim()
  if (!trimmed) return

  let formatted = trimmed
  if (!/^https?:\/\//i.test(formatted) && !formatted.startsWith('/')) {
    formatted = `https://${formatted}`
  }

  if (localSources.value.includes(formatted)) {
    urlError.value = 'Esta fuente ya está en la lista.'
    return
  }

  localSources.value.push(formatted)
  newSourceUrl.value = ''
  urlError.value = null
}

function removeSource(index: number) {
  localSources.value.splice(index, 1)
}

function handleSave() {
  emit('save', {
    description: localDescription.value.trim(),
    sources: [...localSources.value],
    aiInstructions: localInstructions.value.trim(),
  })
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    emit('cancel')
  } else if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
    event.preventDefault()
    handleSave()
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="open"
        class="fixed inset-0 z-[100] flex items-center justify-center p-4"
        @keydown="handleKeydown"
      >
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="emit('cancel')" />

        <!-- Modal Dialog (darkened surface card) -->
        <div
          class="relative z-10 w-full max-w-xl rounded-2xl p-6 md:p-7 flex flex-col gap-6 animate-fade-up shadow-2xl border border-outline/25 dark:border-white/10 bg-[#f4f6f5]/95 dark:bg-[#131715]/98 backdrop-blur-2xl max-h-[90vh] overflow-y-auto text-on-surface"
        >
          <!-- Header -->
          <div class="flex items-start justify-between gap-4">
            <div class="flex items-center gap-3">
              <div
                class="p-2.5 rounded-xl bg-primary/10 text-primary flex items-center justify-center"
              >
                <UiIcon name="menu_book" size="md" />
              </div>
              <div>
                <h2 class="font-display text-lg font-bold text-on-surface leading-snug">
                  Metadatos e Instrucciones de IA
                </h2>
                <p class="text-xs text-secondary/80 mt-0.5">
                  Descripción, fuentes de consulta y personalización del asistente para este
                  documento.
                </p>
              </div>
            </div>
            <UiIconButton icon="close" ariaLabel="Cerrar modal" size="sm" @click="emit('cancel')" />
          </div>

          <!-- Section 1: Descripción Breve -->
          <div class="flex flex-col gap-2.5">
            <div class="flex items-center justify-between gap-2">
              <label
                class="text-xs font-semibold uppercase tracking-wider text-on-surface/90 flex items-center gap-1.5"
              >
                <UiIcon name="short_text" size="sm" class="text-primary text-[16px]" />
                Descripción breve
              </label>

              <!-- Actions: Undo, Redo, AI Generate -->
              <div class="flex items-center gap-1.5">
                <button
                  type="button"
                  :disabled="!canUndo"
                  class="p-1 rounded-lg text-secondary hover:text-on-surface hover:bg-surface-variant/40 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  title="Deshacer (Ctrl+Z)"
                  aria-label="Deshacer"
                  @click="undo"
                >
                  <UiIcon name="undo" size="sm" class="text-[15px]" />
                </button>
                <button
                  type="button"
                  :disabled="!canRedo"
                  class="p-1 rounded-lg text-secondary hover:text-on-surface hover:bg-surface-variant/40 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  title="Rehacer (Ctrl+Y)"
                  aria-label="Rehacer"
                  @click="redo"
                >
                  <UiIcon name="redo" size="sm" class="text-[15px]" />
                </button>

                <UiButton
                  v-if="isAiAvailable"
                  variant="outline"
                  size="sm"
                  :disabled="isGeneratingDescription"
                  class="h-7 text-xs px-2.5 py-0 rounded-lg gap-1 border-primary/30 text-primary hover:bg-primary/10"
                  @click="generateDescriptionWithAI"
                >
                  <template #icon-left>
                    <UiIcon
                      :name="isGeneratingDescription ? 'sync' : 'auto_awesome'"
                      size="sm"
                      :class="['text-[14px]', isGeneratingDescription && 'animate-spin']"
                    />
                  </template>
                  {{ isGeneratingDescription ? 'Generando...' : 'Generar con IA' }}
                </UiButton>
              </div>
            </div>

            <p class="text-[11px] text-secondary leading-relaxed">
              Resumen conciso para las tarjetas del explorador y la página de inicio.
            </p>

            <textarea
              v-model="localDescription"
              rows="2"
              placeholder="Ej: Reflexión personal sobre la curiosidad y la búsqueda constante de aprendizaje..."
              class="glass-input w-full px-3.5 py-2.5 rounded-xl text-xs text-on-surface placeholder:text-secondary/50 focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none leading-relaxed"
              @input="handleDescriptionInput"
              @keydown="handleDescriptionKeydown"
            />

            <p v-if="aiError" class="text-[11px] text-red-500 font-medium">
              {{ aiError }}
            </p>
          </div>

          <!-- Section 2: Fuentes y Referencias -->
          <div class="flex flex-col gap-3">
            <div class="flex items-center justify-between">
              <label
                class="text-xs font-semibold uppercase tracking-wider text-on-surface/90 flex items-center gap-1.5"
              >
                <UiIcon name="link" size="sm" class="text-primary text-[16px]" />
                Fuentes y Referencias
              </label>
              <span class="text-[11px] text-secondary">
                {{ localSources.length }}
                {{ localSources.length === 1 ? 'referencia' : 'referencias' }}
              </span>
            </div>

            <!-- Add URL Input -->
            <div class="flex gap-2">
              <div class="relative flex-1">
                <input
                  ref="urlInputRef"
                  v-model="newSourceUrl"
                  type="url"
                  placeholder="https://ejemplo.com/articulo-fuente"
                  class="glass-input w-full px-3.5 py-2.5 rounded-xl text-xs text-on-surface placeholder:text-secondary/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
                  @keydown.enter.prevent="addSource"
                  @input="urlError = null"
                />
              </div>
              <UiButton
                variant="outline"
                size="sm"
                :disabled="!newSourceUrl.trim()"
                @click="addSource"
              >
                <template #icon-left>
                  <UiIcon name="add" size="sm" />
                </template>
                Agregar
              </UiButton>
            </div>
            <p v-if="urlError" class="text-[11px] text-red-500 font-medium">
              {{ urlError }}
            </p>

            <!-- Sources List -->
            <div class="flex flex-col gap-1.5 max-h-36 overflow-y-auto pr-1">
              <div
                v-for="(source, index) in localSources"
                :key="index"
                class="group flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-surface-variant/30 hover:bg-surface-variant/50 border border-outline/10 transition-colors text-xs"
              >
                <a
                  :href="source"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="truncate text-primary hover:underline flex items-center gap-1.5 flex-1 select-text"
                >
                  <UiIcon name="open_in_new" size="sm" class="text-[14px] shrink-0 opacity-70" />
                  <span class="truncate">{{ source }}</span>
                </a>
                <button
                  type="button"
                  class="p-1 rounded-lg text-secondary/60 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                  aria-label="Eliminar fuente"
                  @click="removeSource(index)"
                >
                  <UiIcon name="delete" size="sm" class="text-[16px]" />
                </button>
              </div>

              <!-- Empty State -->
              <div
                v-if="localSources.length === 0"
                class="py-2.5 px-3 rounded-xl border border-dashed border-outline/20 text-center text-xs text-secondary/60 bg-surface/20"
              >
                No hay fuentes o referencias agregadas a esta nota.
              </div>
            </div>
          </div>

          <!-- Section 3: Document AI Instructions -->
          <div class="flex flex-col gap-2.5">
            <div class="flex items-center justify-between">
              <label
                class="text-xs font-semibold uppercase tracking-wider text-on-surface/90 flex items-center gap-1.5"
              >
                <UiIcon name="psychology" size="sm" class="text-primary text-[16px]" />
                Instrucciones específicas de IA
              </label>
              <span
                class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary"
              >
                Prioridad alta
              </span>
            </div>

            <p class="text-[11px] text-secondary leading-relaxed">
              Define el criterio editorial o de investigación para este documento. Estas
              instrucciones tienen <strong class="text-on-surface">prioridad absoluta</strong> sobre
              la configuración general.
            </p>

            <textarea
              v-model="localInstructions"
              rows="3"
              placeholder="Ej: Eres un editor de investigación periodística. Verifica rigurosamente las afirmaciones, contrasta datos con las fuentes listadas y señala cualquier discrepancia de fechas o nombres..."
              class="glass-input w-full px-3.5 py-2.5 rounded-xl text-xs text-on-surface placeholder:text-secondary/50 focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none leading-relaxed"
            />
          </div>

          <!-- Actions -->
          <div class="flex items-center justify-end gap-3 pt-2 border-t border-outline/10">
            <UiButton variant="ghost" size="sm" @click="emit('cancel')"> Cancelar </UiButton>
            <UiButton variant="solid" size="sm" @click="handleSave">
              <template #icon-left>
                <UiIcon name="check" size="sm" />
              </template>
              Guardar cambios
            </UiButton>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
