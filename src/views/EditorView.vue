<script setup lang="ts">
import { ref, watch, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useNotesStore } from '@/stores/notes'
import { trackActivity } from '@/services/activity'
import UiIcon from '@/components/ui/UiIcon.vue'
import UiIconButton from '@/components/ui/UiIconButton.vue'
import UiButton from '@/components/ui/UiButton.vue'
import EditorContentComponent from '@/components/editor/EditorContent.vue'
import EditorToolbar from '@/components/editor/EditorToolbar.vue'
import EmojiPicker from '@/components/editor/EmojiPicker.vue'

const route = useRoute()
const router = useRouter()
const notesStore = useNotesStore()
const { activeNote } = storeToRefs(notesStore)

const title = ref('')
const content = ref('')
const tags = ref<string[]>([])
const tagInput = ref('')
const emoji = ref<string | undefined>(undefined)
const saveStatus = ref<'saved' | 'saving' | 'unsaved'>('saved')
const isLoading = ref(true)
const editorRef = ref<InstanceType<typeof EditorContentComponent> | null>(null)
const titleRef = ref<HTMLTextAreaElement | null>(null)

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
      tags.value = [...note.tags]
      emoji.value = note.emoji
      trackActivity(note.id, 'note', 'open')
    } else {
      router.replace('/')
    }
    isLoading.value = false
    await nextTick()
    autoResizeTitle()
  },
  { immediate: true },
)

// Auto-resize title textarea
function autoResizeTitle() {
  const el = titleRef.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${el.scrollHeight}px`
}

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
    title: title.value || 'Sin título',
    content: content.value,
    folder: activeNote.value.folder,
    isFavorite: activeNote.value.isFavorite,
    createdAt: activeNote.value.createdAt,
    updatedAt: activeNote.value.updatedAt,
    tags: [...tags.value],
    emoji: emoji.value,
  })

  trackActivity(activeNote.value.id, 'note', 'save')
  saveStatus.value = 'saved'
}

function handleTitleInput(event: Event) {
  title.value = (event.target as HTMLTextAreaElement).value
  autoResizeTitle()
  scheduleAutosave()
}

function handleContentUpdate(newContent: string) {
  content.value = newContent
  scheduleAutosave()
}

// Tag management
function addTag() {
  const tag = tagInput.value.trim().toLowerCase()
  if (tag && !tags.value.includes(tag)) {
    tags.value.push(tag)
    scheduleAutosave()
  }
  tagInput.value = ''
}

// Emoji
function handleEmojiSelect(selectedEmoji: string) {
  emoji.value = selectedEmoji
  scheduleAutosave()
}

function handleTagKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' || event.key === ',') {
    event.preventDefault()
    addTag()
  } else if (event.key === 'Backspace' && tagInput.value === '' && tags.value.length > 0) {
    tags.value.pop()
    scheduleAutosave()
  }
}

function removeTag(index: number) {
  tags.value.splice(index, 1)
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
              {{ saveStatus === 'saved' ? 'Guardado' : saveStatus === 'saving' ? 'Guardando...' : 'Cambios sin guardar' }}
            </span>
          </div>
        </div>
        <UiButton variant="solid" size="sm" @click="save">
          Guardar
        </UiButton>
      </div>

      <!-- Editor area -->
      <div class="flex-1 overflow-y-auto px-4 md:px-12 py-8">
        <div class="max-w-[720px] mx-auto glass-panel-md rounded-2xl p-8 md:p-12">
          <!-- Emoji + Tags editor -->
          <div class="flex items-center gap-3 mb-4">
            <!-- Emoji picker -->
            <EmojiPicker :currentEmoji="emoji" @select="handleEmojiSelect" />

            <!-- Tags -->
            <div class="flex flex-wrap items-center gap-2 flex-1">
              <button
                v-for="(tag, index) in tags"
                :key="tag"
                class="
                  inline-flex items-center gap-1
                  px-2.5 py-1 rounded-md
                  bg-primary-fixed/50 text-on-primary-fixed
                  text-[11px] uppercase tracking-[0.1em] font-semibold
                  hover:bg-primary-fixed transition-colors
                  group
                "
                @click="removeTag(index)"
              >
                {{ tag }}
                <UiIcon name="close" size="sm" class="opacity-0 group-hover:opacity-100 transition-opacity text-[12px]" />
              </button>
              <input
                v-model="tagInput"
                type="text"
                placeholder="#"
                class="bg-transparent border-none p-0 text-[14cpx] uppercase tracking-[0.1em] text-secondary/60 placeholder:text-secondary/30 focus:outline-none focus:ring-0 w-20"
                @keydown="handleTagKeydown"
                @blur="addTag"
              >
            </div>
          </div>

          <!-- Title (auto-resizing textarea) -->
          <textarea
            ref="titleRef"
            :value="title"
            placeholder="Título de la nota"
            rows="1"
            class="
              w-full bg-transparent border-none p-0 mb-8
              focus:ring-0 focus:outline-none
              font-display text-4xl md:text-5xl font-bold text-on-surface
              leading-tight tracking-tight
              placeholder:text-outline-variant
              resize-none overflow-hidden
            "
            @input="handleTitleInput"
          />

          <!-- Tiptap Editor -->
          <EditorContentComponent
            ref="editorRef"
            :content="content"
            @update:content="handleContentUpdate"
          />
        </div>
      </div>

      <!-- Floating toolbar -->
      <div class="fixed bottom-16 left-1/2 -translate-x-1/2 z-50">
        <EditorToolbar :editor="editorRef?.editor" />
      </div>
    </template>
  </div>
</template>
