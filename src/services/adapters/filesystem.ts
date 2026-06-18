import { readDir, readTextFile, exists } from '@tauri-apps/plugin-fs'
import type { Note } from '@/types/note'
import type { Folder } from '@/types/folder'
import type { StorageAdapter, FileEntry, FilesystemMetadata } from './types'
import { parseMarkdownFile, frontmatterToNote } from '@/services/frontmatter'

const MAX_DEPTH = 10
const GLOSA_DIR = '.glosa'
const META_FILE = 'meta.json'

function defaultMetadata(): FilesystemMetadata {
  return { version: 1, activity: [], folderFavorites: [] }
}

export class FilesystemAdapter implements StorageAdapter {
  readonly rootPath: string
  readonly noteCache: Map<string, Note> = new Map()
  readonly fileMap: Map<string, FileEntry> = new Map()
  readonly folderCache: Map<string, Folder> = new Map()
  metadata: FilesystemMetadata = defaultMetadata()
  skippedFiles: string[] = []

  constructor(rootPath: string) {
    this.rootPath = rootPath
  }

  async initialize(): Promise<void> {
    this.noteCache.clear()
    this.fileMap.clear()
    this.folderCache.clear()
    this.skippedFiles = []

    await this.scanDirectory(this.rootPath, 0)
    await this.loadMetadata()

    // Apply folder favorites from metadata
    for (const folderId of this.metadata.folderFavorites) {
      const folder = this.folderCache.get(folderId)
      if (folder) {
        folder.isFavorite = true
      }
    }
  }

  // --- Read operations (from cache) ---

  async getAllNotes(): Promise<Note[]> {
    return [...this.noteCache.values()]
  }

  async getNoteById(id: string): Promise<Note | undefined> {
    return this.noteCache.get(id)
  }

  async getNotesByFolder(folderId: string | null): Promise<Note[]> {
    return [...this.noteCache.values()].filter((n) => n.folder === folderId)
  }

  async getAllFolders(): Promise<Folder[]> {
    return [...this.folderCache.values()]
  }

  async getFolderById(id: string): Promise<Folder | undefined> {
    return this.folderCache.get(id)
  }

  async getFoldersByParent(parentId: string | null): Promise<Folder[]> {
    return [...this.folderCache.values()].filter((f) => f.parentFolder === parentId)
  }

  // --- Write stubs (pending task 8) ---

  async saveNote(_note: Note): Promise<void> {
    throw new Error('Not implemented: write operations pending task 8')
  }

  async deleteNote(_id: string): Promise<void> {
    throw new Error('Not implemented: write operations pending task 8')
  }

  async saveFolder(_folder: Folder): Promise<void> {
    throw new Error('Not implemented: write operations pending task 8')
  }

  async deleteFolder(_id: string): Promise<void> {
    throw new Error('Not implemented: write operations pending task 8')
  }

  // --- Private helpers ---

  private async scanDirectory(dirPath: string, depth: number): Promise<void> {
    if (depth >= MAX_DEPTH) return

    let entries
    try {
      entries = await readDir(dirPath)
    } catch {
      // Cannot read directory — skip silently
      return
    }

    for (const entry of entries) {
      const entryPath = `${dirPath}/${entry.name}`

      if (entry.isDirectory) {
        // Skip .glosa and dot-directories
        if (entry.name === GLOSA_DIR || entry.name.startsWith('.')) {
          continue
        }

        this.registerFolder(entryPath)
        await this.scanDirectory(entryPath, depth + 1)
      } else if (entry.isFile && entry.name.endsWith('.md')) {
        await this.processMarkdownFile(entryPath, entry.name)
      }
    }
  }

  private registerFolder(absolutePath: string): void {
    const relativePath = this.relativize(absolutePath)
    // Folder id is the relative path with forward slashes
    const id = relativePath
    const name = relativePath.includes('/') ? relativePath.split('/').pop()! : relativePath
    const parentFolder = relativePath.includes('/')
      ? relativePath.slice(0, relativePath.lastIndexOf('/'))
      : null

    const now = new Date().toISOString()
    const folder: Folder = {
      id,
      name,
      parentFolder,
      isFavorite: false,
      createdAt: now,
      updatedAt: now,
    }

    this.folderCache.set(id, folder)
  }

  private async processMarkdownFile(absolutePath: string, filename: string): Promise<void> {
    let content: string
    try {
      content = await readTextFile(absolutePath)
    } catch {
      this.skippedFiles.push(absolutePath)
      return
    }

    const relativePath = this.relativize(absolutePath)
    const folderPath = relativePath.includes('/')
      ? relativePath.slice(0, relativePath.lastIndexOf('/'))
      : null

    const { frontmatter, body } = parseMarkdownFile(filename, content)
    const note = frontmatterToNote(frontmatter, body, folderPath, filename)

    this.noteCache.set(note.id, note)
    this.fileMap.set(note.id, {
      noteId: note.id,
      absolutePath,
      relativePath,
      filename,
      folderPath,
      lastModified: Date.now(),
    })
  }

  private async loadMetadata(): Promise<void> {
    const metaPath = `${this.rootPath}/${GLOSA_DIR}/${META_FILE}`

    const metaExists = await exists(metaPath)
    if (!metaExists) {
      this.metadata = defaultMetadata()
      return
    }

    try {
      const raw = await readTextFile(metaPath)
      const parsed = JSON.parse(raw) as unknown

      if (parsed && typeof parsed === 'object' && 'version' in parsed) {
        const obj = parsed as Record<string, unknown>
        this.metadata = {
          version: 1,
          activity: Array.isArray(obj.activity) ? obj.activity.slice(0, 500) : [],
          folderFavorites: Array.isArray(obj.folderFavorites) ? obj.folderFavorites : [],
        }
      } else {
        this.metadata = defaultMetadata()
      }
    } catch {
      // Invalid JSON or read error — start fresh
      this.metadata = defaultMetadata()
    }
  }

  private relativize(absolutePath: string): string {
    // Strip root path prefix and leading slash
    const relative = absolutePath.slice(this.rootPath.length)
    return relative.startsWith('/') ? relative.slice(1) : relative
  }
}
