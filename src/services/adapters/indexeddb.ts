import { db } from '../db'
import type { Note } from '@/types/note'
import type { Folder } from '@/types/folder'
import type { StorageAdapter } from './types'

export class IndexedDBAdapter implements StorageAdapter {
  async getAllNotes(): Promise<Note[]> {
    return db.notes.toArray()
  }

  async getNoteById(id: string): Promise<Note | undefined> {
    return db.notes.get(id)
  }

  async getNotesByFolder(folderId: string | null): Promise<Note[]> {
    const all = await db.notes.toArray()
    return all.filter((n) => n.folder === folderId)
  }

  async saveNote(note: Note): Promise<void> {
    await db.notes.put(note)
  }

  async deleteNote(id: string): Promise<void> {
    await db.notes.delete(id)
  }

  async getAllFolders(): Promise<Folder[]> {
    return db.folders.toArray()
  }

  async getFolderById(id: string): Promise<Folder | undefined> {
    return db.folders.get(id)
  }

  async getFoldersByParent(parentId: string | null): Promise<Folder[]> {
    const all = await db.folders.toArray()
    return all.filter((f) => f.parentFolder === parentId)
  }

  async saveFolder(folder: Folder): Promise<void> {
    await db.folders.put(folder)
  }

  async deleteFolder(id: string): Promise<void> {
    await db.folders.delete(id)
  }
}
