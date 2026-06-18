<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useUiStore } from '@/stores/ui'
import { useNotesStore } from '@/stores/notes'
import { useFoldersStore } from '@/stores/folders'
import { seedIfEmpty } from '@/services/storage'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import AppToolbar from '@/components/layout/AppToolbar.vue'
import AppBreadcrumbs from '@/components/layout/AppBreadcrumbs.vue'

const route = useRoute()
const router = useRouter()

// Initialize stores
useUiStore()
const notesStore = useNotesStore()
const foldersStore = useFoldersStore()
const { activeNote } = storeToRefs(notesStore)

// Seed DB and load data on app start
onMounted(async () => {
  await seedIfEmpty()
  await Promise.all([notesStore.loadAll(), foldersStore.loadAll()])
})

// Dynamic breadcrumbs based on route
const breadcrumbs = computed(() => {
  if (route.name === 'home') {
    return [{ label: 'Home' }]
  }

  const segments: { label: string; path?: string }[] = [
    { label: 'Home', path: '/' },
  ]

  if (route.name === 'explorer-root') {
    segments.push({ label: 'Notes' })
  } else if (route.name === 'explorer-folder') {
    segments.push({ label: 'Notes', path: '/notes' })
    const folderId = route.params.path as string
    const path = foldersStore.getFolderPath(folderId)
    for (const folder of path) {
      segments.push({ label: folder.name, path: `/folder/${folder.id}` })
    }
  } else if (route.name === 'favorites') {
    segments.push({ label: 'Favorites' })
  } else if (route.name === 'tag-view') {
    const tag = route.params.tag as string
    segments.push({ label: `#${tag}` })
  } else if (route.name === 'editor' && activeNote.value) {
    if (activeNote.value.folder) {
      segments.push({ label: 'Notes', path: '/notes' })
      const path = foldersStore.getFolderPath(activeNote.value.folder)
      for (const folder of path) {
        segments.push({ label: folder.name, path: `/folder/${folder.id}` })
      }
    } else {
      segments.push({ label: 'Notes', path: '/notes' })
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
      <AppToolbar />

      <!-- Content area -->
      <div class="flex-1 overflow-y-auto">
        <RouterView />
      </div>

      <!-- Breadcrumbs -->
      <AppBreadcrumbs
        :segments="breadcrumbs"
        @navigate="handleBreadcrumbNavigate"
      />
    </main>
  </div>
</template>
