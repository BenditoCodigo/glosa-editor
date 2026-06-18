<script setup lang="ts">
import { useUiStore } from '@/stores/ui'
import UiIcon from '@/components/ui/UiIcon.vue'
import UiIconButton from '@/components/ui/UiIconButton.vue'

const uiStore = useUiStore()
</script>

<template>
  <header class="
    sticky top-0 z-10
    flex items-center justify-between
    h-14 px-4 lg:px-6
    pointer-events-none
    bg-transparent
  ">
    <!-- Left group (glass pill) -->
    <div class="glass-panel-md flex items-center gap-2 px-2 py-1.5 rounded-full pointer-events-auto">
      <UiIconButton
        icon="menu"
        ariaLabel="Toggle sidebar"
        size="sm"
        @click="uiStore.toggleSidebar()"
      />
      <span class="font-display text-on-surface font-bold text-sm hidden sm:block pr-2">
        Libreta Abierta
      </span>
    </div>

    <!-- Right group (glass pill) -->
    <div class="glass-panel-md flex items-center gap-1 px-2 py-1.5 rounded-full pointer-events-auto">
      <!-- Search -->
      <div class="relative hidden md:block">
        <UiIcon name="search" size="sm" class="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" />
        <input
          type="text"
          placeholder="Buscar notas..."
          class="bg-transparent rounded-full pl-9 pr-4 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary/30 w-44 lg:w-52 transition-all placeholder:text-secondary/50"
        >
      </div>

      <UiIconButton icon="search" ariaLabel="Search" size="sm" class="md:hidden" />

      <!-- Theme toggle -->
      <UiIconButton
        :icon="uiStore.theme === 'dark' ? 'light_mode' : 'dark_mode'"
        ariaLabel="Toggle theme"
        size="sm"
        @click="uiStore.toggleTheme()"
      />

      <UiIconButton icon="more_vert" ariaLabel="More options" size="sm" />
    </div>
  </header>
</template>
