import { describe, it, expect } from 'vitest'
import type { Note, Folder } from '@/types'
import {
  matches,
  filterNotes,
  filterFolders,
  filterTags,
  extractSnippet,
  groupResults,
} from './useSearch'

function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    id: crypto.randomUUID(),
    title: 'Test Note',
    content: 'Some content here',
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

describe('matches', () => {
  it('returns true for case-insensitive substring match', () => {
    expect(matches('Hello World', 'hello')).toBe(true)
    expect(matches('Hello World', 'WORLD')).toBe(true)
    expect(matches('Hello World', 'lo Wo')).toBe(true)
  })

  it('returns false when substring is not found', () => {
    expect(matches('Hello World', 'xyz')).toBe(false)
    expect(matches('Hello', 'Hello World')).toBe(false)
  })

  it('handles empty strings', () => {
    expect(matches('Hello', '')).toBe(true)
    expect(matches('', 'hello')).toBe(false)
    expect(matches('', '')).toBe(true)
  })
})

describe('filterNotes', () => {
  it('returns empty array for empty query', () => {
    const notes = [makeNote({ title: 'Test' })]
    expect(filterNotes(notes, '')).toEqual([])
  })

  it('filters notes by title', () => {
    const notes = [
      makeNote({ id: '1', title: 'JavaScript basics' }),
      makeNote({ id: '2', title: 'Python tutorial' }),
    ]
    const results = filterNotes(notes, 'java')
    expect(results).toHaveLength(1)
    expect(results[0]!.id).toBe('1')
    expect(results[0]!.type).toBe('note')
  })

  it('filters notes by content', () => {
    const notes = [
      makeNote({ id: '1', title: 'Note A', content: 'Learn about TypeScript' }),
      makeNote({ id: '2', title: 'Note B', content: 'Learn about cooking' }),
    ]
    const results = filterNotes(notes, 'typescript')
    expect(results).toHaveLength(1)
    expect(results[0]!.id).toBe('1')
  })

  it('filters notes by tags', () => {
    const notes = [
      makeNote({ id: '1', title: 'Note A', tags: ['vue', 'frontend'] }),
      makeNote({ id: '2', title: 'Note B', tags: ['backend', 'python'] }),
    ]
    const results = filterNotes(notes, 'vue')
    expect(results).toHaveLength(1)
    expect(results[0]!.id).toBe('1')
  })

  it('returns correct SearchResultNote shape', () => {
    const notes = [makeNote({ id: 'abc', title: 'My Note', emoji: '📝', content: 'Hello world' })]
    const results = filterNotes(notes, 'hello')
    expect(results[0]).toMatchObject({
      type: 'note',
      id: 'abc',
      title: 'My Note',
      emoji: '📝',
      route: { name: 'editor', params: { id: 'abc' } },
    })
    expect(results[0]!.snippet).toBeDefined()
  })

  it('matches across multiple fields (note included once)', () => {
    const notes = [makeNote({ id: '1', title: 'Vue guide', content: 'Learn Vue', tags: ['vue'] })]
    const results = filterNotes(notes, 'vue')
    expect(results).toHaveLength(1)
  })
})

describe('filterFolders', () => {
  it('returns empty array for empty query', () => {
    const folders = [makeFolder({ name: 'Projects' })]
    expect(filterFolders(folders, '')).toEqual([])
  })

  it('filters folders by name', () => {
    const folders = [
      makeFolder({ id: '1', name: 'Projects' }),
      makeFolder({ id: '2', name: 'Archive' }),
    ]
    const results = filterFolders(folders, 'proj')
    expect(results).toHaveLength(1)
    expect(results[0]!.id).toBe('1')
    expect(results[0]!.type).toBe('folder')
  })

  it('returns correct SearchResultFolder shape', () => {
    const folders = [makeFolder({ id: 'f1', name: 'Ideas' })]
    const results = filterFolders(folders, 'ideas')
    expect(results[0]).toMatchObject({
      type: 'folder',
      id: 'f1',
      name: 'Ideas',
      parentPath: null,
      route: { name: 'explorer-folder', params: { path: 'Ideas' } },
    })
  })

  it('resolves parent folder name for parentPath', () => {
    const folders = [
      makeFolder({ id: 'parent', name: 'Projects' }),
      makeFolder({ id: 'child', name: 'Frontend', parentFolder: 'parent' }),
    ]
    const results = filterFolders(folders, 'frontend')
    expect(results[0]!.parentPath).toBe('Projects')
    expect(results[0]!.route.params.path).toBe('Projects/Frontend')
  })

  it('handles deeply nested folder paths', () => {
    const folders = [
      makeFolder({ id: 'root', name: 'Work' }),
      makeFolder({ id: 'mid', name: 'Projects', parentFolder: 'root' }),
      makeFolder({ id: 'leaf', name: 'Frontend', parentFolder: 'mid' }),
    ]
    const results = filterFolders(folders, 'frontend')
    expect(results[0]!.parentPath).toBe('Projects')
    expect(results[0]!.route.params.path).toBe('Work/Projects/Frontend')
  })
})

