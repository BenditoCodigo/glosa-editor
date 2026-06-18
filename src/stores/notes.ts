import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { Note } from '@/types'

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

  function setNotes(newNotes: Note[]) {
    notes.value = newNotes
  }

  function setActiveNote(note: Note | null) {
    activeNote.value = note
  }

  function setLoading(loading: boolean) {
    isLoading.value = loading
  }

  return {
    notes,
    activeNote,
    isLoading,
    sortedNotes,
    favorites,
    setNotes,
    setActiveNote,
    setLoading,
  }
})
