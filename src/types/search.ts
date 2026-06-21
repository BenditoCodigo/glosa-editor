export type SearchResultType = 'note' | 'folder' | 'tag'

export interface SearchResultNote {
  type: 'note'
  id: string
  title: string
  emoji?: string
  snippet: string
  route: { name: string; params: { id: string } }
}

export interface SearchResultFolder {
  type: 'folder'
  id: string
  name: string
  parentPath: string | null
  route: { name: string; params: { path: string } }
}

export interface SearchResultTag {
  type: 'tag'
  name: string
  noteCount: number
}

export type SearchResultItem = SearchResultNote | SearchResultFolder | SearchResultTag

export interface SearchGroup {
  type: SearchResultType
  label: string
  items: SearchResultItem[]
  total: number
}

export interface SearchResults {
  groups: SearchGroup[]
  hasResults: boolean
  query: string
}
