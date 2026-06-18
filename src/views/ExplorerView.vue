<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useNotesStore } from '@/stores/notes'
import { useFoldersStore } from '@/stores/folders'
import { trackActivity } from '@/services/activity'
import FolderCard from '@/components/explorer/FolderCard.vue'
import NoteCard from '@/components/explorer/NoteCard.vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiIcon from '@/components/ui/UiIcon.vue'

const route = useRoute()
const router = useRouter()
const notesStore = useNotesStore()
const foldersStore = useFoldersStore()
const { isLoading: notesLoading } = storeToRefs(notesStore)
const { isLoading: foldersLoading } = storeToRefs(foldersStore)

// Current folder ID from route (null = root)
const currentFolderId = computed<string | null>(() => {
  if (route.name === 'explorer-folder') {
    return (route.params.path as string) || null
  }
  return null
})

// Folders in current directory
const currentFolders = computed(() =>
  foldersStore.foldersByParent(currentFolderId.value),
)

// Notes in current directory
const currentNotes = computed(() =>
  notesStore.notesByFolder(currentFolderId.value),
)

const isLoading = computed(() => notesLoading.value || foldersLoading.value)

// Navigation
function openFolder(folderId: string) {
  trackActivity(folderId, 'folder', 'open')
  router.push({ name: 'explorer-folder', params: { path: folderId } })
}

function openNote(noteId: string) {
  router.push({ name: 'editor', params: { id: noteId } })
}

// Actions
async function handleCreateNote() {
  const note = await notesStore.createNote(currentFolderId.value)
  router.push({ name: 'editor', params: { id: note.id } })
}

async function handleCreateFolder() {
  const name = prompt('Folder name:')
  if (name?.trim()) {
    await foldersStore.createFolder(name.trim(), currentFolderId.value)
  }
}

function handleToggleFavorite(noteId: string) {
  notesStore.toggleFavorite(noteId)
}
</script>

<template>
  <div class="p-6 lg:p-12 animate-fade-in">
    <div class="max-w-[1200px] mx-auto">
      <!-- Actions bar -->
      <div class="flex items-center justify-end gap-3 mb-8">
        <UiButton variant="ghost" size="sm" @click="handleCreateFolder">
          <template #icon-left>
            <UiIcon name="create_new_folder" size="sm" />
          </template>
          New Folder
        </UiButton>
        <UiButton variant="solid" size="sm" @click="handleCreateNote">
          <template #icon-left>
            <UiIcon name="add" size="sm" />
          </template>
          New Note
        </UiButton>
      </div>

      <!-- Loading state -->
      <div v-if="isLoading" class="flex items-center justify-center py-20">
        <UiIcon name="sync" class="animate-spin text-secondary" />
      </div>

      <template v-else>
        <!-- Folders Section -->
        <section v-if="currentFolders.length > 0" class="mb-12">
          <div class="flex items-center gap-4 mb-6">
            <h2 class="text-[11px] font-semibold text-secondary uppercase tracking-widest">Folders</h2>
            <div class="h-px flex-1 bg-white/30"></div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <FolderCard
              v-for="folder in currentFolders"
              :key="folder.id"
              :folder="folder"
              @dblclick="openFolder(folder.id)"
            />
          </div>
        </section>

        <!-- Notes Section -->
        <section v-if="currentNotes.length > 0">
          <div class="flex items-center gap-4 mb-6">
            <h2 class="text-[11px] font-semibold text-secondary uppercase tracking-widest">
              {{ currentFolderId ? 'Notes' : 'Loose Notes' }}
            </h2>
            <div class="h-px flex-1 bg-white/30"></div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <NoteCard
              v-for="note in currentNotes"
              :key="note.id"
              :note="note"
              @dblclick="openNote(note.id)"
              @toggle-favorite="handleToggleFavorite(note.id)"
            />
          </div>
        </section>

        <!-- Empty state -->
        <div
          v-if="currentFolders.length === 0 && currentNotes.length === 0"
          class="flex flex-col items-center justify-center py-20 text-center"
        >
          <UiIcon name="note_add" size="lg" class="text-secondary/40 mb-4" />
          <p class="text-secondary text-lg mb-2">This space is empty</p>
          <p class="text-secondary/60 text-sm mb-6">Create a note or folder to get started</p>
          <UiButton variant="solid" @click="handleCreateNote">
            <template #icon-left>
              <UiIcon name="add" size="sm" />
            </template>
            Create your first note
          </UiButton>
        </div>
      </template>
    </div>
  </div>
</template>
