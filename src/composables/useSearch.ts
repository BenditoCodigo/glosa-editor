import { ref, computed, watchEffect, watch, onWatcherCleanup } from 'vue'
import { useRouter } from 'vue-router'
import { useNotesStore } from '@/stores/notes'
import { useFoldersStore } from '@/stores/folders'
import type {
  Note,
  Folder,
  SearchResultNote,
  SearchResultFolder,
  SearchResultTag,
  SearchResultItem,
  SearchResults,
} from '@/types'

/** Normalize text: lowercase and strip diacritics (accents) */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

/** Case-insensitive, accent-insensitive substring match */
export function matches(text: string, query: string): boolean {
  return normalize(text).includes(normalize(query))
}

/** Filter notes where query matches title, content, or any tag */
export function filterNotes(
  notes: Note[],
  query: string,
  _folders: Folder[] = [],
): SearchResultNote[] {
  if (!query) return []

  return notes
    .filter((note) => {
      return (
        matches(note.title, query) ||
        matches(note.content, query) ||
        note.tags.some((tag) => matches(tag, query))
      )
    })
    .map((note) => ({
      type: 'note' as const,
      id: note.id,
      title: note.title,
      emoji: note.emoji,
      snippet: extractSnippet(note.content, query),
      route: { name: 'editor', params: { id: note.id } },
    }))
}

/** Filter folders where query matches folder name */
export function filterFolders(folders: Folder[], query: string): SearchResultFolder[] {
  if (!query) return []

  return folders
    .filter((folder) => matches(folder.name, query))
    .map((folder) => {
      const parentPath = resolveParentPath(folder, folders)
      const fullPath = buildFolderPath(folder, folders)

      return {
        type: 'folder' as const,
        id: folder.id,
        name: folder.name,
        parentPath,
        route: { name: 'explorer-folder', params: { path: fullPath } },
      }
    })
}

/** Extract unique tags from all notes, filter by query, count usage */
export function filterTags(notes: Note[], query: string): SearchResultTag[] {
  if (!query) return []

  const tagCounts = new Map<string, number>()

  for (const note of notes) {
    for (const tag of note.tags) {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1)
    }
  }

  const results: SearchResultTag[] = []

  for (const [name, noteCount] of tagCounts) {
    if (matches(name, query)) {
      results.push({ type: 'tag', name, noteCount })
    }
  }

  return results
}

/**
 * Extract snippet from content around first match occurrence.
 * Shows ~60 characters of context (30 before + query + 30 after),
 * trimmed with "..." if needed.
 */
export function extractSnippet(content: string, query: string, contextChars: number = 30): string {
  if (!content || !query) return ''

  const normalizedContent = normalize(content)
  const normalizedQuery = normalize(query)
  const matchIndex = normalizedContent.indexOf(normalizedQuery)

  if (matchIndex === -1) {
    return content.length > contextChars * 2 + query.length
      ? content.slice(0, contextChars * 2) + '...'
      : content
  }

  const start = Math.max(0, matchIndex - contextChars)
  const end = Math.min(content.length, matchIndex + query.length + contextChars)

  let snippet = content.slice(start, end)

  if (start > 0) {
    snippet = '...' + snippet
  }
  if (end < content.length) {
    snippet = snippet + '...'
  }

  return snippet
}

/** Group results, cap at maxPerGroup, include totals */
export function groupResults(
  notes: SearchResultNote[],
  folders: SearchResultFolder[],
  tags: SearchResultTag[],
  maxPerGroup: number = 5,
  query: string = '',
): SearchResults {
  const groups: SearchResults['groups'] = []

  if (notes.length > 0) {
    groups.push({
      type: 'note',
      label: 'Notas',
      items: notes.slice(0, maxPerGroup),
      total: notes.length,
    })
  }

  if (folders.length > 0) {
    groups.push({
      type: 'folder',
      label: 'Carpetas',
      items: folders.slice(0, maxPerGroup),
      total: folders.length,
    })
  }

  if (tags.length > 0) {
    groups.push({
      type: 'tag',
      label: 'Etiquetas',
      items: tags.slice(0, maxPerGroup),
      total: tags.length,
    })
  }

  return {
    groups,
    hasResults: groups.length > 0,
    query,
  }
}

