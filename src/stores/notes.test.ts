import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useNotesStore } from './notes'
import { db } from '@/services/db'
import type { Note } from '@/types'

function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    id: crypto.randomUUID(),
    title: 'Test Note',
    content: 'Some content',
    folder: null,
    isFavorite: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tags: [],
    ...overrides,
  }
}

describe('Notes Store', () => {
  beforeEach(async () => {
    setActivePinia(createPinia())
    await db.notes.clear()
    await db.folders.clear()
  })

  it('starts with empty state', () => {
    const store = useNotesStore()
    expect(store.notes).toEqual([])
    expect(store.activeNote).toBeNull()
    expect(store.isLoading).toBe(false)
  })

  it('loadAll loads notes from IndexedDB', async () => {
    const note = makeNote({ id: 'n1', title: 'From DB' })
    await db.notes.put(note)

    const store = useNotesStore()
    await store.loadAll()

    expect(store.notes).toHaveLength(1)
    expect(store.notes[0]!.title).toBe('From DB')
    expect(store.isLoading).toBe(false)
  })

  it('loadNote sets activeNote', async () => {
    const note = makeNote({ id: 'n1', title: 'Active' })
    await db.notes.put(note)

    const store = useNotesStore()
    const result = await store.loadNote('n1')

    expect(result).toBeDefined()
    expect(store.activeNote).not.toBeNull()
    expect(store.activeNote!.title).toBe('Active')
  })

  it('loadNote returns undefined for missing note', async () => {
    const store = useNotesStore()
    const result = await store.loadNote('non-existent')

    expect(result).toBeUndefined()
    expect(store.activeNote).toBeNull()
  })

  it('createNote adds to store and persists to DB', async () => {
    const store = useNotesStore()
    const note = await store.createNote(null)

    expect(note.title).toBe('Untitled Note')
    expect(note.folder).toBeNull()
    expect(store.notes).toHaveLength(1)

    // Verify persisted
    const fromDb = await db.notes.get(note.id)
    expect(fromDb).toBeDefined()
    expect(fromDb!.title).toBe('Untitled Note')
  })

  it('createNote in a folder sets the folder ID', async () => {
    const store = useNotesStore()
    const note = await store.createNote('folder-123')

    expect(note.folder).toBe('folder-123')

    const fromDb = await db.notes.get(note.id)
    expect(fromDb!.folder).toBe('folder-123')
  })

  it('updateNote persists changes and updates store', async () => {
    const store = useNotesStore()
    const original = await store.createNote(null)
    const originalUpdatedAt = original.updatedAt

    // Small delay to ensure different timestamp
    await new Promise((r) => setTimeout(r, 5))

    const updated: Note = {
      ...original,
      title: 'Updated Title',
      content: 'New content',
    }
    await store.updateNote(updated)

    // Store is updated
    const inStore = store.notes.find((n) => n.id === original.id)
    expect(inStore!.title).toBe('Updated Title')
    expect(inStore!.content).toBe('New content')

    // DB is updated
    const fromDb = await db.notes.get(original.id)
    expect(fromDb!.title).toBe('Updated Title')
    expect(fromDb!.content).toBe('New content')
    // updatedAt should be newer
    expect(fromDb!.updatedAt).not.toBe(originalUpdatedAt)
  })

  it('updateNote updates activeNote if it matches', async () => {
    const store = useNotesStore()
    const note = await store.createNote(null)
    await store.loadNote(note.id)

    expect(store.activeNote!.title).toBe('Untitled Note')

    await store.updateNote({ ...note, title: 'Changed' })
    expect(store.activeNote!.title).toBe('Changed')
  })

  it('updateNote does NOT mutate the original passed object unexpectedly', async () => {
    const store = useNotesStore()
    const original = await store.createNote(null)
    const originalUpdatedAt = original.updatedAt

    // Pass a copy to simulate what the UI does
    const toUpdate = { ...original, title: 'New Title' }
    await store.updateNote(toUpdate)

    // The original should not have been mutated
    expect(original.updatedAt).toBe(originalUpdatedAt)
  })

  it('updateNote handles objects spread from reactive refs (EditorView pattern)', async () => {
    const store = useNotesStore()
    const note = await store.createNote(null)
    await store.loadNote(note.id)

    // Simulate what EditorView does: spread activeNote.value + override fields
    // activeNote.value is a reactive proxy, spreading it keeps nested proxied arrays
    const updatedNote = {
      ...store.activeNote!,
      title: 'Edited Title',
      content: 'Edited content',
    }

    // This should NOT throw DataCloneError
    await expect(store.updateNote(updatedNote)).resolves.toBeUndefined()

    // Verify it persisted correctly
    const fromDb = await db.notes.get(note.id)
    expect(fromDb!.title).toBe('Edited Title')
    expect(fromDb!.content).toBe('Edited content')
  })

  it('updateNote handles notes with non-empty tags array from reactive state', async () => {
    // Seed a note with tags directly in DB
    await db.notes.put(makeNote({ id: 'tagged', title: 'Tagged', tags: ['vue', 'test'] }))
    const store = useNotesStore()
    await store.loadAll()
    await store.loadNote('tagged')

    // Spread the reactive activeNote (which has a reactive tags array)
    const updatedNote = {
      ...store.activeNote!,
      title: 'Updated Tagged',
    }

    await expect(store.updateNote(updatedNote)).resolves.toBeUndefined()

    const fromDb = await db.notes.get('tagged')
    expect(fromDb!.title).toBe('Updated Tagged')
    expect(fromDb!.tags).toEqual(['vue', 'test'])
  })

  it('toggleFavorite toggles and persists', async () => {
    const store = useNotesStore()
    const note = await store.createNote(null)
    expect(note.isFavorite).toBe(false)

    await store.toggleFavorite(note.id)

    const inStore = store.notes.find((n) => n.id === note.id)
    expect(inStore!.isFavorite).toBe(true)

    const fromDb = await db.notes.get(note.id)
    expect(fromDb!.isFavorite).toBe(true)
  })

  it('toggleFavorite does nothing for non-existent note', async () => {
    const store = useNotesStore()
    await expect(store.toggleFavorite('non-existent')).resolves.toBeUndefined()
  })

  it('removeNote removes from store and DB', async () => {
    const store = useNotesStore()
    const note = await store.createNote(null)

    await store.removeNote(note.id)

    expect(store.notes).toHaveLength(0)
    const fromDb = await db.notes.get(note.id)
    expect(fromDb).toBeUndefined()
  })

  it('removeNote clears activeNote if it was the active one', async () => {
    const store = useNotesStore()
    const note = await store.createNote(null)
    await store.loadNote(note.id)
    expect(store.activeNote).not.toBeNull()

    await store.removeNote(note.id)
    expect(store.activeNote).toBeNull()
  })

  it('notesByFolder filters correctly', async () => {
    const store = useNotesStore()
    await store.createNote(null)
    await store.createNote(null)
    await store.createNote('folder-a')

    const rootNotes = store.notesByFolder(null)
    expect(rootNotes).toHaveLength(2)

    const folderNotes = store.notesByFolder('folder-a')
    expect(folderNotes).toHaveLength(1)
  })

  it('sortedNotes returns most recently updated first', async () => {
    const store = useNotesStore()
    await db.notes.put(makeNote({ id: '1', title: 'Old', updatedAt: '2024-01-01T00:00:00Z' }))
    await db.notes.put(makeNote({ id: '2', title: 'New', updatedAt: '2024-12-01T00:00:00Z' }))
    await db.notes.put(makeNote({ id: '3', title: 'Mid', updatedAt: '2024-06-01T00:00:00Z' }))
    await store.loadAll()

    expect(store.sortedNotes[0]!.title).toBe('New')
    expect(store.sortedNotes[1]!.title).toBe('Mid')
    expect(store.sortedNotes[2]!.title).toBe('Old')
  })

  it('favorites computed returns only favorited notes', async () => {
    const store = useNotesStore()
    await db.notes.put(makeNote({ id: '1', isFavorite: true }))
    await db.notes.put(makeNote({ id: '2', isFavorite: false }))
    await db.notes.put(makeNote({ id: '3', isFavorite: true }))
    await store.loadAll()

    expect(store.favorites).toHaveLength(2)
  })
})
