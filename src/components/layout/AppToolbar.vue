<script setup lang="ts">
import { useUiStore } from '@/stores/ui'
import { useSettingsStore } from '@/stores/settings'
import UiIcon from '@/components/ui/UiIcon.vue'
import UiIconButton from '@/components/ui/UiIconButton.vue'

const uiStore = useUiStore()
const settingsStore = useSettingsStore()
</script>

<template>
  <header class="
    sticky top-0 z-10
    flex items-center justify-between
    pt-2 lg:pt-4 pb-4 lg:pb-6 lg px-4 lg:px-6
    pointer-events-none
    bg-transparent
  ">
    <!-- Left group (glass pill) -->
    <div class="glass-panel-md flex items-center gap-1 px-2 py-1.5 rounded-full pointer-events-auto">
      <UiIconButton
        icon="menu"
        ariaLabel="Toggle sidebar"
        tooltip="Menú"
        size="sm"
        @click="uiStore.toggleSidebar()"
      />
      <UiIconButton
        icon="home"
        ariaLabel="Home"
        tooltip="Inicio"
        size="sm"
        @click="$router.push('/')"
      />
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

      <UiIconButton icon="more_vert" ariaLabel="More options" size="sm" />

      <!-- User avatar -->
      <button
        class="w-8 h-8 rounded-full bg-primary-container text-on-primary-container text-xs font-bold flex items-center justify-center ml-1 hover:opacity-80 transition-opacity overflow-hidden"
        title="Configuración"
        @click="$router.push({ name: 'settings' })"
      >
        <img
          v-if="settingsStore.profile.avatarUrl"
          :src="settingsStore.profile.avatarUrl"
          alt="Avatar"
          class="w-full h-full object-cover"
        >
        <span v-else>{{ settingsStore.userInitial }}</span>
      </button>
    </div>
  </header>
</template>
