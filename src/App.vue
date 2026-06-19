<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useUiStore } from '@/stores/ui'
import { useSettingsStore } from '@/stores/settings'
import { useNotesStore } from '@/stores/notes'
import { useFoldersStore } from '@/stores/folders'
import { seedIfEmpty } from '@/services/storage'
import { isTauri } from '@/utils/tauri'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import AppToolbar from '@/components/layout/AppToolbar.vue'
import AppBreadcrumbs from '@/components/layout/AppBreadcrumbs.vue'

const route = useRoute()
const router = useRouter()

// Initialize stores
useUiStore()
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

/**
 * On app launch, if filesystem provider is configured with a stored path:
 * - Verify the folder exists via plugin-fs
 * - Activate the FilesystemAdapter
 * - If folder doesn't exist or init fails: fall back to IndexedDB with a warning
 */
async function activateAdapterOnLaunch() {
  if (settingsStore.storageProvider !== 'filesystem' || !settingsStore.filesystemPath) return
  if (!isTauri()) return

  const folderPath = settingsStore.filesystemPath

  try {
    const { exists } = await import('@tauri-apps/plugin-fs')
    const folderExists = await exists(folderPath)

    if (!folderExists) {
      console.warn(`[Glosa] La carpeta vinculada no existe: ${folderPath}. Se utilizará IndexedDB.`)
      settingsStore.clearFilesystemPath()
      return
    }

    const { activateFilesystemAdapter } = await import('@/services/activateFilesystemAdapter')
    await activateFilesystemAdapter(folderPath)
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

  const segments: { label: string; path?: string }[] = [
    { label: 'Inicio', path: '/' },
  ]

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
</script>

<template>
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
        <AppBreadcrumbs
          :segments="breadcrumbs"
          @navigate="handleBreadcrumbNavigate"
        />
      </div>
    </main>
  </div>
</template>
