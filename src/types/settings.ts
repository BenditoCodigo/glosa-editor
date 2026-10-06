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

export interface AIModelParameters {
  temperature: number // 0 - 2, default 0.7
  topP: number // 0 - 1, default 0.9
  maxTokens: number // 256 - 8192, default 2048
  frequencyPenalty: number // -2 - 2, default 0
  presencePenalty: number // -2 - 2, default 0
}

export interface AICustomHeader {
  key: string
  value: string
}

export interface AISettings {
  enabled: boolean
  baseUrl: string
  model: string
  apiKey: string
  headers: AICustomHeader[]
  systemPrompt: string
  modelParameters: AIModelParameters
}

export interface AppSettings {
  profile: UserProfile
  theme: ThemeMode
  storageProvider: StorageProvider
  editor: EditorSettings
  filesystemPath: string | null
  ai: AISettings
}

export const DEFAULT_SYSTEM_PROMPT = `Eres un asistente de escritura integrado en una aplicación de notas personales. Respondes en español de forma concisa y útil. Ayudas con redacción, resúmenes, ideas y organización de contenido.`

export const DEFAULT_AI_MODEL_PARAMETERS: AIModelParameters = {
  temperature: 0.7,
  topP: 0.9,
  maxTokens: 2048,
  frequencyPenalty: 0,
  presencePenalty: 0,
}

export const DEFAULT_AI_SETTINGS: AISettings = {
  enabled: false,
  baseUrl: '',
  model: '',
  apiKey: '',
  headers: [],
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
  modelParameters: { ...DEFAULT_AI_MODEL_PARAMETERS },
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
  filesystemPath: null,
  ai: DEFAULT_AI_SETTINGS,
}
