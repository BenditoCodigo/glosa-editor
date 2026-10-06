export interface Note {
  id: string
  title: string
  content: string
  folder: string | null
  isFavorite: boolean
  createdAt: string
  updatedAt: string
  tags: string[]
  emoji?: string
  coverImage?: string
  description?: string
  sources?: string[]
  aiInstructions?: string
  temperature?: number
  topP?: number
}

export interface NoteMetadata {
  id: string
  title: string
  folder: string | null
  isFavorite: boolean
  updatedAt: string
}
