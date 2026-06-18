<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useNotesStore } from '@/stores/notes'
import UiIcon from '@/components/ui/UiIcon.vue'
import UiIconButton from '@/components/ui/UiIconButton.vue'
import UiButton from '@/components/ui/UiButton.vue'

const route = useRoute()
const router = useRouter()
const notesStore = useNotesStore()
const { activeNote } = storeToRefs(notesStore)

const title = ref('')
const content = ref('')
const saveStatus = ref<'saved' | 'saving' | 'unsaved'>('saved')
const isLoading = ref(true)

let autosaveTimer: ReturnType<typeof setTimeout> | null = null

// Load note when route changes
watch(
  () => route.params.id,
  async (id) => {
    if (!id || typeof id !== 'string') return
    isLoading.value = true
    const note = await notesStore.loadNote(id)
    if (note) {
      title.value = note.title
      content.value = note.content
    } else {
      router.replace('/')
    }
    isLoading.value = false
  },
  { immediate: true },
)

// Autosave on content/title changes
function scheduleAutosave() {
  if (autosaveTimer) clearTimeout(autosaveTimer)
  saveStatus.value = 'unsaved'
  autosaveTimer = setTimeout(save, 1500)
}

async function save() {
  if (!activeNote.value) return
  saveStatus.value = 'saving'

  const updatedNote = {
    ...activeNote.value,
    title: title.value || 'Untitled Note',
    content: content.value,
  }

  await notesStore.updateNote(updatedNote)
  saveStatus.value = 'saved'
}

function handleTitleInput(event: Event) {
  title.value = (event.target as HTMLInputElement).value
  scheduleAutosave()
}

function handleContentInput(event: Event) {
  content.value = (event.target as HTMLTextAreaElement).value
  scheduleAutosave()
}

function goBack() {
  if (activeNote.value?.folder) {
    router.push({ name: 'explorer-folder', params: { path: activeNote.value.folder } })
  } else {
    router.push('/')
  }
}

const toolbarItems = [
  { icon: 'format_h1', label: 'Headings' },
  { icon: 'format_bold', label: 'Bold' },
  { icon: 'format_italic', label: 'Italic' },
  { divider: true },
  { icon: 'format_list_bulleted', label: 'Bullet List' },
  { icon: 'format_list_numbered', label: 'Numbered List' },
  { divider: true },
  { icon: 'code', label: 'Code Block' },
  { icon: 'link', label: 'Link' },
] as const

onUnmounted(() => {
  if (autosaveTimer) clearTimeout(autosaveTimer)
  // Save on leave if unsaved
  if (saveStatus.value !== 'saved') save()
})
</script>

<template>
  <div class="flex-1 flex flex-col animate-fade-in">
    <!-- Loading -->
    <div v-if="isLoading" class="flex-1 flex items-center justify-center">
      <UiIcon name="sync" class="animate-spin text-secondary" />
    </div>

    <template v-else-if="activeNote">
      <!-- Editor header -->
      <div class="flex items-center justify-between px-6 lg:px-12 py-2">
        <div class="flex items-center gap-3">
          <UiIconButton icon="arrow_back" ariaLabel="Back to explorer" size="sm" @click="goBack" />
          <div class="flex items-center gap-2 text-secondary">
            <UiIcon
              :name="saveStatus === 'saving' ? 'sync' : 'cloud_done'"
              size="sm"
              :class="saveStatus === 'saving' && 'animate-spin'"
            />
            <span class="text-xs opacity-70">
              {{ saveStatus === 'saved' ? 'Saved' : saveStatus === 'saving' ? 'Saving...' : 'Unsaved' }}
            </span>
          </div>
        </div>
        <UiButton variant="solid" size="sm" @click="save">
          Save
        </UiButton>
      </div>

      <!-- Editor area -->
      <div class="flex-1 overflow-y-auto px-4 md:px-12 py-8">
        <div class="max-w-[720px] mx-auto glass-panel-md rounded-2xl p-8 md:p-12">
          <!-- Tags -->
          <div v-if="activeNote.tags.length > 0" class="flex items-center gap-2 mb-4">
            <template v-for="(tag, i) in activeNote.tags" :key="tag">
              <span class="text-[11px] text-secondary/40 uppercase tracking-[0.2em] font-medium">{{ tag }}</span>
              <span v-if="i < activeNote.tags.length - 1" class="text-outline-variant">/</span>
            </template>
          </div>

          <!-- Title -->
          <input
            :value="title"
            type="text"
            placeholder="Note Title"
            class="w-full bg-transparent border-none p-0 mb-8 focus:ring-0 focus:outline-none font-display text-4xl md:text-5xl font-bold text-on-surface leading-tight tracking-tight placeholder:text-outline-variant"
            @input="handleTitleInput"
          >

          <!-- Content (textarea placeholder for Tiptap) -->
          <textarea
            :value="content"
            placeholder="Start writing..."
            class="w-full min-h-[400px] bg-transparent border-none p-0 focus:ring-0 focus:outline-none text-lg leading-relaxed text-on-surface/90 resize-none placeholder:text-outline-variant"
            @input="handleContentInput"
          />
        </div>
      </div>

      <!-- Floating toolbar -->
      <div class="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
        <div class="
          bg-surface-container-highest
          shadow-lg border border-outline-variant
          rounded-full p-2
          flex items-center gap-1
          transition-opacity duration-300
          opacity-60 hover:opacity-100
        ">
          <template v-for="(item, index) in toolbarItems" :key="index">
            <div v-if="'divider' in item" class="w-px h-6 bg-outline-variant mx-1" />
            <UiIconButton
              v-else
              :icon="item.icon"
              :ariaLabel="item.label"
              size="sm"
            />
          </template>
        </div>
      </div>
    </template>
  </div>
</template>
