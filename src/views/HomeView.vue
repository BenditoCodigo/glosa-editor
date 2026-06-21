<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useNotesStore } from '@/stores/notes'
import { useFoldersStore } from '@/stores/folders'
import { useSettingsStore } from '@/stores/settings'
import { getMostActiveNote, getMostActiveFolder, getRecentlyActiveNotes } from '@/services/activity'
import UiIcon from '@/components/ui/UiIcon.vue'
import UiContextMenu from '@/components/ui/UiContextMenu.vue'
import UiPromptModal from '@/components/ui/UiPromptModal.vue'
import type { ContextMenuItem } from '@/components/ui/UiContextMenu.vue'
import NoteCard from '@/components/explorer/NoteCard.vue'
import type { Note, Folder } from '@/types'

const router = useRouter()
const notesStore = useNotesStore()
const foldersStore = useFoldersStore()
const settingsStore = useSettingsStore()
const { notes, favorites } = storeToRefs(notesStore)
const { folders } = storeToRefs(foldersStore)
const { profile } = storeToRefs(settingsStore)

const featuredNote = ref<Note | null>(null)
const featuredFolder = ref<Folder | null>(null)
const recentNotes = ref<Note[]>([])
const recentFavorites = computed(() =>
  [...favorites.value]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 5),
)

function stripHtml(html: string): string {
  const div = document.createElement('div')
  div.innerHTML = html
  return div.textContent || div.innerText || ''
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 6) return '¡Buenas Noches'
  if (hour < 12) return '¡Buenos Días'
  if (hour < 19) return '¡Buenas Tardes'
  return '¡Buenas Noches'
}

function getCurrentDateTime(): string {
  const now = new Date()
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }
  return now.toLocaleDateString('es-MX', options)
}

const greeting = computed(() => {
  const base = getGreeting()
  const name = profile.value.username.trim()
  return name ? `${base}, ${name}!` : `${base}!`
})
const currentDateTime = getCurrentDateTime()

function relativeDate(dateStr: string): string {
  const now = Date.now()
  const updated = new Date(dateStr).getTime()
  const diffMs = now - updated
  const diffMin = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMin < 1) return 'Ahora'
  if (diffMin < 60) return `${diffMin}m`
  if (diffHours < 24) return `${diffHours}h`
  if (diffDays < 7) return `${diffDays}d`
  return new Date(dateStr).toLocaleDateString()
}

function folderNoteCount(folderId: string): number {
  return notesStore.notesByFolder(folderId).length
}

onMounted(async () => {
  // Featured note
  const mostActiveNoteId = await getMostActiveNote(7)
  if (mostActiveNoteId) {
    featuredNote.value = notes.value.find((n) => n.id === mostActiveNoteId) || null
  }
  if (!featuredNote.value && notes.value.length > 0) {
    const sorted = [...notes.value].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    featuredNote.value = sorted[0] || null
  }

  // Featured folder
  const mostActiveFolderId = await getMostActiveFolder(7)
  if (mostActiveFolderId) {
    featuredFolder.value = folders.value.find((f) => f.id === mostActiveFolderId) || null
  }
  if (!featuredFolder.value && folders.value.length > 0) {
    featuredFolder.value = folders.value[0] || null
  }

  // Recent notes
  const recentIds = await getRecentlyActiveNotes(3)
  const recentFromActivity = recentIds
    .map((id) => notes.value.find((n) => n.id === id))
    .filter((n): n is Note => !!n)

  if (recentFromActivity.length >= 3) {
    recentNotes.value = recentFromActivity
  } else {
    const sorted = [...notes.value].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    recentNotes.value = sorted.slice(0, 3)
  }
})

function openNote(noteId: string) {
  router.push({ name: 'editor', params: { id: noteId } })
}

function openFolder(folderId: string) {
  router.push({ name: 'explorer-folder', params: { path: folderId } })
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
    { id: 'rename', label: 'Renombrar', icon: 'edit' },
    { id: 'divider', label: '', divider: true },
    { id: 'delete', label: 'Eliminar', icon: 'delete', danger: true },
  ]
})

const showNoteRenameModal = ref(false)

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
    case 'rename':
      showNoteRenameModal.value = true
      noteContextMenu.value = null
      return
    case 'delete':
      notesStore.removeNote(targetNote.value.id)
      break
  }
  noteContextMenu.value = null
  targetNote.value = null
}

async function confirmRenameNote(name: string) {
  showNoteRenameModal.value = false
  if (name.trim() && targetNote.value) {
    const updated = { ...targetNote.value, title: name.trim(), updatedAt: new Date().toISOString() }
    await notesStore.updateNote(updated)
  }
  targetNote.value = null
}

function closeNoteContextMenu() {
  noteContextMenu.value = null
  targetNote.value = null
}
</script>

