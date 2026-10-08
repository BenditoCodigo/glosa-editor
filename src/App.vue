<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useUiStore } from '@/stores/ui'
import { useSettingsStore } from '@/stores/settings'
import { useNotesStore } from '@/stores/notes'
import { useFoldersStore } from '@/stores/folders'
import { seedIfEmpty, getAdapter } from '@/services/storage'
import { isDesktop, exists } from '@/services/platform'
import { FilesystemAdapter } from '@/services/adapters/filesystem'
import DeviceGuard from '@/components/ui/DeviceGuard.vue'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import AppToolbar from '@/components/layout/AppToolbar.vue'
import AppBreadcrumbs from '@/components/layout/AppBreadcrumbs.vue'
import WriterAnnotationsDrawer from '@/components/editor/WriterAnnotationsDrawer.vue'
import type { WriterAnnotation } from '@/types/note'

const route = useRoute()
const router = useRouter()

// Initialize stores
const uiStore = useUiStore()
const settingsStore = useSettingsStore() // Applies theme on creation
const notesStore = useNotesStore()
const foldersStore = useFoldersStore()
const { activeNote } = storeToRefs(notesStore)

// Activate filesystem adapter on launch if configured, then load data
onMounted(async () => {
  await activateAdapterOnLaunch()
  await seedIfEmpty()
  await Promise.all([notesStore.loadAll(), foldersStore.loadAll()])
})

// Keep the filesystem adapter's activeNoteId in sync with the notes store
watch(activeNote, (note) => {
  const adapter = getAdapter()
  if (adapter instanceof FilesystemAdapter) {
    adapter.setActiveNoteId(note?.id ?? null)
  }
})

/**
 * On app launch, if filesystem provider is configured with a stored path:
 * - Verify the folder exists via platform service
 * - Activate the FilesystemAdapter
 * - Start the file watcher for external change detection
 * - If folder doesn't exist or init fails: fall back to IndexedDB with a warning
 */
async function activateAdapterOnLaunch() {
  if (settingsStore.storageProvider !== 'filesystem' || !settingsStore.filesystemPath) return
  if (!isDesktop()) return

  const folderPath = settingsStore.filesystemPath

  try {
    const folderExists = await exists(folderPath)

    if (!folderExists) {
      console.warn(`[Glosa] La carpeta vinculada no existe: ${folderPath}. Se utilizará IndexedDB.`)
      settingsStore.clearFilesystemPath()
      return
    }

    const { activateFilesystemAdapter, startFilesystemWatcher } =
      await import('@/services/activateFilesystemAdapter')
    const adapter = await activateFilesystemAdapter(folderPath)

    // Start watching for external changes after stores are loaded
    await startFilesystemWatcher(adapter, {
      onNoteChanged(note) {
        const idx = notesStore.notes.findIndex((n) => n.id === note.id)
        if (idx !== -1) notesStore.notes[idx] = note
      },
      onNoteRemoved(noteId, wasActive) {
        notesStore.notes = notesStore.notes.filter((n) => n.id !== noteId)
        if (wasActive) notesStore.activeNote = null
      },
      onNoteAdded(note) {
        if (!notesStore.notes.find((n) => n.id === note.id)) {
          notesStore.notes.push(note)
        }
      },
      onFolderAdded(folder) {
        if (!foldersStore.folders.find((f) => f.id === folder.id)) {
          foldersStore.folders.push(folder)
        }
      },
      onFolderRemoved(folderId) {
        foldersStore.folders = foldersStore.folders.filter(
          (f) => f.id !== folderId && !f.id.startsWith(`${folderId}/`),
        )
      },
    })
  } catch (err) {
    console.warn('[Glosa] Error al activar la carpeta vinculada. Se utilizará IndexedDB:', err)
    settingsStore.clearFilesystemPath()
  }
}

