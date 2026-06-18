import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { Note } from '@/types'
import * as storage from '@/services/storage'

export const useNotesStore = defineStore('notes', () => {
  const notes = ref<Note[]>([])
  const activeNote = ref<Note | null>(null)
  const isLoading = ref(false)

  const sortedNotes = computed(() =>
    [...notes.value].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
  )

  const favorites = computed(() =>
    notes.value.filter((n) => n.isFavorite),
  )

  function notesByFolder(folderId: string | null) {
    return notes.value.filter((n) => n.folder === folderId)
  }

  async function loadAll() {
    isLoading.value = true
    try {
      notes.value = await storage.getAllNotes()
    } finally {
      isLoading.value = false
    }
  }

  async function loadNote(id: string) {
    const note = await storage.getNoteById(id)
    activeNote.value = note ?? null
    return note
  }

  async function createNote(folder: string | null): Promise<Note> {
    const now = new Date().toISOString()
    const note: Note = {
      id: crypto.randomUUID(),
      title: 'Untitled Note',
      content: '',
      folder,
      isFavorite: false,
      createdAt: now,
      updatedAt: now,
      tags: [],
    }
    await storage.saveNote(note)
    notes.value.push(note)
    return note
  }

  async function updateNote(note: Note) {
    // Deep-clone to strip any Vue reactive proxies before persisting
    const plain = JSON.parse(JSON.stringify(note)) as Note
    plain.updatedAt = new Date().toISOString()
    await storage.saveNote(plain)
    const index = notes.value.findIndex((n) => n.id === plain.id)
    if (index !== -1) notes.value[index] = plain
    if (activeNote.value?.id === plain.id) activeNote.value = plain
  }

  async function toggleFavorite(id: string) {
    const note = notes.value.find((n) => n.id === id)
    if (!note) return
    // Deep-clone to strip reactive proxies
    const plain = JSON.parse(JSON.stringify(note)) as Note
    plain.isFavorite = !plain.isFavorite
    plain.updatedAt = new Date().toISOString()
    await storage.saveNote(plain)
    const index = notes.value.findIndex((n) => n.id === id)
    if (index !== -1) notes.value[index] = plain
  }

  async function removeNote(id: string) {
    await storage.deleteNote(id)
    notes.value = notes.value.filter((n) => n.id !== id)
    if (activeNote.value?.id === id) activeNote.value = null
  }

  return {
    notes,
    activeNote,
    isLoading,
    sortedNotes,
    favorites,
    notesByFolder,
    loadAll,
    loadNote,
    createNote,
    updateNote,
    toggleFavorite,
    removeNote,
  }
})
