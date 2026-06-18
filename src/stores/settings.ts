import { ref, computed, watch } from 'vue'
import { defineStore } from 'pinia'
import type { AppSettings, UserProfile, EditorSettings, ThemeMode, StorageProvider } from '@/types'
import { DEFAULT_SETTINGS } from '@/types'

const STORAGE_KEY = 'glosa-settings'

function loadFromStorage(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AppSettings>
      return { ...DEFAULT_SETTINGS, ...parsed }
    }
  } catch {
    // Corrupted data, use defaults
  }
  return { ...DEFAULT_SETTINGS }
}

function saveToStorage(settings: AppSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<AppSettings>(loadFromStorage())

  // Derived state
  const profile = computed(() => settings.value.profile)
  const theme = computed(() => settings.value.theme)
  const storageProvider = computed(() => settings.value.storageProvider)
  const editor = computed(() => settings.value.editor)

  const userInitial = computed(() => {
    const name = settings.value.profile.username.trim()
    return name ? name.charAt(0).toUpperCase() : 'U'
  })

  // Persist on every change
  watch(settings, (val) => saveToStorage(val), { deep: true })

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

  function resetAll() {
    settings.value = { ...DEFAULT_SETTINGS }
  }

  return {
    settings,
    profile,
    theme,
    storageProvider,
    editor,
    userInitial,
    updateProfile,
    setTheme,
    setStorageProvider,
    updateEditor,
    resetAll,
  }
})
