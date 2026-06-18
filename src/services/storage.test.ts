import { describe, it, expect, beforeEach } from 'vitest'
import { db } from './db'
import {
  getAllNotes,
  getNoteById,
  getNotesByFolder,
  saveNote,
  deleteNote,
  getAllFolders,
  getFolderById,
  getFoldersByParent,
  saveFolder,
  deleteFolder,
  seedIfEmpty,
} from './storage'
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

describe('Storage Service - Notes', () => {
  beforeEach(async () => {
    await db.notes.clear()
    await db.folders.clear()
  })

  it('saves and retrieves a note by ID', async () => {
    const note = makeNote({ title: 'Hello World' })
    await saveNote(note)

    const retrieved = await getNoteById(note.id)
    expect(retrieved).toBeDefined()
    expect(retrieved!.title).toBe('Hello World')
    expect(retrieved!.content).toBe('Some content')
  })

  it('returns undefined for non-existent note', async () => {
    const result = await getNoteById('non-existent-id')
    expect(result).toBeUndefined()
  })

  it('retrieves all notes', async () => {
    await saveNote(makeNote({ id: '1' }))
    await saveNote(makeNote({ id: '2' }))
    await saveNote(makeNote({ id: '3' }))

    const all = await getAllNotes()
    expect(all).toHaveLength(3)
  })

  it('filters notes by folder (null = root)', async () => {
    await saveNote(makeNote({ id: '1', folder: null }))
    await saveNote(makeNote({ id: '2', folder: null }))
    await saveNote(makeNote({ id: '3', folder: 'folder-a' }))

    const rootNotes = await getNotesByFolder(null)
    expect(rootNotes).toHaveLength(2)

    const folderNotes = await getNotesByFolder('folder-a')
    expect(folderNotes).toHaveLength(1)
    expect(folderNotes[0]!.id).toBe('3')
  })

  it('updates an existing note (put overwrites)', async () => {
    const note = makeNote({ title: 'Original' })
    await saveNote(note)

    const updated = { ...note, title: 'Updated', updatedAt: new Date().toISOString() }
    await saveNote(updated)

    const retrieved = await getNoteById(note.id)
    expect(retrieved!.title).toBe('Updated')

    // Should not create a duplicate
    const all = await getAllNotes()
    expect(all).toHaveLength(1)
  })

  it('deletes a note', async () => {
    const note = makeNote()
    await saveNote(note)
    await deleteNote(note.id)

    const retrieved = await getNoteById(note.id)
    expect(retrieved).toBeUndefined()
  })

  it('deleting non-existent note does not throw', async () => {
    await expect(deleteNote('non-existent')).resolves.toBeUndefined()
  })

  it('saves note with all fields including tags and special characters', async () => {
    const note = makeNote({
      title: 'Note with "quotes" & <special> chars',
      content: '# Markdown\n\n- item 1\n- item 2\n\n> Quote with "quotes"',
      tags: ['test', 'special-chars', 'markdown'],
      isFavorite: true,
    })
    await saveNote(note)

    const retrieved = await getNoteById(note.id)
    expect(retrieved!.title).toBe('Note with "quotes" & <special> chars')
    expect(retrieved!.content).toContain('# Markdown')
    expect(retrieved!.tags).toEqual(['test', 'special-chars', 'markdown'])
    expect(retrieved!.isFavorite).toBe(true)
  })

  it('handles empty content correctly', async () => {
    const note = makeNote({ title: 'Empty', content: '' })
    await saveNote(note)

    const retrieved = await getNoteById(note.id)
    expect(retrieved!.content).toBe('')
  })
})

describe('Storage Service - Folders', () => {
  beforeEach(async () => {
    await db.notes.clear()
    await db.folders.clear()
  })

  it('saves and retrieves a folder by ID', async () => {
    const folder = makeFolder({ name: 'My Folder' })
    await saveFolder(folder)

    const retrieved = await getFolderById(folder.id)
    expect(retrieved).toBeDefined()
    expect(retrieved!.name).toBe('My Folder')
  })

  it('returns undefined for non-existent folder', async () => {
    const result = await getFolderById('non-existent')
    expect(result).toBeUndefined()
  })

  it('retrieves all folders', async () => {
    await saveFolder(makeFolder({ id: '1' }))
    await saveFolder(makeFolder({ id: '2' }))

    const all = await getAllFolders()
    expect(all).toHaveLength(2)
  })

  it('filters folders by parent (null = root)', async () => {
    await saveFolder(makeFolder({ id: '1', parentFolder: null }))
    await saveFolder(makeFolder({ id: '2', parentFolder: null }))
    await saveFolder(makeFolder({ id: '3', parentFolder: '1' }))

    const rootFolders = await getFoldersByParent(null)
    expect(rootFolders).toHaveLength(2)

    const childFolders = await getFoldersByParent('1')
    expect(childFolders).toHaveLength(1)
    expect(childFolders[0]!.id).toBe('3')
  })

  it('deletes a folder', async () => {
    const folder = makeFolder()
    await saveFolder(folder)
    await deleteFolder(folder.id)

    const retrieved = await getFolderById(folder.id)
    expect(retrieved).toBeUndefined()
  })
})

describe('Storage Service - Seed', () => {
  beforeEach(async () => {
    await db.notes.clear()
    await db.folders.clear()
  })

  it('seeds data when database is empty', async () => {
    await seedIfEmpty()

    const notes = await getAllNotes()
    const folders = await getAllFolders()
    expect(notes.length).toBeGreaterThan(0)
    expect(folders.length).toBeGreaterThan(0)
  })

  it('does NOT re-seed if notes already exist', async () => {
    await saveNote(makeNote({ id: 'existing' }))
    await seedIfEmpty()

    const notes = await getAllNotes()
    // Should only have our existing note, not the seed data
    expect(notes).toHaveLength(1)
    expect(notes[0]!.id).toBe('existing')
  })
})