describe('filterTags', () => {
  it('returns empty array for empty query', () => {
    const notes = [makeNote({ tags: ['vue'] })]
    expect(filterTags(notes, '')).toEqual([])
  })

  it('extracts unique tags and filters by query', () => {
    const notes = [
      makeNote({ tags: ['vue', 'frontend'] }),
      makeNote({ tags: ['vue', 'typescript'] }),
      makeNote({ tags: ['backend'] }),
    ]
    const results = filterTags(notes, 'vue')
    expect(results).toHaveLength(1)
    expect(results[0]).toEqual({ type: 'tag', name: 'vue', noteCount: 2 })
  })

  it('counts notes correctly for each tag', () => {
    const notes = [
      makeNote({ tags: ['javascript'] }),
      makeNote({ tags: ['javascript'] }),
      makeNote({ tags: ['javascript'] }),
    ]
    const results = filterTags(notes, 'javascript')
    expect(results[0]!.noteCount).toBe(3)
  })

  it('returns multiple matching tags', () => {
    const notes = [
      makeNote({ tags: ['frontend-vue', 'frontend-react'] }),
    ]
    const results = filterTags(notes, 'frontend')
    expect(results).toHaveLength(2)
  })

  it('handles notes with no tags', () => {
    const notes = [makeNote({ tags: [] })]
    const results = filterTags(notes, 'anything')
    expect(results).toEqual([])
  })
})

describe('extractSnippet', () => {
  it('returns empty string for empty content', () => {
    expect(extractSnippet('', 'query')).toBe('')
  })

  it('returns empty string for empty query', () => {
    expect(extractSnippet('some content', '')).toBe('')
  })

  it('returns snippet around match with context', () => {
    const content = 'This is a long text that contains the word TypeScript in the middle of the sentence'
    const snippet = extractSnippet(content, 'TypeScript')
    expect(snippet.toLowerCase()).toContain('typescript')
  })

  it('adds ... prefix when match is not at start', () => {
    const content = 'A'.repeat(50) + 'MATCH' + 'B'.repeat(50)
    const snippet = extractSnippet(content, 'MATCH')
    expect(snippet.startsWith('...')).toBe(true)
  })

  it('adds ... suffix when match is not at end', () => {
    const content = 'A'.repeat(50) + 'MATCH' + 'B'.repeat(50)
    const snippet = extractSnippet(content, 'MATCH')
    expect(snippet.endsWith('...')).toBe(true)
  })

  it('does not add ... when match is at the beginning', () => {
    const content = 'MATCH' + 'B'.repeat(50)
    const snippet = extractSnippet(content, 'MATCH')
    expect(snippet.startsWith('...')).toBe(false)
  })

  it('does not add ... when content is short enough', () => {
    const content = 'Short MATCH text'
    const snippet = extractSnippet(content, 'MATCH')
    expect(snippet).not.toContain('...')
  })

  it('returns truncated content when query not found in content', () => {
    const content = 'A'.repeat(100)
    const snippet = extractSnippet(content, 'xyz')
    expect(snippet.endsWith('...')).toBe(true)
    expect(snippet.length).toBeLessThan(content.length)
  })

  it('respects custom contextChars parameter', () => {
    const content = 'A'.repeat(100) + 'MATCH' + 'B'.repeat(100)
    const snippet = extractSnippet(content, 'MATCH', 10)
    // 3 (prefix ...) + 10 (before) + 5 (MATCH) + 10 (after) + 3 (suffix ...) = 31
    expect(snippet.length).toBeLessThanOrEqual(31)
  })
})

