<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiIcon from '@/components/ui/UiIcon.vue'

interface Props {
  open: boolean
  initialUrl?: string
  initialText?: string
}

const { open, initialUrl = '', initialText = '' } = defineProps<Props>()

const emit = defineEmits<{
  confirm: [url: string, text: string]
  cancel: []
}>()

const url = ref(initialUrl)
const text = ref(initialText)
const urlRef = ref<HTMLInputElement | null>(null)

watch(
  () => open,
  (isOpen) => {
    if (isOpen) {
      url.value = initialUrl
      text.value = initialText
      nextTick(() => {
        urlRef.value?.focus()
      })
    }
  },
)

function handleConfirm() {
  if (url.value.trim()) {
    emit('confirm', url.value.trim(), text.value.trim())
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter') {
    event.preventDefault()
    handleConfirm()
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
        <div class="absolute inset-0 bg-black/30 backdrop-blur-sm" @click="emit('cancel')" />

        <!-- Modal -->
        <div
          class="glass-panel-md relative z-10 w-full max-w-sm rounded-2xl p-6 flex flex-col gap-4 animate-fade-up"
        >
          <h2 class="font-display text-lg font-semibold text-on-surface">Insertar enlace</h2>

          <!-- URL input -->
          <div class="flex flex-col gap-1">
            <label class="text-xs text-secondary font-medium">URL</label>
            <input
              ref="urlRef"
              v-model="url"
              type="url"
              placeholder="https://ejemplo.com"
              class="glass-input w-full px-4 py-3 rounded-xl text-sm text-on-surface placeholder:text-secondary/50 focus:outline-none focus:ring-1 focus:ring-primary/40"
              @keydown="handleKeydown"
            />
          </div>

          <!-- Text input (optional) -->
          <div class="flex flex-col gap-1">
            <label class="text-xs text-secondary font-medium">Texto (opcional)</label>
            <input
              v-model="text"
              type="text"
              placeholder="Texto del enlace"
              class="glass-input w-full px-4 py-3 rounded-xl text-sm text-on-surface placeholder:text-secondary/50 focus:outline-none focus:ring-1 focus:ring-primary/40"
              @keydown="handleKeydown"
            />
          </div>

          <!-- Actions -->
          <div class="flex items-center justify-end gap-3 pt-1">
            <UiButton variant="ghost" size="sm" @click="emit('cancel')"> Cancelar </UiButton>
            <UiButton variant="solid" size="sm" @click="handleConfirm">
              <template #icon-left>
                <UiIcon name="link" size="sm" />
              </template>
              Insertar
            </UiButton>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
