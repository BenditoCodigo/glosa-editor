<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiIcon from '@/components/ui/UiIcon.vue'
import UiIconButton from '@/components/ui/UiIconButton.vue'

interface Props {
  open: boolean
  sources: string[]
  aiInstructions: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  save: [payload: { sources: string[]; aiInstructions: string }]
  cancel: []
}>()

const localSources = ref<string[]>([])
const localInstructions = ref('')
const newSourceUrl = ref('')
const urlInputRef = ref<HTMLInputElement | null>(null)
const urlError = ref<string | null>(null)

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      localSources.value = [...props.sources]
      localInstructions.value = props.aiInstructions || ''
      newSourceUrl.value = ''
      urlError.value = null
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

  // Basic normalization: if user typed something like 'elpais.com', make sure it has protocol or is preserved
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
        <div
          class="absolute inset-0 bg-black/40 backdrop-blur-sm"
          @click="emit('cancel')"
        />

        <!-- Modal Dialog -->
        <div
          class="
            glass-panel-md
            relative z-10
            w-full max-w-lg
            rounded-2xl p-6 md:p-7
            flex flex-col gap-6
            animate-fade-up
            shadow-2xl border border-outline/20
            max-h-[90vh] overflow-y-auto
          "
        >
          <!-- Header -->
          <div class="flex items-start justify-between gap-4">
            <div class="flex items-center gap-3">
              <div class="p-2.5 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <UiIcon name="menu_book" size="md" />
              </div>
              <div>
                <h2 class="font-display text-lg font-bold text-on-surface leading-snug">
                  Fuentes e Instrucciones de IA
                </h2>
                <p class="text-xs text-secondary/80 mt-0.5">
                  Anexos, fuentes de consulta y personalización del asistente para este documento.
                </p>
              </div>
            </div>
            <UiIconButton
              icon="close"
              ariaLabel="Cerrar modal"
              size="sm"
              @click="emit('cancel')"
            />
          </div>

          <!-- Section 1: Fuentes y Referencias -->
          <div class="flex flex-col gap-3">
            <div class="flex items-center justify-between">
              <label class="text-xs font-semibold uppercase tracking-wider text-on-surface/90 flex items-center gap-1.5">
                <UiIcon name="link" size="sm" class="text-primary text-[16px]" />
                Fuentes y Referencias
              </label>
              <span class="text-[11px] text-secondary">
                {{ localSources.length }} {{ localSources.length === 1 ? 'referencia' : 'referencias' }}
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
                  class="
                    glass-input
                    w-full px-3.5 py-2.5
                    rounded-xl
                    text-xs text-on-surface
                    placeholder:text-secondary/50
                    focus:outline-none focus:ring-1 focus:ring-primary/50
                  "
                  @keydown.enter.prevent="addSource"
                  @input="urlError = null"
                >
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
            <div class="flex flex-col gap-1.5 max-h-40 overflow-y-auto pr-1">
              <div
                v-for="(source, index) in localSources"
                :key="index"
                class="
                  group flex items-center justify-between gap-2
                  px-3 py-2 rounded-xl
                  bg-surface-variant/30 hover:bg-surface-variant/50
                  border border-outline/10
                  transition-colors text-xs
                "
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
                class="py-3 px-3 rounded-xl border border-dashed border-outline/20 text-center text-xs text-secondary/60 bg-surface/20"
              >
                No hay fuentes o referencias agregadas a esta nota.
              </div>
            </div>
          </div>

          <!-- Section 2: Document AI Instructions -->
          <div class="flex flex-col gap-2.5">
            <div class="flex items-center justify-between">
              <label class="text-xs font-semibold uppercase tracking-wider text-on-surface/90 flex items-center gap-1.5">
                <UiIcon name="psychology" size="sm" class="text-primary text-[16px]" />
                Instrucciones específicas de IA
              </label>
              <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary">
                Prioridad alta
              </span>
            </div>

            <p class="text-[11px] text-secondary leading-relaxed">
              Define el criterio editorial o de investigación para este documento. Estas instrucciones tienen <strong class="text-on-surface">prioridad absoluta</strong> sobre la configuración general.
            </p>

            <textarea
              v-model="localInstructions"
              rows="4"
              placeholder="Ej: Eres un editor de investigación periodística. Verifica rigurosamente las afirmaciones, contrasta datos con las fuentes listadas y señala cualquier discrepancia de fechas o nombres..."
              class="
                glass-input
                w-full px-3.5 py-2.5
                rounded-xl
                text-xs text-on-surface
                placeholder:text-secondary/50
                focus:outline-none focus:ring-1 focus:ring-primary/50
                resize-none
                leading-relaxed
              "
            />
          </div>

          <!-- Actions -->
          <div class="flex items-center justify-end gap-3 pt-2 border-t border-outline/10">
            <UiButton variant="ghost" size="sm" @click="emit('cancel')">
              Cancelar
            </UiButton>
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
