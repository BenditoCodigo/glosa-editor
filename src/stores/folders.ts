import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { Folder } from '@/types'
import * as storage from '@/services/storage'

export const useFoldersStore = defineStore('folders', () => {
  const folders = ref<Folder[]>([])
  const isLoading = ref(false)

  const sortedFolders = computed(() =>
    [...folders.value].sort((a, b) => a.name.localeCompare(b.name)),
  )

  const favorites = computed(() =>
    folders.value.filter((f) => f.isFavorite),
  )

  function foldersByParent(parentId: string | null) {
    return folders.value.filter((f) => f.parentFolder === parentId)
  }

  function getFolderPath(folderId: string | null): Folder[] {
    const path: Folder[] = []
    let currentId = folderId
    while (currentId) {
      const folder = folders.value.find((f) => f.id === currentId)
      if (!folder) break
      path.unshift(folder)
      currentId = folder.parentFolder
    }
    return path
  }

  async function loadAll() {
    isLoading.value = true
    try {
      folders.value = await storage.getAllFolders()
    } finally {
      isLoading.value = false
    }
  }

  async function createFolder(name: string, parentFolder: string | null): Promise<Folder> {
    const now = new Date().toISOString()
    const folder: Folder = {
      id: crypto.randomUUID(),
      name,
      parentFolder,
      isFavorite: false,
      createdAt: now,
      updatedAt: now,
    }
    await storage.saveFolder(folder)
    folders.value.push(folder)
    return folder
  }

  async function toggleFavorite(id: string) {
    const folder = folders.value.find((f) => f.id === id)
    if (!folder) return
    folder.isFavorite = !folder.isFavorite
    folder.updatedAt = new Date().toISOString()
    await storage.saveFolder(folder)
  }

  async function removeFolder(id: string) {
    await storage.deleteFolder(id)
    folders.value = folders.value.filter((f) => f.id !== id)
  }

  return {
    folders,
    isLoading,
    sortedFolders,
    favorites,
    foldersByParent,
    getFolderPath,
    loadAll,
    createFolder,
    toggleFavorite,
    removeFolder,
  }
})
