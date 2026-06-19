import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../db'
import { IndexedDBAdapter } from './indexeddb'
import type { Note } from '@/types/note'
import type { Folder } from '@/types/folder'

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

describe('IndexedDBAdapter - Notes', () => {
  let adapter: IndexedDBAdapter

  beforeEach(async () => {
    await db.notes.clear()
    await db.folders.clear()
    adapter = new IndexedDBAdapter()
  })

  it('saves and retrieves a note by ID', async () => {
    const note = makeNote({ title: 'Hello World' })
    await adapter.saveNote(note)

    const retrieved = await adapter.getNoteById(note.id)
    expect(retrieved).toBeDefined()
    expect(retrieved!.title).toBe('Hello World')
    expect(retrieved!.content).toBe('Some content')
  })

  it('returns undefined for non-existent note', async () => {
    const result = await adapter.getNoteById('non-existent-id')
    expect(result).toBeUndefined()
  })

  it('retrieves all notes', async () => {
    await adapter.saveNote(makeNote({ id: '1' }))
    await adapter.saveNote(makeNote({ id: '2' }))
    await adapter.saveNote(makeNote({ id: '3' }))

    const all = await adapter.getAllNotes()
    expect(all).toHaveLength(3)
  })

  it('returns empty array when no notes exist', async () => {
    const all = await adapter.getAllNotes()
    expect(all).toEqual([])
  })

  it('filters notes by folder (null = root)', async () => {
    await adapter.saveNote(makeNote({ id: '1', folder: null }))
    await adapter.saveNote(makeNote({ id: '2', folder: null }))
    await adapter.saveNote(makeNote({ id: '3', folder: 'folder-a' }))

    const rootNotes = await adapter.getNotesByFolder(null)
    expect(rootNotes).toHaveLength(2)

    const folderNotes = await adapter.getNotesByFolder('folder-a')
    expect(folderNotes).toHaveLength(1)
    expect(folderNotes[0]!.id).toBe('3')
  })

  it('returns empty array for folder with no notes', async () => {
    await adapter.saveNote(makeNote({ folder: 'folder-a' }))

    const result = await adapter.getNotesByFolder('folder-b')
    expect(result).toEqual([])
  })

  it('updates an existing note (put overwrites)', async () => {
    const note = makeNote({ title: 'Original' })
    await adapter.saveNote(note)

    const updated = { ...note, title: 'Updated', updatedAt: new Date().toISOString() }
    await adapter.saveNote(updated)

    const retrieved = await adapter.getNoteById(note.id)
    expect(retrieved!.title).toBe('Updated')

    const all = await adapter.getAllNotes()
    expect(all).toHaveLength(1)
  })

  it('deletes a note', async () => {
    const note = makeNote()
    await adapter.saveNote(note)
    await adapter.deleteNote(note.id)

    const retrieved = await adapter.getNoteById(note.id)
    expect(retrieved).toBeUndefined()
  })

  it('deleting non-existent note does not throw', async () => {
    await expect(adapter.deleteNote('non-existent')).resolves.toBeUndefined()
  })

  it('saves note with all fields including tags and special characters', async () => {
    const note = makeNote({
      title: 'Note with "quotes" & <special> chars',
      content: '# Markdown\n\n- item 1\n- item 2\n\n> Quote with "quotes"',
      tags: ['test', 'special-chars', 'markdown'],
      isFavorite: true,
      emoji: '📝',
      coverImage: 'https://example.com/cover.png',
    })
    await adapter.saveNote(note)

    const retrieved = await adapter.getNoteById(note.id)
    expect(retrieved!.title).toBe('Note with "quotes" & <special> chars')
    expect(retrieved!.content).toContain('# Markdown')
    expect(retrieved!.tags).toEqual(['test', 'special-chars', 'markdown'])
    expect(retrieved!.isFavorite).toBe(true)
    expect(retrieved!.emoji).toBe('📝')
    expect(retrieved!.coverImage).toBe('https://example.com/cover.png')
  })

  it('handles empty content correctly', async () => {
    const note = makeNote({ title: 'Empty', content: '' })
    await adapter.saveNote(note)

    const retrieved = await adapter.getNoteById(note.id)
    expect(retrieved!.content).toBe('')
  })
})

describe('IndexedDBAdapter - Folders', () => {
  let adapter: IndexedDBAdapter

  beforeEach(async () => {
    await db.notes.clear()
    await db.folders.clear()
    adapter = new IndexedDBAdapter()
  })

  it('saves and retrieves a folder by ID', async () => {
    const folder = makeFolder({ name: 'My Folder' })
    await adapter.saveFolder(folder)

    const retrieved = await adapter.getFolderById(folder.id)
    expect(retrieved).toBeDefined()
    expect(retrieved!.name).toBe('My Folder')
  })

  it('returns undefined for non-existent folder', async () => {
    const result = await adapter.getFolderById('non-existent')
    expect(result).toBeUndefined()
  })

  it('retrieves all folders', async () => {
    await adapter.saveFolder(makeFolder({ id: '1' }))
    await adapter.saveFolder(makeFolder({ id: '2' }))

    const all = await adapter.getAllFolders()
    expect(all).toHaveLength(2)
  })

  it('returns empty array when no folders exist', async () => {
    const all = await adapter.getAllFolders()
    expect(all).toEqual([])
  })

  it('filters folders by parent (null = root)', async () => {
    await adapter.saveFolder(makeFolder({ id: '1', parentFolder: null }))
    await adapter.saveFolder(makeFolder({ id: '2', parentFolder: null }))
    await adapter.saveFolder(makeFolder({ id: '3', parentFolder: '1' }))

    const rootFolders = await adapter.getFoldersByParent(null)
    expect(rootFolders).toHaveLength(2)

    const childFolders = await adapter.getFoldersByParent('1')
    expect(childFolders).toHaveLength(1)
    expect(childFolders[0]!.id).toBe('3')
  })

  it('returns empty array for parent with no children', async () => {
    await adapter.saveFolder(makeFolder({ parentFolder: null }))

    const result = await adapter.getFoldersByParent('non-existent-parent')
    expect(result).toEqual([])
  })

  it('updates an existing folder (put overwrites)', async () => {
    const folder = makeFolder({ name: 'Original' })
    await adapter.saveFolder(folder)

    const updated = { ...folder, name: 'Updated', updatedAt: new Date().toISOString() }
    await adapter.saveFolder(updated)

    const retrieved = await adapter.getFolderById(folder.id)
    expect(retrieved!.name).toBe('Updated')

    const all = await adapter.getAllFolders()
    expect(all).toHaveLength(1)
  })

  it('deletes a folder', async () => {
    const folder = makeFolder()
    await adapter.saveFolder(folder)
    await adapter.deleteFolder(folder.id)

    const retrieved = await adapter.getFolderById(folder.id)
    expect(retrieved).toBeUndefined()
  })

  it('deleting non-existent folder does not throw', async () => {
    await expect(adapter.deleteFolder('non-existent')).resolves.toBeUndefined()
  })

  it('handles folder with special characters in name', async () => {
    const folder = makeFolder({ name: 'Carpeta con "comillas" & <especial>' })
    await adapter.saveFolder(folder)

    const retrieved = await adapter.getFolderById(folder.id)
    expect(retrieved!.name).toBe('Carpeta con "comillas" & <especial>')
  })
})
