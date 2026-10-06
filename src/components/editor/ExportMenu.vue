<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import UiIcon from '@/components/ui/UiIcon.vue'
import UiIconButton from '@/components/ui/UiIconButton.vue'

const emit = defineEmits<{
  'export-md': []
  'copy-md': []
}>()

const isOpen = ref(false)
const menuRef = ref<HTMLDivElement | null>(null)
const triggerRef = ref<HTMLElement | null>(null)

function toggle() {
  isOpen.value = !isOpen.value
}

function handleSelect(action: 'export-md' | 'copy-md') {
  if (action === 'export-md') {
    emit('export-md')
  } else {
    emit('copy-md')
  }
  isOpen.value = false
}

function handleOutsideClick(event: MouseEvent) {
  if (
    menuRef.value &&
    !menuRef.value.contains(event.target as Node) &&
    triggerRef.value &&
    !triggerRef.value.contains(event.target as Node)
  ) {
    isOpen.value = false
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    isOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleOutsideClick, { capture: true })
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('click', handleOutsideClick, { capture: true })
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <div class="relative">
    <div ref="triggerRef">
      <UiIconButton
        icon="download"
        ariaLabel="Exportar nota"
        tooltip="Exportar"
        size="sm"
        @click="toggle"
      />
    </div>

    <Transition name="fade-scale">
      <div
        v-if="isOpen"
        ref="menuRef"
        class="glass-panel-md absolute right-0 top-full mt-2 min-w-[200px] rounded-xl py-1.5 shadow-lg z-50"
        role="menu"
      >
        <!-- MD download -->
        <button
          class="flex items-center gap-3 w-full px-4 py-2.5 text-left text-sm text-on-surface transition-colors duration-150 hover:bg-black/5 dark:hover:bg-white/5"
          role="menuitem"
          @click="handleSelect('export-md')"
        >
          <UiIcon name="description" size="sm" class="text-secondary" />
          <span>Descargar .md</span>
        </button>

        <!-- Copy as MD -->
        <button
          class="flex items-center gap-3 w-full px-4 py-2.5 text-left text-sm text-on-surface transition-colors duration-150 hover:bg-black/5 dark:hover:bg-white/5"
          role="menuitem"
          @click="handleSelect('copy-md')"
        >
          <UiIcon name="content_copy" size="sm" class="text-secondary" />
          <span>Copiar contenido (MD)</span>
        </button>

        <!-- Divider -->
        <div class="h-px mx-3 my-1.5 bg-outline-variant/30" />

        <!-- PDF (coming soon) -->
        <button
          class="flex items-center gap-3 w-full px-4 py-2.5 text-left text-sm text-on-surface/40 cursor-not-allowed"
          role="menuitem"
          disabled
        >
          <UiIcon name="picture_as_pdf" size="sm" class="text-secondary/40" />
          <div class="flex items-center gap-2">
            <span>PDF</span>
            <span class="text-[11px] uppercase tracking-widest text-secondary/50 font-medium"
              >próximamente</span
            >
          </div>
        </button>

        <!-- DOCX (coming soon) -->
        <button
          class="flex items-center gap-3 w-full px-4 py-2.5 text-left text-sm text-on-surface/40 cursor-not-allowed"
          role="menuitem"
          disabled
        >
          <UiIcon name="article" size="sm" class="text-secondary/40" />
          <div class="flex items-center gap-2">
            <span>DOCX</span>
            <span class="text-[11px] uppercase tracking-widest text-secondary/50 font-medium"
              >próximamente</span
            >
          </div>
        </button>
      </div>
    </Transition>
  </div>
</template>
