import { readDir, readTextFile, writeTextFile, remove, mkdir, exists } from '@tauri-apps/plugin-fs'
import type { Note } from '@/types/note'
import type { Folder } from '@/types/folder'
import type { StorageAdapter, FileEntry, FilesystemMetadata, ActivityEvent } from './types'
import { parseMarkdownFile, frontmatterToNote, serializeNote } from '@/services/frontmatter'
import { slugify, resolveFilename } from '@/services/slug'

const MAX_DEPTH = 10
const GLOSA_DIR = '.glosa'
const META_FILE = 'meta.json'
const MAX_ACTIVITY_EVENTS = 500

function defaultMetadata(): FilesystemMetadata {
  return { version: 1, activity: [], folderFavorites: [] }
}

export class FilesystemAdapter implements StorageAdapter {
  readonly rootPath: string
  readonly noteCache: Map<string, Note> = new Map()
  readonly fileMap: Map<string, FileEntry> = new Map()
  readonly folderCache: Map<string, Folder> = new Map()
  readonly extraFieldsMap: Map<string, Record<string, unknown>> = new Map()
  metadata: FilesystemMetadata = defaultMetadata()
  skippedFiles: string[] = []

  constructor(rootPath: string) {
    this.rootPath = rootPath
  }

  async initialize(): Promise<void> {
    this.noteCache.clear()
    this.fileMap.clear()
    this.folderCache.clear()
    this.extraFieldsMap.clear()
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
    return Array.from(this.noteCache.values())
  }

  async getNoteById(id: string): Promise<Note | undefined> {
    return this.noteCache.get(id)
  }

  async getNotesByFolder(folderId: string | null): Promise<Note[]> {
    return Array.from(this.noteCache.values()).filter((n) => n.folder === folderId)
  }

  async getAllFolders(): Promise<Folder[]> {
    return Array.from(this.folderCache.values())
  }

  async getFolderById(id: string): Promise<Folder | undefined> {
    return this.folderCache.get(id)
  }

  async getFoldersByParent(parentId: string | null): Promise<Folder[]> {
    return Array.from(this.folderCache.values()).filter((f) => f.parentFolder === parentId)
  }

  // --- Write operations ---

