import { readDir, readTextFile, writeTextFile, remove, mkdir, exists, watch } from '@tauri-apps/plugin-fs'
import type { WatchEvent, UnwatchFn } from '@tauri-apps/plugin-fs'
import type { Note } from '@/types/note'
import type { Folder } from '@/types/folder'
import type { StorageAdapter, FileEntry, FilesystemMetadata, ActivityEvent } from './types'
import { parseMarkdownFile, frontmatterToNote, serializeNote } from '@/services/frontmatter'
import { slugify, resolveFilename } from '@/services/slug'

const MAX_DEPTH = 10
const GLOSA_DIR = '.glosa'
const META_FILE = 'meta.json'
const MAX_ACTIVITY_EVENTS = 500
const WATCH_DEBOUNCE_MS = 300

function defaultMetadata(): FilesystemMetadata {
  return { version: 1, activity: [], folderFavorites: [] }
}

/**
 * Callback invoked when external changes are detected by the watcher.
 * Allows stores to reload their state reactively.
 */
export interface WatcherChangeCallback {
  onNoteChanged(note: Note): void
  onNoteRemoved(noteId: string, wasActive: boolean): void
  onNoteAdded(note: Note): void
  onFolderAdded(folder: Folder): void
  onFolderRemoved(folderId: string): void
}

export class FilesystemAdapter implements StorageAdapter {
  readonly rootPath: string
  readonly noteCache: Map<string, Note> = new Map()
  readonly fileMap: Map<string, FileEntry> = new Map()
  readonly folderCache: Map<string, Folder> = new Map()
  readonly extraFieldsMap: Map<string, Record<string, unknown>> = new Map()
  metadata: FilesystemMetadata = defaultMetadata()
  skippedFiles: string[] = []

  private unwatchFn: UnwatchFn | null = null
  private activeNoteId: string | null = null
  private watcherCallback: WatcherChangeCallback | null = null

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

  async saveFolder(folder: Folder): Promise<Folder> {
    // Determine the directory name on disk using the slugified folder name
    const slug = slugify(folder.name)
    const parentPath = folder.parentFolder
      ? `${this.rootPath}/${folder.parentFolder}`
      : this.rootPath

    // Check if this folder already exists in cache (rename scenario)
    const existingFolder = this.folderCache.get(folder.id)

    if (existingFolder && existingFolder.name !== folder.name) {
      // Name changed — need to rename directory on disk
      const oldAbsolutePath = `${this.rootPath}/${folder.id}`
      const existingDirNames = this.getExistingDirNamesInParent(parentPath, folder.id)
      const newDirName = this.resolveDirectoryName(slug, existingDirNames)
      const newRelativePath = folder.parentFolder
        ? `${folder.parentFolder}/${newDirName}`
        : newDirName
      const newAbsolutePath = `${this.rootPath}/${newRelativePath}`

      try {
        const { rename } = await import('@tauri-apps/plugin-fs')
        await rename(oldAbsolutePath, newAbsolutePath)
      } catch {
        // If rename fails, just create the new directory
        await mkdir(newAbsolutePath, { recursive: true })
      }

      // Update cache: remove old, add new
      this.folderCache.delete(folder.id)
      const updatedFolder: Folder = { ...folder, id: newRelativePath }
      this.folderCache.set(newRelativePath, updatedFolder)

      // Update child notes' folder references
      for (const [noteId, entry] of Array.from(this.fileMap.entries())) {
        if (entry.folderPath === folder.id) {
          entry.folderPath = newRelativePath
          const note = this.noteCache.get(noteId)
          if (note) note.folder = newRelativePath
        }
      }

      // Update child folders
      const oldPrefix = `${folder.id}/`
      for (const [fId, f] of Array.from(this.folderCache.entries())) {
        if (f.parentFolder === folder.id) {
          f.parentFolder = newRelativePath
        }
        if (fId.startsWith(oldPrefix)) {
          const newFId = newRelativePath + fId.slice(folder.id.length)
          this.folderCache.delete(fId)
          f.parentFolder = newRelativePath
          this.folderCache.set(newFId, { ...f, id: newFId })
        }
      }

      return updatedFolder
    } else if (!existingFolder) {
      // New folder — create directory with slugified name
      const existingDirNames = this.getExistingDirNamesInParent(parentPath, null)
      const dirName = this.resolveDirectoryName(slug, existingDirNames)
      const relativePath = folder.parentFolder
        ? `${folder.parentFolder}/${dirName}`
        : dirName
      const absolutePath = `${this.rootPath}/${relativePath}`

      await mkdir(absolutePath, { recursive: true })

      // Store with the relative path as id
      const updatedFolder: Folder = { ...folder, id: relativePath }
      this.folderCache.set(relativePath, updatedFolder)
      return updatedFolder
    } else {
      // No name change, folder already exists — just update cache
      this.folderCache.set(folder.id, folder)
      return folder
    }
  }

