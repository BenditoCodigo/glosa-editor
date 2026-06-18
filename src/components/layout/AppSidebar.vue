<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useUiStore } from '@/stores/ui'
import UiIcon from '@/components/ui/UiIcon.vue'
import UiButton from '@/components/ui/UiButton.vue'

const uiStore = useUiStore()
const { sidebarOpen } = storeToRefs(uiStore)

const navItems = [
  { icon: 'description', label: 'All Notes', id: 'all' },
  { icon: 'history', label: 'Recent', id: 'recent' },
  { icon: 'star', label: 'Favorites', id: 'favorites' },
  { icon: 'folder', label: 'Folders', id: 'folders' },
  { icon: 'archive', label: 'Archive', id: 'archive' },
] as const

const footerItems = [
  { icon: 'settings', label: 'Settings', id: 'settings' },
  { icon: 'help', label: 'Help', id: 'help' },
] as const
</script>

<template>
  <Transition name="slide-left">
    <aside
      v-show="sidebarOpen"
      class="
        glass-panel
        flex flex-col
        h-full w-[260px] shrink-0
        border-r border-white/20
        z-20
      "
    >
      <div class="flex flex-col h-full p-6">
        <!-- Brand -->
        <div class="flex items-center gap-3 mb-8">
          <div class="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container font-bold text-sm">
            LA
          </div>
          <div class="flex flex-col">
            <span class="font-display text-primary text-lg font-semibold leading-tight">Notes</span>
            <span class="text-xs text-secondary uppercase tracking-widest">Libreta Abierta</span>
          </div>
        </div>

        <!-- CTA -->
        <UiButton variant="solid" size="lg" class="w-full mb-8">
          <template #icon-left>
            <UiIcon name="add" size="sm" />
          </template>
          New Note
        </UiButton>

        <!-- Navigation -->
        <nav class="flex-1 space-y-1 overflow-y-auto">
          <a
            v-for="item in navItems"
            :key="item.id"
            href="#"
            class="
              flex items-center gap-3 px-4 py-2
              rounded-xl transition-colors duration-200
            "
            :class="item.id === 'all'
              ? 'text-primary font-bold bg-white/20 dark:bg-black/10'
              : 'text-secondary hover:bg-white/10 dark:hover:bg-black/5'
            "
          >
            <UiIcon :name="item.icon" />
            <span class="text-sm">{{ item.label }}</span>
          </a>
        </nav>

        <!-- Footer -->
        <div class="mt-auto pt-4 border-t border-white/20 space-y-1">
          <a
            v-for="item in footerItems"
            :key="item.id"
            href="#"
            class="flex items-center gap-3 px-4 py-2 text-secondary hover:bg-white/10 dark:hover:bg-black/5 rounded-xl transition-colors duration-200"
          >
            <UiIcon :name="item.icon" />
            <span class="text-sm">{{ item.label }}</span>
          </a>
        </div>
      </div>
    </aside>
  </Transition>
</template>
