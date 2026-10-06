export type WriterAnnotationColor = 'amber' | 'emerald' | 'rose' | 'indigo' | 'purple'

export interface WriterAnnotationAnchor {
  exact: string
  prefix: string
  suffix: string
  approxStartOffset: number
  blockIndex?: number
}

export interface WriterAnnotation {
  id: string
  comment: string
  createdAt: string
  updatedAt?: string
  color?: WriterAnnotationColor
  resolved?: boolean
  anchor: WriterAnnotationAnchor
}

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
  annotations?: WriterAnnotation[]
}

export interface NoteMetadata {
  id: string
  title: string
  folder: string | null
  isFavorite: boolean
  updatedAt: string
}

