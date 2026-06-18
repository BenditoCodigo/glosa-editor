import { db } from './db'
import type { Note } from '@/types/note'
import type { Folder } from '@/types/folder'
import type { StorageAdapter } from './adapters/types'
import { IndexedDBAdapter } from './adapters/indexeddb'

let activeAdapter: StorageAdapter = new IndexedDBAdapter()

export function getAdapter(): StorageAdapter {
  return activeAdapter
}

export function setAdapter(adapter: StorageAdapter): void {
  if (!adapter) throw new Error('Invalid adapter')
  activeAdapter = adapter
}

// --- Notes ---

export async function getAllNotes(): Promise<Note[]> {
  return activeAdapter.getAllNotes()
}

export async function getNoteById(id: string): Promise<Note | undefined> {
  return activeAdapter.getNoteById(id)
}

export async function getNotesByFolder(folderId: string | null): Promise<Note[]> {
  return activeAdapter.getNotesByFolder(folderId)
}

export async function saveNote(note: Note): Promise<void> {
  return activeAdapter.saveNote(note)
}

export async function deleteNote(id: string): Promise<void> {
  return activeAdapter.deleteNote(id)
}

// --- Folders ---

export async function getAllFolders(): Promise<Folder[]> {
  return activeAdapter.getAllFolders()
}

export async function getFolderById(id: string): Promise<Folder | undefined> {
  return activeAdapter.getFolderById(id)
}

export async function getFoldersByParent(parentId: string | null): Promise<Folder[]> {
  return activeAdapter.getFoldersByParent(parentId)
}

export async function saveFolder(folder: Folder): Promise<void> {
  return activeAdapter.saveFolder(folder)
}

export async function deleteFolder(id: string): Promise<void> {
  return activeAdapter.deleteFolder(id)
}

// --- Seed data (for POC) ---

export async function seedIfEmpty(): Promise<void> {
  if (!(activeAdapter instanceof IndexedDBAdapter)) return

  const noteCount = await db.notes.count()
  if (noteCount > 0) return

  const now = new Date().toISOString()

  const folders: Folder[] = [
    { id: 'f1', name: 'Digital Philosophy', parentFolder: null, isFavorite: false, createdAt: now, updatedAt: now },
    { id: 'f2', name: 'Project Aurora', parentFolder: null, isFavorite: false, createdAt: now, updatedAt: now },
    { id: 'f3', name: 'Personal Journal', parentFolder: null, isFavorite: true, createdAt: now, updatedAt: now },
    { id: 'f4', name: 'Reading List', parentFolder: null, isFavorite: false, createdAt: now, updatedAt: now },
  ]

  const notes: Note[] = [
    {
      id: 'n1',
      title: 'The Ethics of Attention',
      content: 'Reflecting on how modern interface design deliberately fragments our cognitive flow and what we can do to reclaim sustained focus in our digital environments.',
      folder: null,
      isFavorite: false,
      createdAt: '2024-10-14T10:00:00Z',
      updatedAt: '2024-10-14T10:00:00Z',
      tags: ['draft'],
    },
    {
      id: 'n2',
      title: 'Minimalist UI Patterns',
      content: 'Exploring the use of negative space and typography as the primary structural elements in modern interface design. Less chrome, more content.',
      folder: null,
      isFavorite: false,
      createdAt: '2024-10-12T10:00:00Z',
      updatedAt: '2024-10-12T10:00:00Z',
      tags: ['design'],
    },
    {
      id: 'n3',
      title: 'Weekly Retrospective',
      content: 'Productivity was high, but deep focus sessions were interrupted by unnecessary notifications. Need to implement a stricter notification policy.',
      folder: null,
      isFavorite: true,
      createdAt: '2024-10-10T10:00:00Z',
      updatedAt: '2024-10-10T10:00:00Z',
      tags: ['personal'],
    },
    {
      id: 'n4',
      title: 'System Architecture v2',
      content: 'Moving towards a decoupled API structure to ensure future scalability and performance. Key decisions: event-driven, CQRS for reads.',
      folder: null,
      isFavorite: false,
      createdAt: '2024-10-05T10:00:00Z',
      updatedAt: '2024-10-05T10:00:00Z',
      tags: ['tech'],
    },
    {
      id: 'n5',
      title: 'Philosophical Approaches to Minimalism',
      content: 'True digital silence is not merely the absence of notification sounds. It is the active curation of one\'s environment to allow for the most precious resource of the information age: undistracted focus.\n\n## The Invisible Interface\n\nWhen the interface disappears, the friction between thought and expression evaporates. We seek to build tools that feel like a fresh sheet of heavy, textured paper—tactile, private, and waiting.\n\n> "Perfection is achieved, not when there is nothing more to add, but when there is nothing left to take away."\n> — Antoine de Saint-Exupéry\n\nOur roadmap for the next quarter centers on these three pillars:\n\n- Semantic search that understands context over keywords.\n- Bi-directional linking for organic thought mapping.\n- Offline-first architecture to ensure "local-only" privacy options.',
      folder: 'f1',
      isFavorite: true,
      createdAt: '2024-10-01T10:00:00Z',
      updatedAt: '2024-10-14T16:00:00Z',
      tags: ['strategy', 'philosophy'],
    },
  ]

  await db.folders.bulkPut(folders)
  await db.notes.bulkPut(notes)
}
