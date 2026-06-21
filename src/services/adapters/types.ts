import type { Note } from '@/types/note'
import type { Folder } from '@/types/folder'

export interface StorageAdapter {
  getAllNotes(): Promise<Note[]>
  getNoteById(id: string): Promise<Note | undefined>
  getNotesByFolder(folderId: string | null): Promise<Note[]>
  saveNote(note: Note): Promise<void>
  deleteNote(id: string): Promise<void>
  getAllFolders(): Promise<Folder[]>
  getFolderById(id: string): Promise<Folder | undefined>
  getFoldersByParent(parentId: string | null): Promise<Folder[]>
  saveFolder(folder: Folder): Promise<Folder>
  deleteFolder(id: string): Promise<void>
}

export interface FileEntry {
  noteId: string
  absolutePath: string
  relativePath: string
  filename: string
  folderPath: string | null
  lastModified: number
}

export interface ActivityEvent {
  type: 'open' | 'edit'
  noteId: string
  timestamp: string
}

export interface FilesystemMetadata {
  version: 1
  activity: ActivityEvent[]
  folderFavorites: string[]
}
