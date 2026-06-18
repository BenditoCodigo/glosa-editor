<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useUiStore } from '@/stores/ui'
import { useNotesStore } from '@/stores/notes'
import { useFoldersStore } from '@/stores/folders'
import UiIcon from '@/components/ui/UiIcon.vue'
import UiButton from '@/components/ui/UiButton.vue'

const router = useRouter()
const route = useRoute()
const uiStore = useUiStore()
const notesStore = useNotesStore()
const foldersStore = useFoldersStore()
const { sidebarOpen } = storeToRefs(uiStore)

const showAllFavorites = computed(() => false) // toggle state for "see more"

const allFavorites = computed(() => [
  ...foldersStore.favorites.map((f) => ({ type: 'folder' as const, id: f.id, name: f.name })),
  ...notesStore.favorites.map((n) => ({ type: 'note' as const, id: n.id, name: n.title })),
])

const visibleFavorites = computed(() =>
  allFavorites.value.slice(0, showAllFavorites.value ? undefined : 5),
)

const navItems = [
  { icon: 'description', label: 'All Notes', id: 'all', route: '/' },
  { icon: 'star', label: 'Favorites', id: 'favorites', route: '/' },
  { icon: 'folder', label: 'Folders', id: 'folders', route: '/' },
] as const

function isActive(itemId: string) {
  if (itemId === 'all' && route.name === 'explorer-root') return true
  return false
}

function navigate(item: (typeof navItems)[number]) {
  router.push(item.route)
}

function openFavorite(fav: { type: 'folder' | 'note'; id: string }) {
  if (fav.type === 'folder') {
    router.push({ name: 'explorer-folder', params: { path: fav.id } })
  } else {
    router.push({ name: 'editor', params: { id: fav.id } })
  }
}

async function handleCreateNote() {
  const note = await notesStore.createNote(null)
  router.push({ name: 'editor', params: { id: note.id } })
}
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
            <span class="text-[10px] text-secondary uppercase tracking-widest">Libreta Abierta</span>
          </div>
        </div>

        <!-- CTA -->
        <UiButton variant="solid" size="lg" class="w-full mb-8" @click="handleCreateNote">
          <template #icon-left>
            <UiIcon name="add" size="sm" />
          </template>
          New Note
        </UiButton>

        <!-- Navigation -->
        <nav class="flex-1 space-y-1 overflow-y-auto">
          <button
            v-for="item in navItems"
            :key="item.id"
            class="
              w-full flex items-center gap-3 px-4 py-2
              rounded-xl transition-colors duration-200 text-left
            "
            :class="isActive(item.id)
              ? 'text-primary font-bold bg-white/20 dark:bg-black/10'
              : 'text-secondary hover:bg-white/10 dark:hover:bg-black/5'
            "
            @click="navigate(item)"
          >
            <UiIcon :name="item.icon" />
            <span class="text-sm">{{ item.label }}</span>
          </button>

          <!-- Favorites in sidebar -->
          <div v-if="visibleFavorites.length > 0" class="mt-4 pt-4 border-t border-white/10">
            <span class="text-[10px] text-secondary/60 uppercase tracking-widest px-4 mb-2 block">Favorites</span>
            <button
              v-for="fav in visibleFavorites"
              :key="fav.id"
              class="w-full flex items-center gap-3 px-4 py-1.5 text-secondary hover:bg-white/10 rounded-xl transition-colors duration-200 text-left"
              @click="openFavorite(fav)"
            >
              <UiIcon :name="fav.type === 'folder' ? 'folder' : 'description'" size="sm" />
              <span class="text-sm truncate">{{ fav.name }}</span>
            </button>
          </div>
        </nav>

        <!-- Footer -->
        <div class="mt-auto pt-4 border-t border-white/20 space-y-1">
          <button class="w-full flex items-center gap-3 px-4 py-2 text-secondary hover:bg-white/10 dark:hover:bg-black/5 rounded-xl transition-colors duration-200 text-left">
            <UiIcon name="settings" />
            <span class="text-sm">Settings</span>
          </button>
        </div>
      </div>
    </aside>
  </Transition>
</template>
