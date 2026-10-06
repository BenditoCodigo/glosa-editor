<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import UiIcon from '@/components/ui/UiIcon.vue'
import type { useAIBlockAssistant } from '@/composables/useAIBlockAssistant'
import { renderMarkdown } from '@/utils/markdown'

interface Props {
  assistant: ReturnType<typeof useAIBlockAssistant>
}

const { assistant } = defineProps<Props>()

const inputRef = ref<HTMLTextAreaElement | null>(null)
const dialogRef = ref<HTMLElement | null>(null)
const copied = ref(false)
const customPrompt = ref('')

const placement = ref<'top' | 'bottom'>('top')
const coords = ref<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 620 })
const arrowLeft = ref(32)

const blockSnippet = computed(() => {
  const raw = assistant.activeBlockContent.value.trim()
  if (!raw) return ''
  return raw.length > 90 ? `${raw.slice(0, 90)}…` : raw
})

const renderedResponse = computed(() => renderMarkdown(assistant.response.value))

function updatePosition() {
  if (!assistant.isOpen.value) return

  const rect = assistant.activeBlockRect.value
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight

  const dialogWidth = Math.min(640, viewportWidth - 32)
  let targetLeft = (viewportWidth - dialogWidth) / 2

  if (rect) {
    targetLeft = Math.max(16, Math.min(rect.left + rect.width / 2 - dialogWidth / 2, viewportWidth - dialogWidth - 16))
    arrowLeft.value = Math.max(20, Math.min(rect.left + 24 - targetLeft, dialogWidth - 32))

    // Estimate or measure dialog height (roughly 220px to 380px)
    const dialogHeight = dialogRef.value ? dialogRef.value.offsetHeight : 260
    const topSpace = rect.top - 70 // 70px safe margin for top header bar

    if (topSpace >= dialogHeight + 12) {
      // Enough space above: position above the block
      placement.value = 'top'
      coords.value = {
        top: Math.max(70, rect.top - dialogHeight - 10),
        left: targetLeft,
        width: dialogWidth,
      }
    } else {
      // Not enough space above (e.g. block near top): position below the block
      placement.value = 'bottom'
      coords.value = {
        top: Math.min(viewportHeight - dialogHeight - 20, rect.bottom + 10),
        left: targetLeft,
        width: dialogWidth,
      }
    }
  } else {
    placement.value = 'top'
    coords.value = {
      top: 100,
      left: targetLeft,
      width: dialogWidth,
    }
  }
}

// Focus input and update positioning on open
watch(
  () => assistant.isOpen.value,
  async (open) => {
    if (open) {
      customPrompt.value = ''
      await nextTick()
      updatePosition()
      await nextTick()
      inputRef.value?.focus()
    }
  },
)

// Recompute position when response grows or content changes
watch(
  () => [assistant.response.value, assistant.isLoading.value, assistant.error.value],
  async () => {
    await nextTick()
    updatePosition()
  },
)

function submitPrompt() {
  const text = customPrompt.value.trim()
  if (!text) return
  customPrompt.value = ''
  if (inputRef.value) inputRef.value.style.height = 'auto'
  assistant.ask(text)
}

function handleKeyDown(event: KeyboardEvent) {
  if (event.key === 'Escape' && assistant.isOpen.value) {
    event.preventDefault()
    assistant.closeAssistant()
    return
  }

  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    submitPrompt()
  }
}

async function copyResponse() {
  if (!assistant.response.value) return
  try {
    await navigator.clipboard.writeText(assistant.response.value)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2500)
  } catch {
    // Fallback using textarea if clipboard API fails
    const el = document.createElement('textarea')
    el.value = assistant.response.value
    document.body.appendChild(el)
    el.select()
    document.execCommand('copy')
    document.body.removeChild(el)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2500)
  }
}

