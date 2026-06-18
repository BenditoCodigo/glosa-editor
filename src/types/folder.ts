export interface Folder {
  id: string
  name: string
  parentFolder: string | null
  isFavorite: boolean
  createdAt: string
  updatedAt: string
}
