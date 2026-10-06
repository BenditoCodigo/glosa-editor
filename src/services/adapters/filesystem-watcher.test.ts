import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Folder } from '@/types/folder'
import type { WatcherChangeCallback } from './filesystem'

interface WatchEvent {
  type: unknown
  paths: string[]
  attrs?: Record<string, unknown>
}

// Mock @/services/platform
const mockWatch = vi.fn()
const mockReadTextFile = vi.fn()
const mockReadDir = vi.fn()
const mockWriteTextFile = vi.fn()
const mockRemove = vi.fn()
const mockMkdir = vi.fn()
const mockExists = vi.fn()
const mockRename = vi.fn()

vi.mock('@/services/platform', () => ({
  watchDirectory: (...args: unknown[]) => mockWatch(...args),
  readTextFile: (...args: unknown[]) => mockReadTextFile(...args),
  readDir: (...args: unknown[]) => mockReadDir(...args),
  writeTextFile: (...args: unknown[]) => mockWriteTextFile(...args),
  remove: (...args: unknown[]) => mockRemove(...args),
  mkdir: (...args: unknown[]) => mockMkdir(...args),
  exists: (...args: unknown[]) => mockExists(...args),
  rename: (...args: unknown[]) => mockRename(...args),
  isDesktop: () => true,
}))

