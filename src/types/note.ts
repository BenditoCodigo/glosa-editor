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
  sources?: string[]
  aiInstructions?: string
}

export interface NoteMetadata {
  id: string
  title: string
  folder: string | null
  isFavorite: boolean
  updatedAt: string
}