function autoResizeInput() {
  const el = inputRef.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${Math.min(el.scrollHeight, 120)}px`
}

function handleInput(event: Event) {
  customPrompt.value = (event.target as HTMLTextAreaElement).value
  autoResizeInput()
}

function handleScrollOrResize() {
  if (assistant.isOpen.value) {
    updatePosition()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('scroll', handleScrollOrResize, true)
  window.addEventListener('resize', handleScrollOrResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('scroll', handleScrollOrResize, true)
  window.removeEventListener('resize', handleScrollOrResize)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="ai-popover">
      <div
        v-if="assistant.isOpen.value"
        ref="dialogRef"
        class="ai-block-dialog fixed z-[9999] pointer-events-auto"
        :style="{
          top: `${coords.top}px`,
          left: `${coords.left}px`,
          width: `${coords.width}px`,
        }"
        role="dialog"
        aria-label="Asistente de IA de Bloque"
        @click.stop
      >
        <div
          class="
            relative
            bg-surface/95 dark:bg-surface-container-high/95
            backdrop-blur-2xl
            border border-outline-variant/60 dark:border-white/15
            rounded-2xl
            shadow-glass
            p-4 sm:p-5
            text-on-surface
            flex flex-col gap-3
          "
        >
          <!-- Pointer indicator: bottom arrow when placement is 'top' -->
          <div
            v-if="placement === 'top'"
            class="
              absolute -bottom-2 w-3.5 h-3.5 rotate-45
              bg-surface/95 dark:bg-surface-container-high/95
              border-r border-b border-outline-variant/60 dark:border-white/15
            "
            :style="{ left: `${arrowLeft}px` }"
          />

          <!-- Pointer indicator: top arrow when placement is 'bottom' -->
          <div
            v-if="placement === 'bottom'"
            class="
              absolute -top-2 w-3.5 h-3.5 rotate-45
              bg-surface/95 dark:bg-surface-container-high/95
              border-l border-t border-outline-variant/60 dark:border-white/15
            "
            :style="{ left: `${arrowLeft}px` }"
          />

          <!-- Header -->
          <div class="flex items-center justify-between gap-3 border-b border-outline-variant/20 pb-2.5">
            <div class="flex items-center gap-2">
              <span class="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10 text-primary">
                <UiIcon name="auto_awesome" size="sm" class="text-[18px]" />
              </span>
              <div class="flex flex-col">
                <span class="text-xs font-semibold text-on-surface tracking-wide">
                  Asistente de Bloque
                </span>
                <span v-if="blockSnippet" class="text-[11px] text-secondary/80 truncate max-w-[340px] sm:max-w-[440px] italic">
                  “{{ blockSnippet }}”
                </span>
              </div>
            </div>

            <button
              type="button"
              class="p-1 rounded-lg text-secondary/60 hover:text-on-surface hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              title="Cerrar asistente (Esc)"
              aria-label="Cerrar"
              @click="assistant.closeAssistant"
            >
              <UiIcon name="close" size="sm" />
            </button>
          </div>

          <!-- Quick actions buttons -->
          <div class="flex flex-wrap items-center gap-1.5">
            <button
              v-for="action in assistant.quickActions"
              :key="action.id"
              type="button"
              class="
                inline-flex items-center gap-1.5
                px-2.5 py-1 rounded-lg
                text-xs font-medium
                transition-all duration-150
                border cursor-pointer
              "
              :class="[
                assistant.selectedActionId.value === action.id
                  ? 'bg-primary text-on-primary border-primary shadow-sm'
                  : 'bg-black/5 dark:bg-white/5 border-outline-variant/30 text-secondary hover:text-on-surface hover:bg-black/10 dark:hover:bg-white/10',
              ]"
              :disabled="assistant.isLoading.value || assistant.isStreaming.value"
              @click="assistant.askQuickAction(action)"
            >
              <UiIcon :name="action.icon" size="sm" class="text-[14px]" />
              <span>{{ action.label }}</span>
            </button>
          </div>

          <!-- Custom prompt input -->
          <div class="relative flex items-end gap-2">
            <textarea
              ref="inputRef"
              :value="customPrompt"
              rows="1"
              placeholder="Pregunta algo sobre este bloque o pide sugerencias..."
              class="
                glass-input flex-1 px-3.5 py-2 rounded-xl text-sm
                text-on-surface placeholder:text-secondary/50
                focus:outline-none focus:ring-1 focus:ring-primary/50
                resize-none min-h-[38px] max-h-[120px]
              "
              :disabled="assistant.isLoading.value || assistant.isStreaming.value"
              @input="handleInput"
            />

            <button
              type="button"
              class="
                flex items-center justify-center
                h-[38px] px-3.5 rounded-xl
                bg-primary text-on-primary font-medium text-xs
                hover:bg-primary-hover active:scale-95
                transition-all duration-150
                disabled:opacity-40 disabled:pointer-events-none
                shadow-sm cursor-pointer
              "
              :disabled="!customPrompt.trim() || assistant.isLoading.value || assistant.isStreaming.value"
              title="Enviar consulta (Enter)"
              @click="submitPrompt"
            >
              <UiIcon name="arrow_upward" size="sm" class="text-[16px]" />
            </button>
          </div>

          <!-- Response Area -->
          <div
            v-if="assistant.isLoading.value || assistant.isStreaming.value || assistant.response.value || assistant.error.value"
            class="
              mt-1 pt-3 border-t border-outline-variant/20
              flex flex-col gap-2.5
              max-h-[300px] overflow-y-auto
              pr-1
            "
          >
            <!-- Loading state without chunks yet -->
            <div v-if="assistant.isLoading.value && !assistant.response.value" class="flex items-center gap-2.5 py-2 text-secondary text-xs">
              <UiIcon name="auto_awesome" class="animate-spin text-primary text-[18px]" />
              <span class="animate-pulse font-medium">Analizando el bloque en contexto...</span>
            </div>

            <!-- Error state -->
            <div v-if="assistant.error.value" class="flex flex-col gap-2 p-3 rounded-xl bg-error/10 border border-error/20 text-xs">
              <div class="flex items-start gap-2 text-error">
                <UiIcon name="error" size="sm" class="shrink-0 mt-0.5" />
                <span>{{ assistant.error.value }}</span>
              </div>
              <div class="flex justify-end">
                <button
                  type="button"
                  class="px-2.5 py-1 rounded-md text-xs font-medium text-error hover:bg-error/20 transition-colors cursor-pointer"
                  @click="assistant.retry"
                >
                  Reintentar
                </button>
              </div>
            </div>

            <!-- Generated Formatted Markdown Response with Top-right Copy Action -->
            <div
              v-if="assistant.response.value"
              class="
                relative group
                select-text cursor-text
                bg-black/5 dark:bg-white/5 rounded-xl p-3.5
                border border-outline-variant/20
              "
            >
              <!-- Floating quick copy button on top-right -->
              <button
                type="button"
                class="
                  absolute top-2.5 right-2.5 z-10
                  inline-flex items-center gap-1
                  px-2 py-1 rounded-md text-[11px] font-medium
                  bg-surface/90 dark:bg-surface-container/90
                  border border-outline-variant/40
                  text-secondary hover:text-on-surface hover:bg-surface
                  transition-all duration-150 cursor-pointer shadow-xs
                "
                :title="copied ? 'Copiado al portapapeles' : 'Copiar respuesta (Markdown)'"
                @click="copyResponse"
              >
                <UiIcon :name="copied ? 'check' : 'content_copy'" size="sm" class="text-[13px]" :class="copied && 'text-green-600 dark:text-green-400'" />
                <span :class="copied && 'text-green-600 dark:text-green-400 font-semibold'">{{ copied ? 'Copiado' : 'Copiar' }}</span>
              </button>

              <div
                class="ai-formatted-content text-xs sm:text-sm text-on-surface leading-relaxed pr-16"
                v-html="renderedResponse"
              />
            </div>

            <!-- Response Actions Footer -->
            <div v-if="assistant.response.value || assistant.isStreaming.value" class="flex items-center justify-between gap-2 pt-0.5">
              <div class="flex items-center gap-1.5">
                <span v-if="assistant.isStreaming.value" class="inline-flex items-center gap-1.5 text-[11px] text-primary animate-pulse font-medium">
                  <span class="w-1.5 h-1.5 rounded-full bg-primary" />
                  Generando respuesta...
                </span>
              </div>

              <div class="flex items-center gap-2">
                <!-- Stop Streaming -->
                <button
                  v-if="assistant.isStreaming.value"
                  type="button"
                  class="
                    inline-flex items-center gap-1
                    px-2.5 py-1 rounded-lg text-xs font-medium
                    text-secondary hover:text-error hover:bg-error/10
                    transition-colors cursor-pointer
                  "
                  @click="assistant.stopGeneration"
                >
                  <UiIcon name="stop" size="sm" class="text-[14px]" />
                  <span>Detener</span>
                </button>

                <!-- Copy full response -->
                <button
                  v-if="assistant.response.value && !assistant.isStreaming.value"
                  type="button"
                  class="
                    inline-flex items-center gap-1
                    px-2.5 py-1 rounded-lg text-xs font-medium
                    transition-colors cursor-pointer
                  "
                  :class="[
                    copied
                      ? 'bg-green-500/15 text-green-700 dark:text-green-300 font-semibold'
                      : 'text-secondary hover:text-on-surface hover:bg-black/5 dark:hover:bg-white/10',
                  ]"
                  @click="copyResponse"
                >
                  <UiIcon :name="copied ? 'check' : 'content_copy'" size="sm" class="text-[14px]" />
                  <span>{{ copied ? '¡Copiado!' : 'Copiar respuesta' }}</span>
                </button>

                <!-- Clear response -->
                <button
                  v-if="assistant.response.value && !assistant.isStreaming.value"
                  type="button"
                  class="
                    inline-flex items-center gap-1
                    px-2.5 py-1 rounded-lg text-xs font-medium
                    text-secondary hover:text-on-surface hover:bg-black/5 dark:hover:bg-white/10
                    transition-colors cursor-pointer
                  "
                  @click="assistant.clearResponse"
                >
                  <UiIcon name="refresh" size="sm" class="text-[14px]" />
                  <span>Nueva consulta</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.ai-popover-enter-active,
.ai-popover-leave-active {
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.ai-popover-enter-from,
.ai-popover-leave-to {
  opacity: 0;
  transform: scale(0.96) translateY(-4px);
}
</style>
