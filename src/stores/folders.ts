import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { Folder } from '@/types'

export const useFoldersStore = defineStore('folders', () => {
  const folders = ref<Folder[]>([])
  const isLoading = ref(false)

  const sortedFolders = computed(() =>
    [...folders.value].sort((a, b) => a.name.localeCompare(b.name)),
  )

  const favorites = computed(() =>
    folders.value.filter((f) => f.isFavorite),
  )

  function setFolders(newFolders: Folder[]) {
    folders.value = newFolders
  }

  function setLoading(loading: boolean) {
    isLoading.value = loading
  }

  return {
    folders,
    isLoading,
    sortedFolders,
    favorites,
    setFolders,
    setLoading,
  }
})