  /**
   * Gets existing directory names in a parent directory from the folder cache,
   * excluding the specified folderId.
   */
  private getExistingDirNamesInParent(parentAbsolutePath: string, excludeFolderId: string | null): string[] {
    const parentRelative = this.relativize(parentAbsolutePath)
    const normalizedParent = parentRelative === '' ? null : parentRelative

    const names: string[] = []
    for (const [fId, f] of this.folderCache.entries()) {
      if (fId === excludeFolderId) continue
      if (f.parentFolder === normalizedParent) {
        // Extract the directory name (last segment of the id)
        const dirName = fId.includes('/') ? fId.split('/').pop()! : fId
        names.push(dirName)
      }
    }
    return names
  }

  /**
   * Resolves a unique directory name by appending a numeric suffix if needed.
   */
  private resolveDirectoryName(slug: string, existingNames: string[]): string {
    if (!existingNames.includes(slug)) return slug

    let counter = 2
    while (existingNames.includes(`${slug}-${counter}`)) {
      counter++
    }
    return `${slug}-${counter}`
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

  // --- File watching ---

  /**
   * Sets the currently active note ID (the note open in the editor).
   * Used to implement "local wins" — external modifications to the active note
   * are ignored to protect unsaved local changes.
   */
  setActiveNoteId(id: string | null): void {
    this.activeNoteId = id
  }

  /**
   * Starts a recursive file watcher on the root directory.
   * The callback is invoked when external changes are detected so stores can
   * update their reactive state.
   */
  async startWatching(callback: WatcherChangeCallback): Promise<void> {
    if (this.unwatchFn) return // Already watching

    this.watcherCallback = callback

    this.unwatchFn = await watch(
      this.rootPath,
      (event: WatchEvent) => { this.handleWatchEvent(event) },
      { recursive: true, delayMs: WATCH_DEBOUNCE_MS },
    )
  }

  /**
   * Stops the file watcher. Called when deactivating the filesystem adapter.
   */
  stopWatching(): void {
    if (this.unwatchFn) {
      this.unwatchFn()
      this.unwatchFn = null
    }
    this.watcherCallback = null
  }

  private handleWatchEvent(event: WatchEvent): void {
    for (const filePath of event.paths) {
      // Ignore paths inside .glosa directory
      const relativePath = this.relativize(filePath)
      if (relativePath.startsWith(GLOSA_DIR) || relativePath.includes(`/${GLOSA_DIR}/`)) {
        continue
      }

      // Ignore dot-directories
      const segments = relativePath.split('/')
      if (segments.some(s => s.startsWith('.') && s !== '.')) {
        continue
      }

      if (typeof event.type === 'object') {
        if ('create' in event.type) {
          this.handleCreateEvent(filePath, relativePath)
        } else if ('modify' in event.type) {
          this.handleModifyEvent(filePath, relativePath)
        } else if ('remove' in event.type) {
          this.handleRemoveEvent(filePath, relativePath)
        }
      }
    }
  }

  private handleCreateEvent(absolutePath: string, relativePath: string): void {
    if (absolutePath.endsWith('.md')) {
      this.handleFileCreated(absolutePath, relativePath)
    } else {
      // Might be a new directory — register as folder
      this.handleDirectoryCreated(absolutePath, relativePath)
    }
  }

  private handleModifyEvent(absolutePath: string, relativePath: string): void {
    if (absolutePath.endsWith('.md')) {
      this.handleFileModified(absolutePath, relativePath)
    }
    // Directory modification events are not actionable
  }

  private handleRemoveEvent(absolutePath: string, relativePath: string): void {
    if (absolutePath.endsWith('.md')) {
      this.handleFileRemoved(absolutePath, relativePath)
    } else {
      // Might be a directory removal
      this.handleDirectoryRemoved(relativePath)
    }
  }

  private async handleFileCreated(absolutePath: string, relativePath: string): Promise<void> {
    // Check if we already know about this file (our own write triggered the event)
    for (const entry of this.fileMap.values()) {
      if (entry.absolutePath === absolutePath) return
    }

    const filename = relativePath.includes('/')
      ? relativePath.split('/').pop()!
      : relativePath

    let content: string
    try {
      content = await readTextFile(absolutePath)
    } catch {
      // Requirement 12.6: skip files that can't be read
      return
    }

    const folderPath = relativePath.includes('/')
      ? relativePath.slice(0, relativePath.lastIndexOf('/'))
      : null

    const { frontmatter, body } = parseMarkdownFile(filename, content)
    const note = frontmatterToNote(frontmatter, body, folderPath, filename)

    // Track extra fields
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

    this.watcherCallback?.onNoteAdded(note)
  }

  private async handleFileModified(absolutePath: string, _relativePath: string): Promise<void> {
    // Find which note this file belongs to
    let noteId: string | null = null
    for (const [id, entry] of this.fileMap.entries()) {
      if (entry.absolutePath === absolutePath) {
        noteId = id
        break
      }
    }

    if (!noteId) return // Unknown file, might be newly created — handled by create event

    // Requirement 12.5: local wins — don't overwrite active note with unsaved changes
    if (noteId === this.activeNoteId) return

    let content: string
    try {
      content = await readTextFile(absolutePath)
    } catch {
      // Requirement 12.6: skip files that can't be read
      return
    }

    const entry = this.fileMap.get(noteId)!
    const filename = entry.filename
    const folderPath = entry.folderPath

    const { frontmatter, body } = parseMarkdownFile(filename, content)
    const note = frontmatterToNote(frontmatter, body, folderPath, filename)

    // Track extra fields
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
    } else {
      this.extraFieldsMap.delete(note.id)
    }

    this.noteCache.set(note.id, note)
    this.fileMap.set(note.id, { ...entry, lastModified: Date.now() })

    this.watcherCallback?.onNoteChanged(note)
  }