  async saveNote(note: Note): Promise<void> {
    const existingEntry = this.fileMap.get(note.id)
    const extraFields = this.extraFieldsMap.get(note.id)
    const serialized = serializeNote(note, extraFields)

    if (existingEntry) {
      // Existing note — check if title changed (requires rename)
      const currentSlug = slugify(note.title)
      const existingBasename = this.stripSlugSuffix(existingEntry.filename)

      if (currentSlug !== existingBasename) {
        // Title changed → rename file (delete old, write new)
        const dirPath = existingEntry.folderPath
          ? `${this.rootPath}/${existingEntry.folderPath}`
          : this.rootPath

        const existingFilenames = this.getExistingFilenamesInDir(dirPath, note.id)
        const newFilename = resolveFilename(currentSlug, existingFilenames)
        const newAbsolutePath = `${dirPath}/${newFilename}`
        const newRelativePath = existingEntry.folderPath
          ? `${existingEntry.folderPath}/${newFilename}`
          : newFilename

        // Write new file first, then delete old
        await writeTextFile(newAbsolutePath, serialized)

        try {
          await remove(existingEntry.absolutePath)
        } catch {
          // Old file might already be gone — not critical
        }

        // Update in-memory state
        this.noteCache.set(note.id, note)
        this.fileMap.set(note.id, {
          noteId: note.id,
          absolutePath: newAbsolutePath,
          relativePath: newRelativePath,
          filename: newFilename,
          folderPath: existingEntry.folderPath,
          lastModified: Date.now(),
        })
      } else {
        // Same title — overwrite existing file
        await writeTextFile(existingEntry.absolutePath, serialized)

        // Update in-memory state
        this.noteCache.set(note.id, note)
        this.fileMap.set(note.id, {
          ...existingEntry,
          lastModified: Date.now(),
        })
      }
    } else {
      // New note — create file
      const folderPath = note.folder
      const dirPath = folderPath
        ? `${this.rootPath}/${folderPath}`
        : this.rootPath

      // Ensure parent directory exists
      await mkdir(dirPath, { recursive: true })

      const slug = slugify(note.title)
      const existingFilenames = this.getExistingFilenamesInDir(dirPath, note.id)
      const filename = resolveFilename(slug, existingFilenames)
      const absolutePath = `${dirPath}/${filename}`
      const relativePath = folderPath ? `${folderPath}/${filename}` : filename

      await writeTextFile(absolutePath, serialized)

      // Update in-memory state
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
  }

  async deleteNote(id: string): Promise<void> {
    const entry = this.fileMap.get(id)
    if (!entry) return

    try {
      await remove(entry.absolutePath)
    } catch (err: unknown) {
      if (this.isNotFoundError(err)) {
        // File already gone — proceed with cache cleanup
      } else {
        throw err
      }
    }

    // Remove from in-memory state
    this.noteCache.delete(id)
    this.fileMap.delete(id)
    this.extraFieldsMap.delete(id)
  }

  async saveFolder(folder: Folder): Promise<void> {
    const absolutePath = `${this.rootPath}/${folder.id}`

    // Create directory (idempotent — mkdir recursive doesn't error on existing)
    await mkdir(absolutePath, { recursive: true })

    // Update in-memory state
    this.folderCache.set(folder.id, folder)
  }

  async deleteFolder(id: string): Promise<void> {
    const absolutePath = `${this.rootPath}/${id}`

    try {
      await remove(absolutePath, { recursive: true })
    } catch (err: unknown) {
      if (this.isNotFoundError(err)) {
        // Directory already gone — proceed with cache cleanup
      } else {
        throw err
      }
    }

    // Remove the folder and all child notes/folders from caches
    this.folderCache.delete(id)

    // Remove child folders (those whose id starts with this folder's path)
    const prefix = `${id}/`
    for (const folderId of Array.from(this.folderCache.keys())) {
      if (folderId.startsWith(prefix)) {
        this.folderCache.delete(folderId)
      }
    }

    // Remove child notes (those in this folder or its subfolders)
    for (const [noteId, entry] of Array.from(this.fileMap.entries())) {
      if (entry.folderPath === id || (entry.folderPath && entry.folderPath.startsWith(prefix))) {
        this.noteCache.delete(noteId)
        this.fileMap.delete(noteId)
        this.extraFieldsMap.delete(noteId)
      }
    }
  }

  // --- Activity tracking ---

  async addActivity(event: ActivityEvent): Promise<void> {
    this.metadata.activity.push(event)

    // Cap at MAX_ACTIVITY_EVENTS (discard oldest)
    if (this.metadata.activity.length > MAX_ACTIVITY_EVENTS) {
      this.metadata.activity = this.metadata.activity.slice(
        this.metadata.activity.length - MAX_ACTIVITY_EVENTS,
      )
    }

    await this.saveMetadata()
  }

  // --- Private helpers ---

  private async saveMetadata(): Promise<void> {
    const glosaDir = `${this.rootPath}/${GLOSA_DIR}`
    const metaPath = `${glosaDir}/${META_FILE}`

    try {
      await mkdir(glosaDir, { recursive: true })
      await writeTextFile(metaPath, JSON.stringify(this.metadata, null, 2))
    } catch {
      // Best-effort: if write fails, keep metadata in memory (Requirement 9, criterion 5)
    }
  }

  private async scanDirectory(dirPath: string, depth: number): Promise<void> {
    if (depth >= MAX_DEPTH) return

    let entries: Awaited<ReturnType<typeof readDir>>
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

    // Track unrecognized frontmatter fields
    const knownKeys = new Set(['id', 'title', 'createdAt', 'updatedAt', 'tags', 'isFavorite', 'emoji', 'coverImage'])
    const extraFields: Record<string, unknown> = {}
    let hasExtra = false
    for (const [key, value] of Object.entries(frontmatter)) {
      if (!knownKeys.has(key)) {
        extraFields[key] = value
        hasExtra = true
      }
    }
    if (hasExtra) {
      this.extraFieldsMap.set(note.id, extraFields)
    }

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
          activity: Array.isArray(obj.activity) ? obj.activity.slice(0, MAX_ACTIVITY_EVENTS) : [],
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

  /**
   * Strips the .md extension and any numeric suffix (e.g., "-2", "-99") from a filename
   * to get the base slug for comparison.
   */
  private stripSlugSuffix(filename: string): string {
    const withoutExt = filename.replace(/\.md$/i, '')
    // Remove trailing numeric suffix like -2, -99
    return withoutExt.replace(/-\d+$/, '')
  }

  /**
   * Gets existing filenames in a directory from the fileMap,
   * excluding the specified noteId's own file.
   */
  private getExistingFilenamesInDir(dirPath: string, excludeNoteId: string): string[] {
    const folderPath = this.relativize(dirPath)
    const normalizedFolderPath = folderPath === '' ? null : folderPath

    const filenames: string[] = []
    for (const [noteId, entry] of Array.from(this.fileMap.entries())) {
      if (noteId === excludeNoteId) continue
      if (entry.folderPath === normalizedFolderPath) {
        filenames.push(entry.filename)
      }
    }
    return filenames
  }

  /**
   * Checks whether an error is a "not found" type error.
   */
  private isNotFoundError(err: unknown): boolean {
    if (err instanceof Error) {
      const msg = err.message.toLowerCase()
      return msg.includes('not found') || msg.includes('no such file') || msg.includes('notfound')
    }
    return false
  }
}
