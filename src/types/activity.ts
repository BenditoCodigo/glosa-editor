export interface ActivityEvent {
  id: string
  targetId: string
  targetType: 'note' | 'folder'
  action: 'open' | 'edit' | 'save'
  timestamp: string
}
