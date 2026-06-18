import Dexie, { type EntityTable } from 'dexie'
import type { Note } from '@/types/note'
import type { Folder } from '@/types/folder'
import type { ActivityEvent } from '@/types/activity'

const db = new Dexie('libreta-abierta') as Dexie & {
  notes: EntityTable<Note, 'id'>
  folders: EntityTable<Folder, 'id'>
  activity: EntityTable<ActivityEvent, 'id'>
}

db.version(1).stores({
  notes: 'id, title, folder, isFavorite, createdAt, updatedAt',
  folders: 'id, name, parentFolder, isFavorite, createdAt, updatedAt',
})

db.version(2).stores({
  notes: 'id, title, folder, isFavorite, createdAt, updatedAt',
  folders: 'id, name, parentFolder, isFavorite, createdAt, updatedAt',
  activity: 'id, targetId, targetType, action, timestamp',
})

export { db }