  private handleFileRemoved(absolutePath: string, _relativePath: string): void {
    // Find which note this file belongs to
    let noteId: string | null = null
    for (const [id, entry] of this.fileMap.entries()) {
      if (entry.absolutePath === absolutePath) {
        noteId = id
        break
      }
    }

    if (!noteId) return

    const wasActive = noteId === this.activeNoteId

    this.noteCache.delete(noteId)
    this.fileMap.delete(noteId)
    this.extraFieldsMap.delete(noteId)

    this.watcherCallback?.onNoteRemoved(noteId, wasActive)
  }

  private handleDirectoryCreated(absolutePath: string, relativePath: string): void {
    // Only register if not already known
    if (this.folderCache.has(relativePath)) return

    const name = relativePath.includes('/')
      ? relativePath.split('/').pop()!
      : relativePath
    const parentFolder = relativePath.includes('/')
      ? relativePath.slice(0, relativePath.lastIndexOf('/'))
      : null

    const now = new Date().toISOString()
    const folder: Folder = {
      id: relativePath,
      name,
      parentFolder,
      isFavorite: false,
      createdAt: now,
      updatedAt: now,
    }

    this.folderCache.set(relativePath, folder)
    this.watcherCallback?.onFolderAdded(folder)
  }

  private handleDirectoryRemoved(relativePath: string): void {
    // Check if it's a known folder
    if (!this.folderCache.has(relativePath)) return

    this.folderCache.delete(relativePath)

    // Remove child folders
    const prefix = `${relativePath}/`
    for (const folderId of Array.from(this.folderCache.keys())) {
      if (folderId.startsWith(prefix)) {
        this.folderCache.delete(folderId)
      }
    }

    // Remove child notes
    for (const [noteId, entry] of Array.from(this.fileMap.entries())) {
      if (entry.folderPath === relativePath || (entry.folderPath && entry.folderPath.startsWith(prefix))) {
        const wasActive = noteId === this.activeNoteId
        this.noteCache.delete(noteId)
        this.fileMap.delete(noteId)
        this.extraFieldsMap.delete(noteId)
        this.watcherCallback?.onNoteRemoved(noteId, wasActive)
      }
    }

    this.watcherCallback?.onFolderRemoved(relativePath)
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

    let metaExists: boolean
    try {
      metaExists = await exists(metaPath)
    } catch {
      this.metadata = defaultMetadata()
      return
    }

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
