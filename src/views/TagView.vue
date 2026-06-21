<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useNotesStore } from '@/stores/notes'
import { useFoldersStore } from '@/stores/folders'
import NoteCard from '@/components/explorer/NoteCard.vue'
import UiIcon from '@/components/ui/UiIcon.vue'
import UiIconButton from '@/components/ui/UiIconButton.vue'
import UiContextMenu from '@/components/ui/UiContextMenu.vue'
import type { ContextMenuItem } from '@/components/ui/UiContextMenu.vue'
import type { Note } from '@/types'

const route = useRoute()
const router = useRouter()
const notesStore = useNotesStore()
const foldersStore = useFoldersStore()
const { notes } = storeToRefs(notesStore)

const currentTag = computed(() => route.params.tag as string)

// All notes that contain this tag, sorted by updatedAt descending
const taggedNotes = computed(() =>
  notes.value
    .filter((n) => n.tags.includes(currentTag.value))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
)

// Group notes by folder, building a map: folderId → { label, path, notes }
interface FolderGroup {
  folderId: string | null
  label: string
  breadcrumb: string
  notes: Note[]
}

const groupedByFolder = computed<FolderGroup[]>(() => {
  const groups = new Map<string | null, Note[]>()

  for (const note of taggedNotes.value) {
    const key = note.folder
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(note)
  }

  const result: FolderGroup[] = []

  for (const [folderId, folderNotes] of groups) {
    if (folderId === null) {
      result.push({
        folderId: null,
        label: 'Root',
        breadcrumb: 'All Notes',
        notes: folderNotes,
      })
    } else {
      const path = foldersStore.getFolderPath(folderId)
      const breadcrumb = path.map((f) => f.name).join(' / ') || 'Unknown Folder'
      const label = path.at(-1)?.name ?? 'Unknown'
      result.push({
        folderId,
        label,
        breadcrumb: `All Notes / ${breadcrumb}`,
        notes: folderNotes,
      })
    }
  }

  // Sort groups: root first, then alphabetically by label
  result.sort((a, b) => {
    if (a.folderId === null) return -1
    if (b.folderId === null) return 1
    return a.label.localeCompare(b.label)
  })

  return result
})

const totalCount = computed(() => taggedNotes.value.length)

function openNote(noteId: string) {
  router.push({ name: 'editor', params: { id: noteId } })
}

// Note context menu
const noteContextMenu = ref<{ x: number; y: number } | null>(null)
const targetNote = ref<Note | null>(null)

const noteMenuItems = computed<ContextMenuItem[]>(() => {
  if (!targetNote.value) return []
  return [
    {
      id: 'favorite',
      label: targetNote.value.isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos',
      icon: targetNote.value.isFavorite ? 'star' : 'star_outline',
    },
    { id: 'divider', label: '', divider: true },
    { id: 'delete', label: 'Eliminar', icon: 'delete', danger: true },
  ]
})

function handleNoteContextMenu(note: Note, event: { x: number; y: number }) {
  targetNote.value = note
  noteContextMenu.value = event
}

function handleNoteMenuSelect(id: string) {
  if (!targetNote.value) return
  switch (id) {
    case 'favorite':
      notesStore.toggleFavorite(targetNote.value.id)
      break
    case 'delete':
      notesStore.removeNote(targetNote.value.id)
      break
  }
  noteContextMenu.value = null
  targetNote.value = null
}

function closeNoteContextMenu() {
  noteContextMenu.value = null
  targetNote.value = null
}

function navigateToFolder(folderId: string | null) {
  if (folderId === null) {
    router.push('/')
  } else {
    router.push({ name: 'explorer-folder', params: { path: folderId } })
  }
}
</script>

<template>
  <div class="p-6 lg:p-12 animate-fade-in">
    <div class="max-w-[1200px] mx-auto">
      <!-- Header -->
      <div class="flex items-center gap-4 mb-8">
        <UiIconButton icon="arrow_back" ariaLabel="Back" size="sm" @click="router.push('/')" />
        <div class="flex items-center gap-3">
          <UiIcon name="label" class="text-primary" />
          <h1 class="font-display text-2xl font-bold text-on-surface">
            #{{ currentTag }}
          </h1>
          <span class="text-sm text-secondary">
            {{ totalCount }} {{ totalCount === 1 ? 'nota' : 'notas' }}
          </span>
        </div>
      </div>

      <!-- Empty state -->
      <div
        v-if="taggedNotes.length === 0"
        class="flex flex-col items-center justify-center py-20 text-center"
      >
        <UiIcon name="label_off" size="lg" class="text-secondary/40 mb-4" />
        <p class="text-secondary text-lg">No hay notas con esta etiqueta</p>
      </div>

      <!-- Grouped notes by folder -->
      <template v-else>
        <section
          v-for="group in groupedByFolder"
          :key="group.folderId ?? 'root'"
          class="mb-10"
        >
          <!-- Folder breadcrumb header -->
          <div class="flex items-center gap-3 mb-4">
            <button
              class="flex items-center gap-2 text-xs text-secondary hover:text-primary transition-colors"
              @click="navigateToFolder(group.folderId)"
            >
              <UiIcon name="folder" size="sm" />
              <span class="font-medium">{{ group.breadcrumb }}</span>
            </button>
            <div class="h-px flex-1 bg-white/30"></div>
            <span class="text-[11px] text-secondary/50">
              {{ group.notes.length }} {{ group.notes.length === 1 ? 'nota' : 'notas' }}
            </span>
          </div>

          <!-- Notes grid -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <NoteCard
              v-for="note in group.notes"
              :key="note.id"
              :note="note"
              @dblclick="openNote(note.id)"
              @contextmenu="handleNoteContextMenu(note, $event)"
            />
          </div>
        </section>
      </template>
    </div>
  </div>

  <!-- Note context menu -->
  <UiContextMenu
    v-if="noteContextMenu"
    :items="noteMenuItems"
    :x="noteContextMenu.x"
    :y="noteContextMenu.y"
    @select="handleNoteMenuSelect"
    @close="closeNoteContextMenu"
  />
</template>
