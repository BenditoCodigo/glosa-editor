<script setup lang="ts">
import { ref } from 'vue'
import FolderCard from '@/components/explorer/FolderCard.vue'
import NoteCard from '@/components/explorer/NoteCard.vue'
import type { Folder, Note } from '@/types'

// Mock data for initial UI
const folders = ref<Folder[]>([
  { id: '1', name: 'Digital Philosophy', parentFolder: null, isFavorite: false, createdAt: '2024-10-10T10:00:00Z', updatedAt: '2024-10-14T14:00:00Z' },
  { id: '2', name: 'Project Aurora', parentFolder: null, isFavorite: false, createdAt: '2024-09-01T10:00:00Z', updatedAt: '2024-10-12T10:00:00Z' },
  { id: '3', name: 'Personal Journal', parentFolder: null, isFavorite: true, createdAt: '2024-08-01T10:00:00Z', updatedAt: '2024-10-09T10:00:00Z' },
  { id: '4', name: 'Reading List', parentFolder: null, isFavorite: false, createdAt: '2024-07-01T10:00:00Z', updatedAt: '2024-09-30T10:00:00Z' },
])

const notes = ref<Note[]>([
  { id: 'n1', title: 'The Ethics of Attention', content: 'Reflecting on how modern interface design deliberately fragments our cognitive flow...', folder: null, isFavorite: false, createdAt: '2024-10-14T10:00:00Z', updatedAt: '2024-10-14T10:00:00Z', tags: ['draft'] },
  { id: 'n2', title: 'Minimalist UI Patterns', content: 'Exploring the use of negative space and typography as the primary structural elements...', folder: null, isFavorite: false, createdAt: '2024-10-12T10:00:00Z', updatedAt: '2024-10-12T10:00:00Z', tags: ['design'] },
  { id: 'n3', title: 'Weekly Retrospective', content: 'Productivity was high, but deep focus sessions were interrupted by unnecessary notifications...', folder: null, isFavorite: true, createdAt: '2024-10-10T10:00:00Z', updatedAt: '2024-10-10T10:00:00Z', tags: ['personal'] },
  { id: 'n4', title: 'System Architecture v2', content: 'Moving towards a decoupled API structure to ensure future scalability and performance...', folder: null, isFavorite: false, createdAt: '2024-10-05T10:00:00Z', updatedAt: '2024-10-05T10:00:00Z', tags: ['tech'] },
])

function toggleFavorite(noteId: string) {
  const note = notes.value.find(n => n.id === noteId)
  if (note) note.isFavorite = !note.isFavorite
}
</script>

<template>
  <div class="p-6 lg:p-12">
    <div class="max-w-[1200px] mx-auto">
      <!-- Folders Section -->
      <section class="mb-12">
        <div class="flex items-center gap-4 mb-6">
          <h2 class="text-[11px] font-semibold text-secondary uppercase tracking-widest">Folders</h2>
          <div class="h-px flex-1 bg-white/30"></div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <FolderCard
            v-for="folder in folders"
            :key="folder.id"
            :folder="folder"
            :active="folder.id === '1'"
          />
        </div>
      </section>

      <!-- Notes Section -->
      <section>
        <div class="flex items-center gap-4 mb-6">
          <h2 class="text-[11px] font-semibold text-secondary uppercase tracking-widest">Loose Notes</h2>
          <div class="h-px flex-1 bg-white/30"></div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <NoteCard
            v-for="note in notes"
            :key="note.id"
            :note="note"
            @toggle-favorite="toggleFavorite(note.id)"
          />
        </div>
      </section>
    </div>
  </div>
</template>
