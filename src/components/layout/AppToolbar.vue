<script setup lang="ts">
import { computed, onMounted, onUnmounted, useTemplateRef } from 'vue'
import { useUiStore } from '@/stores/ui'
import { useSettingsStore } from '@/stores/settings'
import { useSearch } from '@/composables/useSearch'
import UiIcon from '@/components/ui/UiIcon.vue'
import UiIconButton from '@/components/ui/UiIconButton.vue'
import SearchResults from '@/components/layout/SearchResults.vue'

const uiStore = useUiStore()
const settingsStore = useSettingsStore()
const search = useSearch()

const searchInput = useTemplateRef<HTMLInputElement>('searchInput')
const searchContainer = useTemplateRef<HTMLDivElement>('searchContainer')

/** Whether the results panel should be visible */
const isPanelVisible = computed(() => search.isActive.value && search.query.value.length >= 1)

/** Flag to track if a click landed on the panel (prevents blur from closing) */
let clickedOnPanel = false
let blurTimeout: ReturnType<typeof setTimeout> | null = null

// --- Keyboard handlers on input ---

function handleKeydown(event: KeyboardEvent) {
  switch (event.key) {
    case 'Escape':
      search.deactivate()
      searchInput.value?.blur()
      break
    case 'ArrowDown':
      if (isPanelVisible.value) {
        event.preventDefault()
        search.navigateDown()
      }
      break
    case 'ArrowUp':
      if (isPanelVisible.value) {
        event.preventDefault()
        search.navigateUp()
      }
      break
    case 'Enter':
      if (isPanelVisible.value && search.highlightedIndex.value >= 0) {
        event.preventDefault()
        search.selectCurrent()
        searchInput.value?.blur()
      }
      break
  }
}

function handleFocus() {
  search.activate()
}

function handleBlur() {
  // Delay closing so click events on the panel can fire first
  blurTimeout = setTimeout(() => {
    if (!clickedOnPanel) {
      search.deactivate()
    }
    clickedOnPanel = false
  }, 150)
}

// --- Panel interaction ---

function handlePanelMousedown() {
  clickedOnPanel = true
}

function handleSelectItem(item: Parameters<typeof search.selectItem>[0]) {
  search.selectItem(item)
  searchInput.value?.blur()
}

function handleHover(index: number) {
  search.highlightedIndex.value = index
}

// --- Global listeners ---

function handleGlobalKeydown(event: KeyboardEvent) {
  if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
    event.preventDefault()
    searchInput.value?.focus()
    searchInput.value?.select()
  }
}

function handleClickOutside(event: MouseEvent) {
  if (!searchContainer.value) return
  if (!searchContainer.value.contains(event.target as Node)) {
    search.deactivate()
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleGlobalKeydown)
  document.addEventListener('mousedown', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleGlobalKeydown)
  document.removeEventListener('mousedown', handleClickOutside)
  if (blurTimeout) clearTimeout(blurTimeout)
})
</script>

<template>
  <header class="
    sticky top-0 z-10
    flex items-center justify-between
    pt-2 lg:pt-4 pb-4 lg:pb-6 px-4 lg:px-6
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
      <div ref="searchContainer" class="relative hidden md:block">
        <UiIcon name="search" size="sm" class="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" />
        <input
          ref="searchInput"
          v-model="search.query.value"
          type="text"
          placeholder="Buscar notas..."
          class="bg-transparent w-44 lg:w-52 pl-9 pr-4 py-1 text-sm rounded-full transition-all placeholder:text-secondary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
          @focus="handleFocus"
          @blur="handleBlur"
          @keydown="handleKeydown"
        >

        <!-- Search results panel -->
        <div @mousedown="handlePanelMousedown">
          <SearchResults
            :results="search.groupedResults.value"
            :highlighted-index="search.highlightedIndex.value"
            :is-visible="isPanelVisible"
            @select="handleSelectItem"
            @hover="handleHover"
          />
        </div>
      </div>

      <UiIconButton icon="search" ariaLabel="Search" size="sm" class="md:hidden" />

      <UiIconButton icon="more_vert" ariaLabel="More options" size="sm" />

      <!-- User avatar -->
      <button
        class="flex items-center justify-center w-8 h-8 ml-1 text-xs font-bold rounded-full bg-primary-container text-on-primary-container transition-opacity overflow-hidden hover:opacity-80"
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
