import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useFoldersStore } from './folders'
import { db } from '@/services/db'
import type { Folder } from '@/types'

function makeFolder(overrides: Partial<Folder> = {}): Folder {
  return {
    id: crypto.randomUUID(),
    name: 'Test Folder',
    parentFolder: null,
    isFavorite: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

describe('Folders Store', () => {
  beforeEach(async () => {
    setActivePinia(createPinia())
    await db.notes.clear()
    await db.folders.clear()
  })

  it('starts with empty state', () => {
    const store = useFoldersStore()
    expect(store.folders).toEqual([])
    expect(store.isLoading).toBe(false)
  })

  it('loadAll loads folders from IndexedDB', async () => {
    await db.folders.put(makeFolder({ id: 'f1', name: 'Loaded' }))

    const store = useFoldersStore()
    await store.loadAll()

    expect(store.folders).toHaveLength(1)
    expect(store.folders[0]!.name).toBe('Loaded')
  })

  it('createFolder adds to store and persists', async () => {
    const store = useFoldersStore()
    const folder = await store.createFolder('New Folder', null)

    expect(folder.name).toBe('New Folder')
    expect(folder.parentFolder).toBeNull()
    expect(store.folders).toHaveLength(1)

    const fromDb = await db.folders.get(folder.id)
    expect(fromDb).toBeDefined()
    expect(fromDb!.name).toBe('New Folder')
  })

  it('createFolder with parent sets parentFolder', async () => {
    const store = useFoldersStore()
    const folder = await store.createFolder('Child', 'parent-id')

    expect(folder.parentFolder).toBe('parent-id')
  })

  it('toggleFavorite toggles and persists', async () => {
    const store = useFoldersStore()
    const folder = await store.createFolder('Fav', null)
    expect(folder.isFavorite).toBe(false)

    await store.toggleFavorite(folder.id)

    const inStore = store.folders.find((f) => f.id === folder.id)
    expect(inStore!.isFavorite).toBe(true)

    const fromDb = await db.folders.get(folder.id)
    expect(fromDb!.isFavorite).toBe(true)
  })

  it('removeFolder removes from store and DB', async () => {
    const store = useFoldersStore()
    const folder = await store.createFolder('ToDelete', null)

    await store.removeFolder(folder.id)

    expect(store.folders).toHaveLength(0)
    const fromDb = await db.folders.get(folder.id)
    expect(fromDb).toBeUndefined()
  })

  it('foldersByParent filters correctly', async () => {
    const store = useFoldersStore()
    await store.createFolder('Root 1', null)
    await store.createFolder('Root 2', null)
    await store.createFolder('Child', 'parent-id')

    const root = store.foldersByParent(null)
    expect(root).toHaveLength(2)

    const children = store.foldersByParent('parent-id')
    expect(children).toHaveLength(1)
    expect(children[0]!.name).toBe('Child')
  })

  it('getFolderPath returns path from root to folder', async () => {
    const store = useFoldersStore()
    await db.folders.put(makeFolder({ id: 'root', name: 'Root', parentFolder: null }))
    await db.folders.put(makeFolder({ id: 'child', name: 'Child', parentFolder: 'root' }))
    await db.folders.put(
      makeFolder({ id: 'grandchild', name: 'Grandchild', parentFolder: 'child' }),
    )
    await store.loadAll()

    const path = store.getFolderPath('grandchild')
    expect(path).toHaveLength(3)
    expect(path[0]!.name).toBe('Root')
    expect(path[1]!.name).toBe('Child')
    expect(path[2]!.name).toBe('Grandchild')
  })

  it('getFolderPath returns empty for null', () => {
    const store = useFoldersStore()
    const path = store.getFolderPath(null)
    expect(path).toHaveLength(0)
  })

  it('sortedFolders sorts alphabetically', async () => {
    const store = useFoldersStore()
    await db.folders.put(makeFolder({ id: '1', name: 'Zebra' }))
    await db.folders.put(makeFolder({ id: '2', name: 'Alpha' }))
    await db.folders.put(makeFolder({ id: '3', name: 'Middle' }))
    await store.loadAll()

    expect(store.sortedFolders[0]!.name).toBe('Alpha')
    expect(store.sortedFolders[1]!.name).toBe('Middle')
    expect(store.sortedFolders[2]!.name).toBe('Zebra')
  })

  it('favorites returns only favorited folders', async () => {
    const store = useFoldersStore()
    await db.folders.put(makeFolder({ id: '1', isFavorite: true }))
    await db.folders.put(makeFolder({ id: '2', isFavorite: false }))
    await store.loadAll()

    expect(store.favorites).toHaveLength(1)
    expect(store.favorites[0]!.id).toBe('1')
  })
})