<template>
  <div class="p-6 lg:p-12 animate-fade-in">
    <div class="max-w-[1200px] mx-auto">
      <!-- Header section -->
      <div class="mb-8">
        <h1 class="font-display text-3xl md:text-4xl font-bold text-on-surface leading-tight">
          {{ greeting }}
        </h1>
        <p class="text-secondary mt-2 text-sm capitalize">
          {{ currentDateTime }}
        </p>
      </div>

      <!-- Bento grid -->
      <div class="glass-panel p-6 md:p-8 mb-12 rounded-[2.5rem]">
        <div class="grid grid-cols-1 md:grid-cols-12 gap-6">
          <!-- Large featured note: col-span-8 -->
          <div
            class="
              glass-panel-md
              relative md:col-span-8
              h-[400px] overflow-hidden
              rounded-2xl cursor-pointer
              group
            "
            @dblclick="featuredNote && openNote(featuredNote.id)"
          >
            <!-- Cover image -->
            <img
              v-if="featuredNote?.coverImage"
              :src="featuredNote.coverImage"
              alt=""
              class="absolute inset-0 w-full h-full object-cover z-0 group-hover:scale-105 transition-transform duration-700"
            >

            <!-- Gradient overlay -->
            <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent z-10"></div>

            <!-- Content -->
            <div class="relative z-20 flex flex-col justify-end h-full p-8">
              <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-primary-fixed/50 text-on-primary-fixed text-[10px] uppercase tracking-widest font-bold w-fit mb-4">
                <UiIcon name="auto_awesome" size="sm" />
                Nota destacada
              </span>
              <h2 v-if="featuredNote" class="font-display text-2xl md:text-3xl font-bold text-white leading-tight mb-2">
                {{ featuredNote.title }}
              </h2>
              <p v-if="featuredNote" class="text-white/70 text-sm line-clamp-2">
                {{ stripHtml(featuredNote.content).slice(0, 100) }}
              </p>
            </div>
          </div>

          <!-- Right column: col-span-4, two stacked cards -->
          <div class="flex flex-col gap-6 md:col-span-4">
            <!-- Featured folder -->
            <div
              class="glass-panel-md h-[190px] rounded-2xl p-6 flex flex-col justify-between cursor-pointer"
              @dblclick="featuredFolder && openFolder(featuredFolder.id)"
            >
              <div>
                <UiIcon name="folder" class="text-primary mb-2" />
                <h3 v-if="featuredFolder" class="font-display text-lg font-bold text-on-surface leading-tight">
                  {{ featuredFolder.name }}
                </h3>
                <p v-if="featuredFolder" class="text-secondary text-xs mt-1">
                  {{ folderNoteCount(featuredFolder.id) }} elementos · Actualizado {{ relativeDate(featuredFolder.updatedAt) }}
                </p>
              </div>
              <p v-if="!featuredFolder" class="text-secondary/40 text-sm italic">Sin carpetas aún</p>
            </div>

            <!-- Weekly summary -->
            <div class="glass-panel-md h-[190px] rounded-2xl p-6 flex flex-col justify-between">
              <div>
                <UiIcon name="auto_awesome" class="text-primary mb-2" />
                <h3 class="font-display text-lg font-bold text-on-surface leading-tight">Resumen semanal</h3>
                <p class="text-secondary text-xs mt-1">Resúmenes con IA próximamente</p>
              </div>
              <button
                disabled
                class="
                  inline-flex items-center justify-center
                  h-8 px-4
                  text-xs font-medium
                  rounded-lg
                  bg-primary/20 text-primary/50
                  opacity-50 cursor-not-allowed
                "
              >
                Generar resumen
              </button>
            </div>
          </div>

          <!-- Bottom row: 3 cards -->
          <div
            v-for="note in recentNotes"
            :key="note.id"
            class="glass-panel-md md:col-span-4 p-6 rounded-2xl cursor-pointer flex flex-col gap-2 transition-all duration-200 hover:bg-white/50 dark:hover:bg-white/10"
            @dblclick="openNote(note.id)"
          >
            <div class="flex items-center gap-2">
              <UiIcon name="description" size="sm" class="text-secondary" />
              <span v-if="note.tags.length > 0" class="px-2 py-0.5 rounded bg-white/40 border border-white/50 text-[10px] uppercase font-bold text-secondary">
                {{ note.tags[0] }}
              </span>
            </div>
            <h4 class="font-display text-base font-semibold text-on-surface leading-tight">
              {{ note.title }}
            </h4>
            <p class="text-sm text-secondary line-clamp-2">
              {{ stripHtml(note.content).slice(0, 80) }}
            </p>
            <span class="text-[11px] text-secondary/60 mt-auto">
              {{ relativeDate(note.updatedAt) }}
            </span>
          </div>
        </div>
      </div>

      <!-- Recent Favorites section -->
      <section v-if="recentFavorites.length > 0">
        <div class="flex items-center gap-4 mb-6">
          <h2 class="text-[11px] font-semibold text-secondary uppercase tracking-widest">Favoritos recientes</h2>
          <div class="h-px flex-1 bg-white/30"></div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <NoteCard
            v-for="note in recentFavorites"
            :key="note.id"
            :note="note"
            @dblclick="openNote(note.id)"
            @contextmenu="handleNoteContextMenu(note, $event)"
          />
        </div>
      </section>
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

  <!-- Modal: Renombrar nota -->
  <UiPromptModal
    :open="showNoteRenameModal"
    title="Renombrar nota"
    placeholder="Nuevo título"
    :initial-value="targetNote?.title ?? ''"
    confirm-label="Renombrar"
    @confirm="confirmRenameNote"
    @cancel="showNoteRenameModal = false; targetNote = null"
  />
</template>
