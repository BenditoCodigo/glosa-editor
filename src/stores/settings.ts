import { ref, computed, watch } from 'vue'
import { defineStore } from 'pinia'
import type { AppSettings, UserProfile, EditorSettings, ThemeMode, StorageProvider, AISettings, AIModelParameters, AICustomHeader } from '@/types'
import { DEFAULT_SETTINGS, DEFAULT_AI_SETTINGS, DEFAULT_AI_MODEL_PARAMETERS } from '@/types'
import { isTauri } from '@/utils/tauri'

const STORAGE_KEY = 'glosa-settings'

function loadFromStorage(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AppSettings>
      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        ai: { ...DEFAULT_AI_SETTINGS, ...(parsed.ai ?? {}), modelParameters: { ...DEFAULT_AI_MODEL_PARAMETERS, ...(parsed.ai?.modelParameters ?? {}) } },
      }
    }
  } catch {
    // Corrupted data, use defaults
  }
  return { ...DEFAULT_SETTINGS }
}

function saveToStorage(settings: AppSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}

function resolveEffectiveTheme(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return mode
}

function applyThemeToDocument(effective: 'light' | 'dark') {
  if (effective === 'dark') {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<AppSettings>(loadFromStorage())

  // Derived state
  const profile = computed(() => settings.value.profile)
  const theme = computed(() => settings.value.theme)
  const effectiveTheme = computed(() => resolveEffectiveTheme(settings.value.theme))
  const storageProvider = computed(() => settings.value.storageProvider)
  const editor = computed(() => settings.value.editor)
  const filesystemPath = computed(() => settings.value.filesystemPath)
  const ai = computed(() => settings.value.ai)

  // Tauri detection — true only when running inside Tauri desktop app
  const isFileSystemSupported = computed(() => isTauri())

  const userInitial = computed(() => {
    const name = settings.value.profile.username.trim()
    return name ? name.charAt(0).toUpperCase() : 'U'
  })

  // Validate: if storageProvider is 'filesystem' but not in Tauri, fall back
  if (settings.value.storageProvider === 'filesystem' && !isTauri()) {
    settings.value.storageProvider = 'indexeddb'
    settings.value.filesystemPath = null
  }

  // Persist on every change
  watch(settings, (val) => saveToStorage(val), { deep: true })

  // Apply theme whenever theme setting changes
  watch(theme, () => {
    applyThemeToDocument(effectiveTheme.value)
  }, { immediate: true })

  // Listen for system theme changes when mode is 'system'
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  mediaQuery.addEventListener('change', () => {
    if (settings.value.theme === 'system') {
      applyThemeToDocument(resolveEffectiveTheme('system'))
    }
  })

  // Actions
  function updateProfile(partial: Partial<UserProfile>) {
    settings.value.profile = { ...settings.value.profile, ...partial }
  }

  function setTheme(mode: ThemeMode) {
    settings.value.theme = mode
  }

  function setStorageProvider(provider: StorageProvider) {
    settings.value.storageProvider = provider
  }

  function updateEditor(partial: Partial<EditorSettings>) {
    settings.value.editor = { ...settings.value.editor, ...partial }
  }

  function updateAI(partial: Partial<AISettings>) {
    settings.value = {
      ...settings.value,
      ai: { ...settings.value.ai, ...partial },
    }
  }

  function updateAIModelParameters(partial: Partial<AIModelParameters>) {
    settings.value = {
      ...settings.value,
      ai: {
        ...settings.value.ai,
        modelParameters: { ...settings.value.ai.modelParameters, ...partial },
      },
    }
  }

  function resetAIModelParameters() {
    settings.value = {
      ...settings.value,
      ai: {
        ...settings.value.ai,
        modelParameters: { ...DEFAULT_AI_MODEL_PARAMETERS },
      },
    }
  }

  function addAIHeader() {
    settings.value = {
      ...settings.value,
      ai: {
        ...settings.value.ai,
        headers: [...settings.value.ai.headers, { key: '', value: '' }],
      },
    }
  }

  function updateAIHeader(index: number, header: AICustomHeader) {
    const headers = [...settings.value.ai.headers]
    headers[index] = header
    settings.value = {
      ...settings.value,
      ai: { ...settings.value.ai, headers },
    }
  }

  function removeAIHeader(index: number) {
    const headers = settings.value.ai.headers.filter((_, i) => i !== index)
    settings.value = {
      ...settings.value,
      ai: { ...settings.value.ai, headers },
    }
  }

  /**
   * Result of selecting a filesystem folder.
   * If `needsMigration` is true, the caller should show the migration modal
   * instead of activating the adapter directly.
   */
  interface SelectFolderResult {
    path: string
    needsMigration: boolean
    noteCount: number
  }

  /**
   * Opens Tauri's native folder picker dialog, stores the selected path,
   * and determines whether a migration dialog is needed.
   *
   * Returns null if cancelled/failed, or a result object with the selected path
   * and whether migration is needed (first-time link with existing notes).
   */
  async function selectFilesystemFolder(): Promise<SelectFolderResult | null> {
    if (!isTauri()) return null

    const previousProvider = settings.value.storageProvider
    const previousPath = settings.value.filesystemPath
    const { open } = await import('@tauri-apps/plugin-dialog')

    const selected = await open({
      directory: true,
      multiple: false,
      title: 'Seleccionar carpeta para notas',
    })

    if (selected === null) {
      // User cancelled — revert to previous provider
      settings.value.storageProvider = previousProvider
      return null
    }

    // Determine if this is a first-time link (no previous filesystemPath)
    const isFirstTimeLink = previousPath === null || previousPath === undefined

    // Store the selected path and set provider to filesystem
    settings.value.filesystemPath = selected
    settings.value.storageProvider = 'filesystem'

    if (isFirstTimeLink) {
      // Check how many notes exist in IndexedDB
      const { db } = await import('@/services/db')
      const noteCount = await db.notes.count()

      if (noteCount > 0) {
        // Needs migration dialog — don't activate adapter yet
        return { path: selected, needsMigration: true, noteCount }
      }
    }

    // No migration needed — activate directly (zero notes or re-linking)
    try {
      const { activateFilesystemAdapter, startFilesystemWatcher } = await import('@/services/activateFilesystemAdapter')
      const adapter = await activateFilesystemAdapter(selected)

      // Reload stores with data from the new adapter
      const { useNotesStore } = await import('@/stores/notes')
      const { useFoldersStore } = await import('@/stores/folders')
      const notesStore = useNotesStore()
      const foldersStore = useFoldersStore()
      await Promise.all([notesStore.loadAll(), foldersStore.loadAll()])

      // Start watching for external changes
      await startFilesystemWatcher(adapter, {
        onNoteChanged(note) {
          const idx = notesStore.notes.findIndex(n => n.id === note.id)
          if (idx !== -1) notesStore.notes[idx] = note
        },
        onNoteRemoved(noteId, wasActive) {
          notesStore.notes = notesStore.notes.filter(n => n.id !== noteId)
          if (wasActive) notesStore.activeNote = null
        },
        onNoteAdded(note) {
          if (!notesStore.notes.find(n => n.id === note.id)) {
            notesStore.notes.push(note)
          }
        },
        onFolderAdded(folder) {
          if (!foldersStore.folders.find(f => f.id === folder.id)) {
            foldersStore.folders.push(folder)
          }
        },
        onFolderRemoved(folderId) {
          foldersStore.folders = foldersStore.folders.filter(f => f.id !== folderId && !f.id.startsWith(`${folderId}/`))
        },
      })
    } catch (err) {
      // Initialization failed — revert settings
      console.warn('[Glosa] No se pudo activar la carpeta seleccionada:', err)
      settings.value.filesystemPath = previousPath
      settings.value.storageProvider = previousProvider
      return null
    }

    return { path: selected, needsMigration: false, noteCount: 0 }
  }

  /**
   * Completes the migration process after the user picks an option in the modal.
   * Reloads stores with data from the active adapter.
   */
  async function completeMigration(): Promise<void> {
    const { useNotesStore } = await import('@/stores/notes')
    const { useFoldersStore } = await import('@/stores/folders')
    const notesStore = useNotesStore()
    const foldersStore = useFoldersStore()
    await Promise.all([notesStore.loadAll(), foldersStore.loadAll()])
  }

  /**
   * Reverts settings when migration is cancelled.
   */
  function cancelMigration(previousPath: string | null, previousProvider: StorageProvider) {
    settings.value.filesystemPath = previousPath
    settings.value.storageProvider = previousProvider
  }

  /**
   * Clears the linked filesystem folder, reverts to IndexedDB adapter, and reloads stores.
   */
  async function clearFilesystemPath() {
    // Stop file watcher if active
    const { getAdapter } = await import('@/services/storage')
    const { FilesystemAdapter } = await import('@/services/adapters/filesystem')
    const currentAdapter = getAdapter()
    if (currentAdapter instanceof FilesystemAdapter) {
      currentAdapter.stopWatching()
    }

    settings.value.filesystemPath = null
    settings.value.storageProvider = 'indexeddb'

    // Reset adapter back to IndexedDB
    const { IndexedDBAdapter } = await import('@/services/adapters/indexeddb')
    const { setAdapter } = await import('@/services/storage')
    setAdapter(new IndexedDBAdapter())

    // Reload stores with IndexedDB data
    const { useNotesStore } = await import('@/stores/notes')
    const { useFoldersStore } = await import('@/stores/folders')
    const notesStore = useNotesStore()
    const foldersStore = useFoldersStore()
    await Promise.all([notesStore.loadAll(), foldersStore.loadAll()])
  }

  function resetAll() {
    settings.value = { ...DEFAULT_SETTINGS }
  }

  return {
    settings,
    profile,
    theme,
    effectiveTheme,
    storageProvider,
    editor,
    filesystemPath,
    ai,
    isFileSystemSupported,
    userInitial,
    updateProfile,
    setTheme,
    setStorageProvider,
    updateEditor,
    updateAI,
    updateAIModelParameters,
    resetAIModelParameters,
    addAIHeader,
    updateAIHeader,
    removeAIHeader,
    selectFilesystemFolder,
    completeMigration,
    cancelMigration,
    clearFilesystemPath,
    resetAll,
  }
})
