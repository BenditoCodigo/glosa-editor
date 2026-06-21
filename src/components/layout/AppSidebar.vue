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

// Last 5 favorite notes, sorted by most recently updated
const recentFavorites = computed(() =>
  [...notesStore.favorites]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 5),
)

// Favorite folders
const favoriteFolders = computed(() =>
  [...foldersStore.favorites]
    .sort((a, b) => a.name.localeCompare(b.name)),
)

// Current folder context for the folders section
const currentFolderId = computed<string | null>(() => {
  if (route.name === 'explorer-folder') {
    return (route.params.path as string) || null
  }
  if (route.name === 'editor' && notesStore.activeNote?.folder) {
    return notesStore.activeNote.folder
  }
  return null
})

// Folders to show in the sidebar (children of current context, or root)
const contextFolders = computed(() =>
  foldersStore.foldersByParent(currentFolderId.value)
    .sort((a, b) => a.name.localeCompare(b.name)),
)

function isNavActive(id: string) {
  if (id === 'home' && route.name === 'home') return true
  if (id === 'notes' && (route.name === 'explorer-root' || route.name === 'explorer-folder')) return true
  return false
}

function openFavoriteNote(noteId: string) {
  router.push({ name: 'editor', params: { id: noteId } })
}

function openFolder(folderId: string) {
  router.push({ name: 'explorer-folder', params: { path: folderId } })
}

async function handleCreateNote() {
  const note = await notesStore.createNote(currentFolderId.value)
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
            G
          </div>
          <div class="flex flex-col">
            <span class="font-display text-primary text-lg font-semibold leading-tight">Notas</span>
            <span class="text-[10px] text-secondary uppercase tracking-widest">Glosa</span>
          </div>
        </div>

        <!-- CTA -->
        <UiButton variant="solid" size="lg" class="w-full mb-6" @click="handleCreateNote">
          <template #icon-left>
            <UiIcon name="add" size="sm" />
          </template>
          Nueva nota
        </UiButton>

        <!-- Navigation -->
        <nav class="flex-1 overflow-y-auto space-y-6">
          <!-- Main nav -->
          <div class="space-y-1">
            <button
              class="
                w-full flex items-center gap-3 px-4 py-2
                rounded-xl transition-colors duration-200 text-left
              "
              :class="isNavActive('home')
                ? 'text-primary font-bold bg-white/20 dark:bg-black/10'
                : 'text-secondary hover:bg-white/10 dark:hover:bg-black/5'
              "
              @click="router.push('/')"
            >
              <UiIcon name="home" />
              <span class="text-sm">Inicio</span>
            </button>
            <button
              class="
                w-full flex items-center gap-3 px-4 py-2
                rounded-xl transition-colors duration-200 text-left
              "
              :class="isNavActive('notes')
                ? 'text-primary font-bold bg-white/20 dark:bg-black/10'
                : 'text-secondary hover:bg-white/10 dark:hover:bg-black/5'
              "
              @click="router.push('/notes')"
            >
              <UiIcon name="description" />
              <span class="text-sm">Notas</span>
            </button>
          </div>

          <!-- Favorites section -->
          <div>
            <div class="flex items-center justify-between px-4 mb-2">
              <span class="text-[10px] text-secondary/60 uppercase tracking-widest font-medium">Favoritos</span>
              <button
                class="text-secondary/40 hover:text-primary transition-colors"
                title="Ver todos"
                @click="router.push({ name: 'favorites' })"
              >
                <UiIcon name="arrow_forward" size="sm" />
              </button>
            </div>

            <div v-if="favoriteFolders.length > 0 || recentFavorites.length > 0" class="space-y-0.5">
              <button
                v-for="folder in favoriteFolders"
                :key="'f-' + folder.id"
                class="w-full flex items-center gap-3 px-4 py-1.5 text-secondary hover:bg-white/10 dark:hover:bg-black/5 rounded-xl transition-colors duration-200 text-left"
                @click="openFolder(folder.id)"
              >
                <UiIcon name="folder_special" size="sm" class="text-amber-500" />
                <span class="text-sm truncate">{{ folder.name }}</span>
              </button>
              <button
                v-for="note in recentFavorites"
                :key="'n-' + note.id"
                class="w-full flex items-center gap-3 px-4 py-1.5 text-secondary hover:bg-white/10 dark:hover:bg-black/5 rounded-xl transition-colors duration-200 text-left"
                @click="openFavoriteNote(note.id)"
              >
                <span v-if="note.emoji" class="text-sm leading-none">{{ note.emoji }}</span>
                <UiIcon v-else name="description" size="sm" />
                <span class="text-sm truncate">{{ note.title }}</span>
              </button>
            </div>
            <p v-else class="px-4 text-xs text-secondary/40 italic">
              Sin favoritos
            </p>
          </div>

          <!-- Folders section (contextual) -->
          <div>
            <div class="flex items-center px-4 mb-2">
              <span class="text-[10px] text-secondary/60 uppercase tracking-widest font-medium">Carpetas</span>
            </div>

            <div v-if="contextFolders.length > 0" class="space-y-0.5">
              <button
                v-for="folder in contextFolders"
                :key="folder.id"
                class="w-full flex items-center gap-3 px-4 py-1.5 text-secondary hover:bg-white/10 dark:hover:bg-black/5 rounded-xl transition-colors duration-200 text-left"
                @click="openFolder(folder.id)"
              >
                <UiIcon name="folder" size="sm" />
                <span class="text-sm truncate">{{ folder.name }}</span>
              </button>
            </div>
            <p v-else class="px-4 text-xs text-secondary/40 italic">
              Sin carpetas aquí
            </p>
          </div>
        </nav>

        <!-- Footer -->
        <div class="mt-auto pt-4 border-t border-white/20">
          <button
            class="w-full flex items-center gap-3 px-4 py-2 text-secondary hover:bg-white/10 dark:hover:bg-black/5 rounded-xl transition-colors duration-200 text-left"
            :class="$route.name === 'settings' && 'text-primary font-bold bg-white/20 dark:bg-black/10'"
            @click="router.push({ name: 'settings' })"
          >
            <UiIcon name="settings" />
            <span class="text-sm">Configuración</span>
          </button>
        </div>
      </div>
    </aside>
  </Transition>
</template>
