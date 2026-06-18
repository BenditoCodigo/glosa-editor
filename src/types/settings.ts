export type ThemeMode = 'light' | 'dark' | 'system'
export type StorageProvider = 'indexeddb' | 'filesystem' | 's3' | 'webdav'

export interface UserProfile {
  username: string
  avatarUrl: string | null
}

export interface EditorSettings {
  autosaveEnabled: boolean
  autosaveInterval: 3 | 5 | 10
  showWordCount: boolean
}

export interface AppSettings {
  profile: UserProfile
  theme: ThemeMode
  storageProvider: StorageProvider
  editor: EditorSettings
}

export const DEFAULT_SETTINGS: AppSettings = {
  profile: {
    username: '',
    avatarUrl: null,
  },
  theme: 'system',
  storageProvider: 'indexeddb',
  editor: {
    autosaveEnabled: true,
    autosaveInterval: 5,
    showWordCount: true,
  },
}
