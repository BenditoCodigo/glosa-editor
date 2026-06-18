<script setup lang="ts">
import { useUiStore } from '@/stores/ui'
import UiIcon from '@/components/ui/UiIcon.vue'
import UiIconButton from '@/components/ui/UiIconButton.vue'

const uiStore = useUiStore()
</script>

<template>
  <header class="
    glass-panel
    flex items-center justify-between
    h-16 px-6 lg:px-12
    border-b border-white/20
    shrink-0 z-10
  ">
    <!-- Left -->
    <div class="flex items-center gap-4 lg:gap-8">
      <UiIconButton
        icon="menu"
        ariaLabel="Toggle sidebar"
        @click="uiStore.toggleSidebar()"
      />
      <h1 class="font-display text-on-surface font-bold text-xl hidden sm:block">
        Libreta Abierta
      </h1>
    </div>

    <!-- Right -->
    <div class="flex items-center gap-2 lg:gap-4">
      <!-- Search -->
      <div class="relative hidden md:block">
        <UiIcon name="search" size="sm" class="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" />
        <input
          type="text"
          placeholder="Search notes..."
          class="glass-input rounded-full pl-10 pr-4 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/30 w-48 lg:w-64 transition-all"
        >
      </div>

      <UiIconButton icon="search" ariaLabel="Search" class="md:hidden" />

      <!-- Theme toggle -->
      <UiIconButton
        :icon="uiStore.theme === 'dark' ? 'light_mode' : 'dark_mode'"
        ariaLabel="Toggle theme"
        @click="uiStore.toggleTheme()"
      />

      <UiIconButton icon="more_vert" ariaLabel="More options" />
    </div>
  </header>
</template>