// Dynamic breadcrumbs based on route
const breadcrumbs = computed(() => {
  if (route.name === 'home') {
    return [{ label: 'Inicio' }]
  }

  const segments: { label: string; path?: string }[] = [{ label: 'Inicio', path: '/' }]

  if (route.name === 'settings') {
    segments.push({ label: 'Configuración' })
  } else if (route.name === 'explorer-root') {
    segments.push({ label: 'Notas' })
  } else if (route.name === 'explorer-folder') {
    segments.push({ label: 'Notas', path: '/notes' })
    const folderId = route.params.path as string
    const path = foldersStore.getFolderPath(folderId)
    for (const folder of path) {
      segments.push({ label: folder.name, path: `/folder/${folder.id}` })
    }
  } else if (route.name === 'favorites') {
    segments.push({ label: 'Favoritos' })
  } else if (route.name === 'tag-view') {
    const tag = route.params.tag as string
    segments.push({ label: `#${tag}` })
  } else if (route.name === 'editor' && activeNote.value) {
    if (activeNote.value.folder) {
      segments.push({ label: 'Notas', path: '/notes' })
      const path = foldersStore.getFolderPath(activeNote.value.folder)
      for (const folder of path) {
        segments.push({ label: folder.name, path: `/folder/${folder.id}` })
      }
    } else {
      segments.push({ label: 'Notas', path: '/notes' })
    }
    segments.push({ label: activeNote.value.title })
  }

  return segments
})

function handleBreadcrumbNavigate(path: string) {
  router.push(path)
}

// Close annotations drawer when leaving editor
watch(
  () => route.name,
  (name) => {
    if (name !== 'editor') {
      uiStore.annotationsDrawerOpen = false
    }
  },
)

function handleSelectAnnotation(annotation: WriterAnnotation) {
  uiStore.requestedScrollAnnotationId = annotation.id
}

function handleEditAnnotation(annotation: WriterAnnotation) {
  uiStore.requestedEditAnnotation = annotation
}

function handleDeleteAnnotation(annotation: WriterAnnotation) {
  uiStore.requestedDeleteAnnotation = annotation
}

function handleToggleResolvedAnnotation(annotation: WriterAnnotation) {
  uiStore.requestedToggleResolvedAnnotation = annotation
}

function handleReanchorAnnotation(annotation: WriterAnnotation) {
  uiStore.requestedReanchorAnnotation = annotation
}
</script>

<template>
  <DeviceGuard>
    <div class="bg-fluid-gradient flex h-dvh overflow-hidden">
      <!-- Sidebar -->
      <AppSidebar />

      <!-- Main content -->
      <main class="flex-1 flex flex-col min-w-0 relative">
        <!-- Floating toolbar (overlays content) -->
        <AppToolbar />

        <!-- Content area (scrolls under toolbar and breadcrumbs) -->
        <div class="flex-1 overflow-y-auto -mt-14">
          <div class="pt-14 pb-14">
            <RouterView />
          </div>
        </div>

        <!-- Breadcrumbs (floating at bottom) -->
        <div class="absolute bottom-0 left-0 right-0 z-10 pointer-events-none">
          <AppBreadcrumbs :segments="breadcrumbs" @navigate="handleBreadcrumbNavigate" />
        </div>
      </main>

      <!-- Right Glosas Drawer (mirrors AppSidebar as a flex item, smoothly resizing main area) -->
      <WriterAnnotationsDrawer
        v-if="route.name === 'editor'"
        :open="uiStore.annotationsDrawerOpen"
        :annotations="activeNote?.annotations || []"
        :orphanIds="uiStore.orphanAnnotationIds"
        @close="uiStore.annotationsDrawerOpen = false"
        @select="handleSelectAnnotation"
        @edit="handleEditAnnotation"
        @delete="handleDeleteAnnotation"
        @toggleResolved="handleToggleResolvedAnnotation"
        @reanchor="handleReanchorAnnotation"
      />
    </div>
  </DeviceGuard>
</template>
