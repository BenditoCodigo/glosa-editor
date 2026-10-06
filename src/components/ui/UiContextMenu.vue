<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import UiIcon from './UiIcon.vue'

export interface ContextMenuItem {
  id: string
  label: string
  icon?: string
  danger?: boolean
  divider?: boolean
}

interface Props {
  items: ContextMenuItem[]
  x: number
  y: number
}

const { items, x, y } = defineProps<Props>()

const emit = defineEmits<{
  select: [id: string]
  close: []
}>()

const menuRef = ref<HTMLDivElement | null>(null)
const adjustedX = ref(x)
const adjustedY = ref(y)

onMounted(async () => {
  await nextTick()
  if (menuRef.value) {
    const rect = menuRef.value.getBoundingClientRect()
    const viewportW = window.innerWidth
    const viewportH = window.innerHeight

    // Prevent menu from going off-screen
    if (rect.right > viewportW) {
      adjustedX.value = viewportW - rect.width - 8
    }
    if (rect.bottom > viewportH) {
      adjustedY.value = viewportH - rect.height - 8
    }
  }

  document.addEventListener('click', handleOutsideClick, { capture: true })
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('click', handleOutsideClick, { capture: true })
  document.removeEventListener('keydown', handleKeydown)
})

function handleOutsideClick(event: MouseEvent) {
  if (menuRef.value && !menuRef.value.contains(event.target as Node)) {
    emit('close')
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    emit('close')
  }
}

function handleSelect(id: string) {
  emit('select', id)
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <div
      ref="menuRef"
      class="glass-panel-md fixed z-200 min-w-[180px] rounded-xl py-1.5 animate-fade-in shadow-lg"
      :style="{ left: `${adjustedX}px`, top: `${adjustedY}px` }"
      role="menu"
    >
      <template v-for="item in items" :key="item.id">
        <div v-if="item.divider" class="h-px mx-3 my-1.5 bg-outline-variant/30" />
        <button
          v-else
          class="flex items-center gap-3 w-full px-4 py-2.5 text-left text-sm transition-colors duration-150 hover:bg-black/5 dark:hover:bg-white/5"
          :class="item.danger ? 'text-error' : 'text-on-surface'"
          role="menuitem"
          @click="handleSelect(item.id)"
        >
          <UiIcon
            v-if="item.icon"
            :name="item.icon"
            size="sm"
            :class="item.danger ? 'text-error' : 'text-secondary'"
          />
          <span>{{ item.label }}</span>
        </button>
      </template>
    </div>
  </Teleport>
</template>
