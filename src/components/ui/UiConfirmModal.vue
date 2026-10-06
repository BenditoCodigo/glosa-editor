<script setup lang="ts">
import UiButton from './UiButton.vue'
import UiIcon from './UiIcon.vue'

interface Props {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
}

const {
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  danger = false,
} = defineProps<Props>()

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="open" class="fixed inset-0 z-100 flex items-center justify-center p-4">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/30 backdrop-blur-sm" @click="emit('cancel')" />

        <!-- Modal -->
        <div
          class="glass-panel-md relative z-10 w-full max-w-sm rounded-2xl p-6 flex flex-col gap-5 animate-fade-up"
        >
          <!-- Header -->
          <div class="flex items-center gap-3">
            <UiIcon
              :name="danger ? 'warning' : 'info'"
              :class="danger ? 'text-error' : 'text-primary'"
            />
            <h2 class="font-display text-lg font-semibold text-on-surface">
              {{ title }}
            </h2>
          </div>

          <!-- Message -->
          <p class="text-sm text-secondary leading-relaxed">
            {{ message }}
          </p>

          <!-- Actions -->
          <div class="flex items-center justify-end gap-3">
            <UiButton variant="ghost" size="sm" @click="emit('cancel')">
              {{ cancelLabel }}
            </UiButton>
            <UiButton
              :variant="danger ? 'solid' : 'solid'"
              size="sm"
              :class="danger && 'bg-error hover:bg-error/90 text-white'"
              @click="emit('confirm')"
            >
              <template #icon-left>
                <UiIcon :name="danger ? 'delete' : 'check'" size="sm" />
              </template>
              {{ confirmLabel }}
            </UiButton>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
