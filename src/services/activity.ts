import { db } from './db'
import type { ActivityEvent } from '@/types/activity'

export async function trackActivity(
  targetId: string,
  targetType: 'note' | 'folder',
  action: 'open' | 'edit' | 'save',
): Promise<void> {
  const event: ActivityEvent = {
    id: crypto.randomUUID(),
    targetId,
    targetType,
    action,
    timestamp: new Date().toISOString(),
  }
  await db.activity.put(JSON.parse(JSON.stringify(event)))
}

export async function getMostActiveNote(sinceDays: number): Promise<string | null> {
  const since = new Date()
  since.setDate(since.getDate() - sinceDays)
  const sinceISO = since.toISOString()

  const events = await db.activity
    .where('targetType')
    .equals('note')
    .and((e) => e.timestamp >= sinceISO)
    .toArray()

  if (events.length === 0) return null

  const counts = new Map<string, number>()
  for (const event of events) {
    counts.set(event.targetId, (counts.get(event.targetId) || 0) + 1)
  }

  let maxId: string | null = null
  let maxCount = 0
  for (const [id, count] of counts) {
    if (count > maxCount) {
      maxCount = count
      maxId = id
    }
  }

  return maxId
}

export async function getMostActiveFolder(sinceDays: number): Promise<string | null> {
  const since = new Date()
  since.setDate(since.getDate() - sinceDays)
  const sinceISO = since.toISOString()

  const events = await db.activity
    .where('targetType')
    .equals('folder')
    .and((e) => e.timestamp >= sinceISO)
    .toArray()

  if (events.length === 0) return null

  const counts = new Map<string, number>()
  for (const event of events) {
    counts.set(event.targetId, (counts.get(event.targetId) || 0) + 1)
  }

  let maxId: string | null = null
  let maxCount = 0
  for (const [id, count] of counts) {
    if (count > maxCount) {
      maxCount = count
      maxId = id
    }
  }

  return maxId
}

export async function getRecentlyActiveNotes(limit: number): Promise<string[]> {
  const events = await db.activity.where('targetType').equals('note').reverse().sortBy('timestamp')

  const seen = new Set<string>()
  const result: string[] = []

  for (const event of events) {
    if (!seen.has(event.targetId)) {
      seen.add(event.targetId)
      result.push(event.targetId)
      if (result.length >= limit) break
    }
  }

  return result
}