describe('groupResults', () => {
  it('returns empty groups when no results', () => {
    const result = groupResults([], [], [])
    expect(result.groups).toEqual([])
    expect(result.hasResults).toBe(false)
  })

  it('groups results by type', () => {
    const notes = [{ type: 'note' as const, id: '1', title: 'N', emoji: undefined, snippet: '', route: { name: 'editor', params: { id: '1' } } }]
    const folders = [{ type: 'folder' as const, id: '1', name: 'F', parentPath: null, route: { name: 'explorer-folder', params: { path: 'F' } } }]
    const tags = [{ type: 'tag' as const, name: 'T', noteCount: 1 }]

    const result = groupResults(notes, folders, tags)
    expect(result.groups).toHaveLength(3)
    expect(result.groups[0]!.type).toBe('note')
    expect(result.groups[1]!.type).toBe('folder')
    expect(result.groups[2]!.type).toBe('tag')
    expect(result.hasResults).toBe(true)
  })

  it('caps items at maxPerGroup (default 5)', () => {
    const notes = Array.from({ length: 10 }, (_, i) => ({
      type: 'note' as const,
      id: String(i),
      title: `Note ${i}`,
      emoji: undefined,
      snippet: '',
      route: { name: 'editor', params: { id: String(i) } },
    }))

    const result = groupResults(notes, [], [])
    expect(result.groups[0]!.items).toHaveLength(5)
    expect(result.groups[0]!.total).toBe(10)
  })

  it('accepts custom maxPerGroup', () => {
    const notes = Array.from({ length: 10 }, (_, i) => ({
      type: 'note' as const,
      id: String(i),
      title: `Note ${i}`,
      emoji: undefined,
      snippet: '',
      route: { name: 'editor', params: { id: String(i) } },
    }))

    const result = groupResults(notes, [], [], 3)
    expect(result.groups[0]!.items).toHaveLength(3)
    expect(result.groups[0]!.total).toBe(10)
  })

  it('excludes empty groups', () => {
    const notes = [{ type: 'note' as const, id: '1', title: 'N', emoji: undefined, snippet: '', route: { name: 'editor', params: { id: '1' } } }]
    const result = groupResults(notes, [], [])
    expect(result.groups).toHaveLength(1)
    expect(result.groups[0]!.type).toBe('note')
  })

  it('preserves query in result', () => {
    const result = groupResults([], [], [], 5, 'test query')
    expect(result.query).toBe('test query')
  })
})

import { vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { ref } from 'vue'
import { useSearch } from './useSearch'
import { useNotesStore } from '@/stores/notes'
import { useFoldersStore } from '@/stores/folders'

const mockPush = vi.fn()

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

describe('useSearch - keyboard navigation', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockPush.mockClear()
  })

  describe('navigateDown', () => {
    it('does nothing when flatResults is empty', () => {
      const { navigateDown, highlightedIndex } = useSearch()
      navigateDown()
      expect(highlightedIndex.value).toBe(-1)
    })

    it('moves highlightedIndex from -1 to 0 on first call', async () => {
      const notesStore = useNotesStore()
      notesStore.notes = [makeNote({ id: '1', title: 'Search me' })]

      const { navigateDown, highlightedIndex, query, flatResults } = useSearch()
      query.value = 'search'

      // Wait for debounce
      await vi.waitFor(() => {
        expect(flatResults.value.length).toBeGreaterThan(0)
      }, { timeout: 500 })

      navigateDown()
      expect(highlightedIndex.value).toBe(0)
    })

    it('wraps from last index to 0 (circular)', async () => {
      const notesStore = useNotesStore()
      notesStore.notes = [
        makeNote({ id: '1', title: 'Alpha search' }),
        makeNote({ id: '2', title: 'Beta search' }),
      ]

      const { navigateDown, highlightedIndex, query, flatResults } = useSearch()
      query.value = 'search'

      await vi.waitFor(() => {
        expect(flatResults.value.length).toBe(2)
      }, { timeout: 500 })

      navigateDown() // 0
      navigateDown() // 1
      navigateDown() // wraps to 0
      expect(highlightedIndex.value).toBe(0)
    })
  })

  describe('navigateUp', () => {
    it('does nothing when flatResults is empty', () => {
      const { navigateUp, highlightedIndex } = useSearch()
      navigateUp()
      expect(highlightedIndex.value).toBe(-1)
    })

    it('wraps from no selection to last index (circular)', async () => {
      const notesStore = useNotesStore()
      notesStore.notes = [
        makeNote({ id: '1', title: 'Alpha search' }),
        makeNote({ id: '2', title: 'Beta search' }),
        makeNote({ id: '3', title: 'Gamma search' }),
      ]

      const { navigateUp, highlightedIndex, query, flatResults } = useSearch()
      query.value = 'search'

      await vi.waitFor(() => {
        expect(flatResults.value.length).toBe(3)
      }, { timeout: 500 })

      // From -1 (no selection), ArrowUp goes to last item
      navigateUp()
      expect(highlightedIndex.value).toBe(2)
    })

    it('decrements index correctly', async () => {
      const notesStore = useNotesStore()
      notesStore.notes = [
        makeNote({ id: '1', title: 'Alpha search' }),
        makeNote({ id: '2', title: 'Beta search' }),
        makeNote({ id: '3', title: 'Gamma search' }),
      ]

      const { navigateDown, navigateUp, highlightedIndex, query, flatResults } = useSearch()
      query.value = 'search'

      await vi.waitFor(() => {
        expect(flatResults.value.length).toBe(3)
      }, { timeout: 500 })

      navigateDown() // 0
      navigateDown() // 1
      navigateUp()   // back to 0
      expect(highlightedIndex.value).toBe(0)
    })
  })

  describe('selectCurrent', () => {
    it('does nothing when highlightedIndex is -1', () => {
      const { selectCurrent } = useSearch()
      selectCurrent()
      expect(mockPush).not.toHaveBeenCalled()
    })

    it('does nothing when flatResults is empty', () => {
      const { selectCurrent, highlightedIndex } = useSearch()
      highlightedIndex.value = 0
      selectCurrent()
      expect(mockPush).not.toHaveBeenCalled()
    })

    it('navigates to highlighted item and resets state', async () => {
      const notesStore = useNotesStore()
      notesStore.notes = [makeNote({ id: 'note-1', title: 'Search target' })]

      const { navigateDown, selectCurrent, query, isActive, highlightedIndex, flatResults } = useSearch()
      query.value = 'search'

      await vi.waitFor(() => {
        expect(flatResults.value.length).toBeGreaterThan(0)
      }, { timeout: 500 })

      navigateDown() // highlight first item
      selectCurrent()

      expect(mockPush).toHaveBeenCalledWith({ name: 'editor', params: { id: 'note-1' } })
      expect(query.value).toBe('')
      expect(isActive.value).toBe(false)
      expect(highlightedIndex.value).toBe(-1)
    })
  })

  describe('selectItem', () => {
    it('navigates to editor route for notes', () => {
      const { selectItem } = useSearch()
      selectItem({
        type: 'note',
        id: 'abc',
        title: 'My Note',
        snippet: '',
        route: { name: 'editor', params: { id: 'abc' } },
      })
      expect(mockPush).toHaveBeenCalledWith({ name: 'editor', params: { id: 'abc' } })
    })

    it('navigates to explorer-folder route for folders', () => {
      const { selectItem } = useSearch()
      selectItem({
        type: 'folder',
        id: 'f1',
        name: 'Projects',
        parentPath: null,
        route: { name: 'explorer-folder', params: { path: 'Projects' } },
      })
      expect(mockPush).toHaveBeenCalledWith({ name: 'explorer-folder', params: { path: 'Projects' } })
    })

    it('navigates to tag-view route for tags', () => {
      const { selectItem } = useSearch()
      selectItem({
        type: 'tag',
        name: 'vue',
        noteCount: 3,
      })
      expect(mockPush).toHaveBeenCalledWith({ name: 'tag-view', params: { tag: 'vue' } })
    })

    it('resets search state after navigation', () => {
      const { selectItem, query, isActive, highlightedIndex } = useSearch()
      query.value = 'something'
      isActive.value = true
      highlightedIndex.value = 2

      selectItem({ type: 'tag', name: 'test', noteCount: 1 })

      expect(query.value).toBe('')
      expect(isActive.value).toBe(false)
      expect(highlightedIndex.value).toBe(-1)
    })
  })
})
