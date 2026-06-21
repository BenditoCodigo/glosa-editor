import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { Folder } from '@/types'
import * as storage from '@/services/storage'
import { useNotesStore } from './notes'

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
    const saved = await storage.saveFolder(folder)
    folders.value.push(saved)
    return saved
  }

  async function toggleFavorite(id: string) {
    const folder = folders.value.find((f) => f.id === id)
    if (!folder) return
    // Deep-clone to strip reactive proxies
    const plain = JSON.parse(JSON.stringify(folder)) as Folder
    plain.isFavorite = !plain.isFavorite
    plain.updatedAt = new Date().toISOString()
    const saved = await storage.saveFolder(plain)
    const index = folders.value.findIndex((f) => f.id === id)
    if (index !== -1) folders.value[index] = saved
  }

  async function removeFolder(id: string) {
    await storage.deleteFolder(id)
    folders.value = folders.value.filter((f) => f.id !== id)
  }

  async function renameFolder(id: string, newName: string) {
    const folder = folders.value.find((f) => f.id === id)
    if (!folder) return
    const plain = JSON.parse(JSON.stringify(folder)) as Folder
    plain.name = newName
    plain.updatedAt = new Date().toISOString()
    const saved = await storage.saveFolder(plain)
    // The id may have changed (filesystem adapter renames the directory)
    const index = folders.value.findIndex((f) => f.id === id)
    if (index !== -1) folders.value[index] = saved

    // If the folder id changed, update note references in the notes store
    if (saved.id !== id) {
      const notesStore = useNotesStore()
      notesStore.updateFolderReferences(id, saved.id)

      // Also update child folder parentFolder references
      for (const f of folders.value) {
        if (f.parentFolder === id) {
          f.parentFolder = saved.id
        }
      }
    }
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
    renameFolder,
    removeFolder,
  }
})
