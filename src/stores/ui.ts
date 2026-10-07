import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { WriterAnnotation } from '@/types/note'

export const useUiStore = defineStore('ui', () => {
  const sidebarOpen = ref(false)
  const annotationsDrawerOpen = ref(false)
  const orphanAnnotationIds = ref<string[]>([])
  const requestedEditAnnotation = ref<WriterAnnotation | null>(null)
  const requestedScrollAnnotationId = ref<string | null>(null)
  const requestedReanchorAnnotation = ref<WriterAnnotation | null>(null)

  function toggleSidebar() {
    sidebarOpen.value = !sidebarOpen.value
  }

  function toggleAnnotationsDrawer() {
    annotationsDrawerOpen.value = !annotationsDrawerOpen.value
  }

  return {
    sidebarOpen,
    annotationsDrawerOpen,
    orphanAnnotationIds,
    requestedEditAnnotation,
    requestedScrollAnnotationId,
    requestedReanchorAnnotation,
    toggleSidebar,
    toggleAnnotationsDrawer,
  }
})