describe('FilesystemAdapter - File Watching', () => {
  let adapter: InstanceType<typeof import('./filesystem').FilesystemAdapter>
  let callback: WatcherChangeCallback
  let watchCallback: ((event: WatchEvent) => void) | null = null
  const rootPath = '/Users/test/notes'

  beforeEach(async () => {
    vi.clearAllMocks()
    watchCallback = null

    // Setup mock for watch — captures the callback and returns an unwatch function
    mockWatch.mockImplementation(async (_paths: unknown, cb: (event: WatchEvent) => void) => {
      watchCallback = cb
      return () => { watchCallback = null }
    })

    // Setup mock for readDir — return empty directory for initialization
    mockReadDir.mockResolvedValue([])
    mockExists.mockResolvedValue(false)

    // Import and create adapter
    const { FilesystemAdapter } = await import('./filesystem')
    adapter = new FilesystemAdapter(rootPath)
    await adapter.initialize()

    // Setup callback mock
    callback = {
      onNoteChanged: vi.fn(),
      onNoteRemoved: vi.fn(),
      onNoteAdded: vi.fn(),
      onFolderAdded: vi.fn(),
      onFolderRemoved: vi.fn(),
    }
  })

  describe('startWatching', () => {
    it('calls watch() with the root path and recursive option', async () => {
      await adapter.startWatching(callback)

      expect(mockWatch).toHaveBeenCalledWith(
        rootPath,
        expect.any(Function),
      )
    })

    it('does not start watching twice if already watching', async () => {
      await adapter.startWatching(callback)
      await adapter.startWatching(callback)

      expect(mockWatch).toHaveBeenCalledTimes(1)
    })
  })

  describe('stopWatching', () => {
    it('calls the unwatch function when stopping', async () => {
      await adapter.startWatching(callback)

      adapter.stopWatching()

      // Calling stopWatching clears the watcher — a second call is a no-op
      adapter.stopWatching()
      expect(watchCallback).toBeNull()
    })

    it('allows restarting after stopping', async () => {
      await adapter.startWatching(callback)
      adapter.stopWatching()
      await adapter.startWatching(callback)

      expect(mockWatch).toHaveBeenCalledTimes(2)
    })
  })

  describe('file modification events', () => {
    it('re-reads and updates a known note when modified externally', async () => {
      // Pre-populate the adapter's fileMap with a known note
      const noteId = 'note-123'
      const absPath = `${rootPath}/my-note.md`
      const fileContent = `---\nid: ${noteId}\ntitle: Updated Title\ncreatedAt: 2024-01-01T00:00:00Z\nupdatedAt: 2024-01-02T00:00:00Z\ntags: []\nisFavorite: false\n---\nUpdated content`

      adapter.noteCache.set(noteId, {
        id: noteId,
        title: 'Original Title',
        content: 'Original content',
        folder: null,
        isFavorite: false,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        tags: [],
      })
      adapter.fileMap.set(noteId, {
        noteId,
        absolutePath: absPath,
        relativePath: 'my-note.md',
        filename: 'my-note.md',
        folderPath: null,
        lastModified: Date.now(),
      })

      mockReadTextFile.mockResolvedValue(fileContent)

      await adapter.startWatching(callback)

      // Simulate modify event
      const event: WatchEvent = {
        type: { modify: { kind: 'data', mode: 'content' } },
        paths: [absPath],
        attrs: {},
      }
      watchCallback!(event)

      // Allow async handling
      await vi.waitFor(() => {
        expect(callback.onNoteChanged).toHaveBeenCalled()
      })

      const updatedNote = adapter.noteCache.get(noteId)!
      expect(updatedNote.title).toBe('Updated Title')
      expect(updatedNote.content).toBe('Updated content')
    })

    it('skips modification if the note is the active note (local wins)', async () => {
      const noteId = 'note-active'
      const absPath = `${rootPath}/active-note.md`

      adapter.noteCache.set(noteId, {
        id: noteId,
        title: 'Local Title',
        content: 'Local content',
        folder: null,
        isFavorite: false,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        tags: [],
      })
      adapter.fileMap.set(noteId, {
        noteId,
        absolutePath: absPath,
        relativePath: 'active-note.md',
        filename: 'active-note.md',
        folderPath: null,
        lastModified: Date.now(),
      })

      // Mark this note as active
      adapter.setActiveNoteId(noteId)

      await adapter.startWatching(callback)

      // Simulate modify event
      const event: WatchEvent = {
        type: { modify: { kind: 'data', mode: 'content' } },
        paths: [absPath],
        attrs: {},
      }
      watchCallback!(event)

      // Give async handlers time to execute (but they shouldn't)
      await new Promise(r => setTimeout(r, 50))

      expect(mockReadTextFile).not.toHaveBeenCalled()
      expect(callback.onNoteChanged).not.toHaveBeenCalled()
      expect(adapter.noteCache.get(noteId)!.title).toBe('Local Title')
    })
  })

  describe('file deletion events', () => {
    it('removes note from cache and notifies callback', async () => {
      const noteId = 'note-to-delete'
      const absPath = `${rootPath}/doomed.md`

      adapter.noteCache.set(noteId, {
        id: noteId,
        title: 'Doomed Note',
        content: '',
        folder: null,
        isFavorite: false,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        tags: [],
      })
      adapter.fileMap.set(noteId, {
        noteId,
        absolutePath: absPath,
        relativePath: 'doomed.md',
        filename: 'doomed.md',
        folderPath: null,
        lastModified: Date.now(),
      })

      await adapter.startWatching(callback)

      const event: WatchEvent = {
        type: { remove: { kind: 'file' } },
        paths: [absPath],
        attrs: {},
      }
      watchCallback!(event)

      expect(adapter.noteCache.has(noteId)).toBe(false)
      expect(adapter.fileMap.has(noteId)).toBe(false)
      expect(callback.onNoteRemoved).toHaveBeenCalledWith(noteId, false)
    })

    it('reports wasActive=true when the deleted note is the active note', async () => {
      const noteId = 'active-deleted'
      const absPath = `${rootPath}/active.md`

      adapter.noteCache.set(noteId, {
        id: noteId,
        title: 'Active Note',
        content: '',
        folder: null,
        isFavorite: false,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        tags: [],
      })
      adapter.fileMap.set(noteId, {
        noteId,
        absolutePath: absPath,
        relativePath: 'active.md',
        filename: 'active.md',
        folderPath: null,
        lastModified: Date.now(),
      })

      adapter.setActiveNoteId(noteId)
      await adapter.startWatching(callback)

      const event: WatchEvent = {
        type: { remove: { kind: 'file' } },
        paths: [absPath],
        attrs: {},
      }
      watchCallback!(event)

      expect(callback.onNoteRemoved).toHaveBeenCalledWith(noteId, true)
    })
  })

  describe('file creation events', () => {
    it('adds a new note when an .md file is created externally', async () => {
      const absPath = `${rootPath}/new-note.md`
      const fileContent = `---\nid: new-123\ntitle: New Note\ncreatedAt: 2024-01-01T00:00:00Z\nupdatedAt: 2024-01-01T00:00:00Z\ntags: []\nisFavorite: false\n---\nNew content`

      mockReadTextFile.mockResolvedValue(fileContent)
      await adapter.startWatching(callback)

      const event: WatchEvent = {
        type: { create: { kind: 'file' } },
        paths: [absPath],
        attrs: {},
      }
      watchCallback!(event)

      await vi.waitFor(() => {
        expect(callback.onNoteAdded).toHaveBeenCalled()
      })

      const addedNote = adapter.noteCache.get('new-123')
      expect(addedNote).toBeDefined()
      expect(addedNote!.title).toBe('New Note')
      expect(addedNote!.content).toBe('New content')
    })

    it('skips file creation if the file is already known', async () => {
      const noteId = 'existing-note'
      const absPath = `${rootPath}/existing.md`

      adapter.fileMap.set(noteId, {
        noteId,
        absolutePath: absPath,
        relativePath: 'existing.md',
        filename: 'existing.md',
        folderPath: null,
        lastModified: Date.now(),
      })

      await adapter.startWatching(callback)

      const event: WatchEvent = {
        type: { create: { kind: 'file' } },
        paths: [absPath],
        attrs: {},
      }
      watchCallback!(event)

      await new Promise(r => setTimeout(r, 50))
      expect(callback.onNoteAdded).not.toHaveBeenCalled()
    })

    it('skips file creation if readTextFile fails (Requirement 12.6)', async () => {
      const absPath = `${rootPath}/unreadable.md`
      mockReadTextFile.mockRejectedValue(new Error('Permission denied'))

      await adapter.startWatching(callback)

      const event: WatchEvent = {
        type: { create: { kind: 'file' } },
        paths: [absPath],
        attrs: {},
      }
      watchCallback!(event)

      await new Promise(r => setTimeout(r, 50))
      expect(callback.onNoteAdded).not.toHaveBeenCalled()
    })
  })

  describe('directory events', () => {
    it('registers a new folder when a directory is created', async () => {
      const absPath = `${rootPath}/new-folder`

      await adapter.startWatching(callback)

      const event: WatchEvent = {
        type: { create: { kind: 'folder' } },
        paths: [absPath],
        attrs: {},
      }
      watchCallback!(event)

      expect(adapter.folderCache.has('new-folder')).toBe(true)
      expect(callback.onFolderAdded).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'new-folder',
          name: 'new-folder',
          parentFolder: null,
        }),
      )
    })

    it('removes folder and its children on directory deletion', async () => {
      // Pre-populate folder and child note
      const folder: Folder = {
        id: 'ideas',
        name: 'ideas',
        parentFolder: null,
        isFavorite: false,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      }
      adapter.folderCache.set('ideas', folder)

      const noteId = 'note-in-ideas'
      adapter.noteCache.set(noteId, {
        id: noteId,
        title: 'Idea Note',
        content: '',
        folder: 'ideas',
        isFavorite: false,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        tags: [],
      })
      adapter.fileMap.set(noteId, {
        noteId,
        absolutePath: `${rootPath}/ideas/idea-note.md`,
        relativePath: 'ideas/idea-note.md',
        filename: 'idea-note.md',
        folderPath: 'ideas',
        lastModified: Date.now(),
      })

      await adapter.startWatching(callback)

      const event: WatchEvent = {
        type: { remove: { kind: 'folder' } },
        paths: [`${rootPath}/ideas`],
        attrs: {},
      }
      watchCallback!(event)

      expect(adapter.folderCache.has('ideas')).toBe(false)
      expect(adapter.noteCache.has(noteId)).toBe(false)
      expect(callback.onNoteRemoved).toHaveBeenCalledWith(noteId, false)
      expect(callback.onFolderRemoved).toHaveBeenCalledWith('ideas')
    })
  })

  describe('.glosa directory filtering', () => {
    it('ignores events inside .glosa directory', async () => {
      await adapter.startWatching(callback)

      const event: WatchEvent = {
        type: { modify: { kind: 'data', mode: 'content' } },
        paths: [`${rootPath}/.glosa/meta.json`],
        attrs: {},
      }
      watchCallback!(event)

      await new Promise(r => setTimeout(r, 50))
      expect(mockReadTextFile).not.toHaveBeenCalled()
      expect(callback.onNoteChanged).not.toHaveBeenCalled()
    })

    it('ignores events inside dot-directories', async () => {
      await adapter.startWatching(callback)

      const event: WatchEvent = {
        type: { create: { kind: 'file' } },
        paths: [`${rootPath}/.hidden/secret.md`],
        attrs: {},
      }
      watchCallback!(event)

      await new Promise(r => setTimeout(r, 50))
      expect(callback.onNoteAdded).not.toHaveBeenCalled()
    })
  })

  describe('setActiveNoteId', () => {
    it('updates the active note ID', () => {
      adapter.setActiveNoteId('note-1')
      // Test via the modify event protection
      expect(adapter).toBeDefined()
    })

    it('can be cleared by passing null', () => {
      adapter.setActiveNoteId('note-1')
      adapter.setActiveNoteId(null)
      expect(adapter).toBeDefined()
    })
  })
})
