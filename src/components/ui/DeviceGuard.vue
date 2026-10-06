<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const isSmallScreen = ref(false)
const MIN_WIDTH = 600

function checkScreen() {
  isSmallScreen.value = window.innerWidth < MIN_WIDTH
}

onMounted(() => {
  checkScreen()
  window.addEventListener('resize', checkScreen)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkScreen)
})
</script>

<template>
  <div
    v-if="isSmallScreen"
    class="bg-fluid-gradient fixed inset-0 z-50 flex items-center justify-center p-6"
  >
    <div class="glass-panel flex flex-col items-center gap-6 max-w-sm p-8 rounded-2xl text-center">
      <!-- Icon -->
      <span class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10">
        <span class="material-symbols-outlined text-primary text-[32px]">tablet_mac</span>
      </span>

      <!-- Message -->
      <div class="flex flex-col gap-2">
        <h2 class="font-display text-xl font-semibold text-on-surface">
          Dispositivo no compatible
        </h2>
        <p class="text-sm text-on-surface-variant leading-relaxed">
          Glosa está diseñada para tablets y escritorio. Utiliza un dispositivo con pantalla de al
          menos 7 pulgadas para la mejor experiencia.
        </p>
      </div>

      <!-- Visual hint -->
      <div class="flex items-center gap-3 text-on-surface-variant/60">
        <span class="material-symbols-outlined text-[20px]">smartphone</span>
        <span class="material-symbols-outlined text-[16px]">arrow_forward</span>
        <span class="material-symbols-outlined text-[24px] text-primary">tablet_mac</span>
      </div>
    </div>
  </div>

  <slot v-else />
</template>
