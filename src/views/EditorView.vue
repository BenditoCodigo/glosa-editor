<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useNotesStore } from '@/stores/notes'
import UiIcon from '@/components/ui/UiIcon.vue'
import UiIconButton from '@/components/ui/UiIconButton.vue'
import UiButton from '@/components/ui/UiButton.vue'
import EditorContentComponent from '@/components/editor/EditorContent.vue'
import EditorToolbar from '@/components/editor/EditorToolbar.vue'

const route = useRoute()
const router = useRouter()
const notesStore = useNotesStore()
const { activeNote } = storeToRefs(notesStore)

const title = ref('')
const content = ref('')
const saveStatus = ref<'saved' | 'saving' | 'unsaved'>('saved')
const isLoading = ref(true)
const editorRef = ref<InstanceType<typeof EditorContentComponent> | null>(null)

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

// Autosave scheduling
function scheduleAutosave() {
  if (autosaveTimer) clearTimeout(autosaveTimer)
  saveStatus.value = 'unsaved'
  autosaveTimer = setTimeout(save, 1500)
}

async function save() {
  if (!activeNote.value) return
  saveStatus.value = 'saving'

  await notesStore.updateNote({
    id: activeNote.value.id,
    title: title.value || 'Untitled Note',
    content: content.value,
    folder: activeNote.value.folder,
    isFavorite: activeNote.value.isFavorite,
    createdAt: activeNote.value.createdAt,
    updatedAt: activeNote.value.updatedAt,
    tags: [...activeNote.value.tags],
  })

  saveStatus.value = 'saved'
}

function handleTitleInput(event: Event) {
  title.value = (event.target as HTMLInputElement).value
  scheduleAutosave()
}

function handleContentUpdate(newContent: string) {
  content.value = newContent
  scheduleAutosave()
}

function goBack() {
  if (activeNote.value?.folder) {
    router.push({ name: 'explorer-folder', params: { path: activeNote.value.folder } })
  } else {
    router.push('/')
  }
}

onUnmounted(() => {
  if (autosaveTimer) clearTimeout(autosaveTimer)
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
              :name="saveStatus === 'saving' ? 'sync' : saveStatus === 'saved' ? 'cloud_done' : 'edit'"
              size="sm"
              :class="saveStatus === 'saving' && 'animate-spin'"
            />
            <span class="text-xs opacity-70">
              {{ saveStatus === 'saved' ? 'Saved' : saveStatus === 'saving' ? 'Saving...' : 'Unsaved changes' }}
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

          <!-- Tiptap Editor -->
          <EditorContentComponent
            ref="editorRef"
            :content="content"
            @update:content="handleContentUpdate"
          />
        </div>
      </div>

      <!-- Floating toolbar -->
      <div class="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
        <EditorToolbar :editor="editorRef?.editor" />
      </div>
    </template>
  </div>
</template>
