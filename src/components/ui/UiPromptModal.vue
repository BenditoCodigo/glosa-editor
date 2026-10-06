<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import UiButton from './UiButton.vue'
import UiIcon from './UiIcon.vue'

interface Props {
  open: boolean
  title: string
  placeholder?: string
  initialValue?: string
  confirmLabel?: string
  cancelLabel?: string
}

const {
  open,
  title,
  placeholder = '',
  initialValue = '',
  confirmLabel = 'Aceptar',
  cancelLabel = 'Cancelar',
} = defineProps<Props>()

const emit = defineEmits<{
  confirm: [value: string]
  cancel: []
}>()

const inputValue = ref(initialValue)
const inputRef = ref<HTMLInputElement | null>(null)

watch(
  () => open,
  (isOpen) => {
    if (isOpen) {
      inputValue.value = initialValue
      nextTick(() => {
        inputRef.value?.focus()
        inputRef.value?.select()
      })
    }
  },
)

function handleConfirm() {
  emit('confirm', inputValue.value)
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
          class="glass-panel-md relative z-10 w-full max-w-sm rounded-2xl p-6 flex flex-col gap-5 animate-fade-up"
        >
          <!-- Header -->
          <h2 class="font-display text-lg font-semibold text-on-surface">
            {{ title }}
          </h2>

          <!-- Input -->
          <input
            ref="inputRef"
            v-model="inputValue"
            type="text"
            :placeholder="placeholder"
            class="glass-input w-full px-4 py-3 rounded-xl text-sm text-on-surface placeholder:text-secondary/50 focus:outline-none focus:ring-1 focus:ring-primary/40"
            @keydown="handleKeydown"
          />

          <!-- Actions -->
          <div class="flex items-center justify-end gap-3">
            <UiButton variant="ghost" size="sm" @click="emit('cancel')">
              {{ cancelLabel }}
            </UiButton>
            <UiButton variant="solid" size="sm" @click="handleConfirm">
              <template #icon-left>
                <UiIcon name="check" size="sm" />
              </template>
              {{ confirmLabel }}
            </UiButton>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