/** Resolve parent folder name for display. Returns null if no parent. */
function resolveParentPath(folder: Folder, allFolders: Folder[]): string | null {
  if (!folder.parentFolder) return null

  const parent = allFolders.find((f) => f.id === folder.parentFolder)
  return parent ? parent.name : null
}

/** Build full path string for folder route (e.g., "parent/child") */
function buildFolderPath(folder: Folder, allFolders: Folder[]): string {
  const path: string[] = []
  let currentId: string | null = folder.id

  while (currentId) {
    const current = allFolders.find((f) => f.id === currentId)
    if (!current) break
    path.unshift(current.name)
    currentId = current.parentFolder
  }

  return path.join('/')
}

/** Reactive search composable with debounce and grouped results */
export function useSearch() {
  const router = useRouter()
  const notesStore = useNotesStore()
  const foldersStore = useFoldersStore()

  const query = ref('')
  const isActive = ref(false)
  const highlightedIndex = ref(-1)
  const debouncedQuery = ref('')

  // Debounce: watch query and update debouncedQuery after 250ms
  watchEffect(() => {
    const currentQuery = query.value

    if (currentQuery.length >= 1) {
      const timeout = setTimeout(() => {
        debouncedQuery.value = currentQuery
      }, 250)

      onWatcherCleanup(() => {
        clearTimeout(timeout)
      })
    } else {
      debouncedQuery.value = ''
    }
  })

  const groupedResults = computed<SearchResults>(() => {
    const q = debouncedQuery.value
    if (!q) {
      return { groups: [], hasResults: false, query: '' }
    }

    const notes = filterNotes(notesStore.notes, q, foldersStore.folders)
    const folders = filterFolders(foldersStore.folders, q)
    const tags = filterTags(notesStore.notes, q)

    return groupResults(notes, folders, tags, 5, q)
  })

  const flatResults = computed<SearchResultItem[]>(() => {
    return groupedResults.value.groups.flatMap((group) => group.items)
  })

  const totalResults = computed<number>(() => {
    return groupedResults.value.groups.reduce((sum, group) => sum + group.total, 0)
  })

  // Reset highlightedIndex when results change
  watch(groupedResults, () => {
    highlightedIndex.value = -1
  })

  function activate() {
    isActive.value = true
  }

  function deactivate() {
    isActive.value = false
    highlightedIndex.value = -1
  }

  function reset() {
    query.value = ''
    isActive.value = false
    highlightedIndex.value = -1
  }

  function navigateDown() {
    if (flatResults.value.length === 0) return
    highlightedIndex.value = (highlightedIndex.value + 1) % flatResults.value.length
  }

  function navigateUp() {
    if (flatResults.value.length === 0) return
    if (highlightedIndex.value <= 0) {
      highlightedIndex.value = flatResults.value.length - 1
    } else {
      highlightedIndex.value = highlightedIndex.value - 1
    }
  }

  function selectCurrent() {
    if (highlightedIndex.value === -1 || flatResults.value.length === 0) return
    selectItem(flatResults.value[highlightedIndex.value]!)
  }

  function selectItem(item: SearchResultItem) {
    switch (item.type) {
      case 'note':
        router.push({ name: 'editor', params: { id: item.id } })
        break
      case 'folder':
        router.push({ name: 'explorer-folder', params: { path: item.route.params.path } })
        break
      case 'tag':
        router.push({ name: 'tag-view', params: { tag: item.name } })
        break
    }

    reset()
  }

  return {
    query,
    isActive,
    highlightedIndex,
    groupedResults,
    totalResults,
    flatResults,
    activate,
    deactivate,
    reset,
    navigateDown,
    navigateUp,
    selectCurrent,
    selectItem,
  }
}
