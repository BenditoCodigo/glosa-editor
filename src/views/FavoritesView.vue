<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useNotesStore } from '@/stores/notes'
import { useFoldersStore } from '@/stores/folders'
import NoteCard from '@/components/explorer/NoteCard.vue'
import FolderCard from '@/components/explorer/FolderCard.vue'
import UiIcon from '@/components/ui/UiIcon.vue'
import UiIconButton from '@/components/ui/UiIconButton.vue'

const router = useRouter()
const notesStore = useNotesStore()
const foldersStore = useFoldersStore()

const favoriteFolders = computed(() =>
  [...foldersStore.favorites].sort((a, b) => a.name.localeCompare(b.name)),
)

const favoriteNotes = computed(() =>
  [...notesStore.favorites].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
)

function openFolder(folderId: string) {
  router.push({ name: 'explorer-folder', params: { path: folderId } })
}

function openNote(noteId: string) {
  router.push({ name: 'editor', params: { id: noteId } })
}

function handleToggleFavorite(noteId: string) {
  notesStore.toggleFavorite(noteId)
}
</script>

<template>
  <div class="p-6 lg:p-12 animate-fade-in">
    <div class="max-w-[1200px] mx-auto">
      <!-- Header -->
      <div class="flex items-center gap-4 mb-8">
        <UiIconButton icon="arrow_back" ariaLabel="Back" size="sm" @click="router.push('/')" />
        <div class="flex items-center gap-3">
          <UiIcon name="star" class="text-primary" />
          <h1 class="font-display text-2xl font-bold text-on-surface">Favorites</h1>
        </div>
      </div>

      <!-- Favorite Folders -->
      <section v-if="favoriteFolders.length > 0" class="mb-12">
        <div class="flex items-center gap-4 mb-6">
          <h2 class="text-[11px] font-semibold text-secondary uppercase tracking-widest">Folders</h2>
          <div class="h-px flex-1 bg-white/30"></div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <FolderCard
            v-for="folder in favoriteFolders"
            :key="folder.id"
            :folder="folder"
            @dblclick="openFolder(folder.id)"
          />
        </div>
      </section>

      <!-- Favorite Notes -->
      <section v-if="favoriteNotes.length > 0">
        <div class="flex items-center gap-4 mb-6">
          <h2 class="text-[11px] font-semibold text-secondary uppercase tracking-widest">Notes</h2>
          <div class="h-px flex-1 bg-white/30"></div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <NoteCard
            v-for="note in favoriteNotes"
            :key="note.id"
            :note="note"
            @dblclick="openNote(note.id)"
            @toggle-favorite="handleToggleFavorite(note.id)"
          />
        </div>
      </section>

      <!-- Empty state -->
      <div
        v-if="favoriteFolders.length === 0 && favoriteNotes.length === 0"
        class="flex flex-col items-center justify-center py-20 text-center"
      >
        <UiIcon name="star" size="lg" class="text-secondary/40 mb-4" />
        <p class="text-secondary text-lg">No favorites yet</p>
        <p class="text-secondary/60 text-sm mt-1">Star notes or folders to see them here</p>
      </div>
    </div>
  </div>
</template>
