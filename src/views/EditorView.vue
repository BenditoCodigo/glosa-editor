<script setup lang="ts">
import { ref, watch, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useNotesStore } from '@/stores/notes'
import { trackActivity } from '@/services/activity'
import UiIcon from '@/components/ui/UiIcon.vue'
import UiIconButton from '@/components/ui/UiIconButton.vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiPromptModal from '@/components/ui/UiPromptModal.vue'
import EditorContentComponent from '@/components/editor/EditorContent.vue'
import EditorToolbar from '@/components/editor/EditorToolbar.vue'
import EmojiPicker from '@/components/editor/EmojiPicker.vue'
import ExportMenu from '@/components/editor/ExportMenu.vue'
import AIBlockDialog from '@/components/ai/AIBlockDialog.vue'
import { useExport } from '@/composables/useExport'
import { useAIBlockAssistant } from '@/composables/useAIBlockAssistant'

const route = useRoute()
const router = useRouter()
const notesStore = useNotesStore()
const { activeNote } = storeToRefs(notesStore)
const { downloadAsMarkdown, copyAsMarkdown } = useExport()
const aiAssistant = useAIBlockAssistant()

const copyFeedback = ref(false)

async function handleExportMd() {
  if (!activeNote.value) return
  downloadAsMarkdown(activeNote.value)
}

async function handleCopyMd() {
  if (!activeNote.value) return
  const ok = await copyAsMarkdown(activeNote.value)
  if (ok) {
    copyFeedback.value = true
    setTimeout(() => { copyFeedback.value = false }, 2000)
  }
}

const title = ref('')
const content = ref('')
const tags = ref<string[]>([])
const tagInput = ref('')
const emoji = ref<string | undefined>(undefined)
const coverImage = ref<string | undefined>(undefined)
const saveStatus = ref<'saved' | 'saving' | 'unsaved'>('saved')
const isLoading = ref(true)
const editorRef = ref<InstanceType<typeof EditorContentComponent> | null>(null)
const titleRef = ref<HTMLTextAreaElement | null>(null)
const coverScale = ref(1)

let autosaveTimer: ReturnType<typeof setTimeout> | null = null

// Zoom cover image on scroll (max 1.4x)
// The actual scroll container is in App.vue (flex-1 overflow-y-auto), not in this component.
// We find the nearest scrollable ancestor and listen on it.
const editorAreaRef = ref<HTMLElement | null>(null)

function handleCoverZoom(event: Event) {
  if (!coverImage.value) return
  const target = event.target as HTMLElement
  const viewportHeight = target.clientHeight
  // Scale from 1 to 1.4 over one full viewport height of scroll
  const progress = Math.min(target.scrollTop / viewportHeight, 1)
  coverScale.value = 1 + progress * 0.2
}

watch(editorAreaRef, (el) => {
  if (!el) return
  // Walk up to find the scrolling ancestor
  let scrollParent: HTMLElement | null = el.parentElement
  while (scrollParent) {
    const style = getComputedStyle(scrollParent)
    if (style.overflowY === 'auto' || style.overflowY === 'scroll') break
    scrollParent = scrollParent.parentElement
  }
  if (scrollParent) {
    scrollParent.addEventListener('scroll', handleCoverZoom, { passive: true })
  }
}, { flush: 'post' })

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
      coverImage.value = note.coverImage
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
    coverImage: coverImage.value,
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

function handleAiBlockClick(payload: { index: number; content: string; top: number; rect: DOMRect | null }) {
  aiAssistant.openAssistant({
    index: payload.index,
    content: payload.content,
    top: payload.top,
    rect: payload.rect,
    context: {
      title: title.value || activeNote.value?.title || 'Sin título',
      folder: activeNote.value?.folder,
      tags: [...tags.value],
      updatedAt: activeNote.value?.updatedAt,
      emoji: emoji.value,
    },
  })
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

// Cover image
const showCoverModal = ref(false)

function handleSetCoverImage() {
  showCoverModal.value = true
}

function confirmCoverImage(url: string) {
  showCoverModal.value = false
  coverImage.value = url || undefined
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
      <div class="relative z-30 flex items-center justify-between px-6 lg:px-12 py-2">
        <div class="flex items-center gap-3">
          <UiIconButton icon="arrow_back" ariaLabel="Back to explorer" tooltip="Volver" size="sm" @click="goBack" />
          <div class="flex items-center gap-2 text-secondary">
            <UiIcon
              :name="saveStatus === 'saving' ? 'sync' : saveStatus === 'saved' ? 'cloud_done' : 'edit'"
              size="sm"
              :class="saveStatus === 'saving' && 'animate-spin'"
            />
            <span class="text-xs opacity-70">
              {{ saveStatus === 'saved' ? 'Guardado' : saveStatus === 'saving' ? 'Guardando...' : 'Guardando' }}
            </span>
          </div>

          <!-- Undo / Redo -->
          <div class="flex items-center gap-0.5 ml-2">
            <UiIconButton
              icon="undo"
              ariaLabel="Undo"
              tooltip="Deshacer"
              size="sm"
              :class="!editorRef?.editor?.can().undo() && 'opacity-30 pointer-events-none'"
              @click="editorRef?.editor?.chain().focus().undo().run()"
            />
            <UiIconButton
              icon="redo"
              ariaLabel="Redo"
              tooltip="Rehacer"
              size="sm"
              :class="!editorRef?.editor?.can().redo() && 'opacity-30 pointer-events-none'"
              @click="editorRef?.editor?.chain().focus().redo().run()"
            />
          </div>
        </div>
        <div class="flex items-center gap-2">
          <UiIconButton icon="image" ariaLabel="Cover image" tooltip="Imagen de portada" size="sm" @click="handleSetCoverImage" />
          <UiButton variant="solid" size="sm" @click="save">
            <template #icon-left>
              <UiIcon name="save" size="sm" />
            </template>
            Guardar
          </UiButton>
          <ExportMenu @export-md="handleExportMd" @copy-md="handleCopyMd" />
        </div>

        <!-- Copy feedback toast -->
        <Transition name="fade">
          <div
            v-if="copyFeedback"
            class="absolute right-6 lg:right-12 top-full mt-2 glass-panel-md rounded-lg px-3 py-2 text-xs text-on-surface shadow-md z-50"
          >
            Contenido copiado al portapapeles
          </div>
        </Transition>
      </div>

      <!-- Editor area -->
      <div ref="editorAreaRef" class="flex-1 overflow-y-auto px-4 md:px-12 py-8">
        <div class="max-w-[720px] mx-auto relative">
          <!-- Cover image header -->
          <div
            v-if="coverImage"
            class="relative -mx-6 h-[320px] -mb-28 rounded-2xl overflow-hidden z-0"
          >
            <img
              :src="coverImage"
              alt=""
              class="w-full h-full object-cover will-change-transform transform-gpu"
              :style="{ transform: `scale(${coverScale})` }"
            >
            <!-- Bottom fade so the glass panel blends smoothly -->
            <div class="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white/90 to-transparent dark:hidden"></div>
            <div class="absolute inset-x-0 bottom-0 h-24 hidden dark:block bg-gradient-to-t from-black/70 to-transparent"></div>
          </div>

          <!-- Glass editor panel -->
          <div class="relative z-[1] glass-panel-md rounded-2xl p-8 md:p-12">
            <!-- AI Block Dialog -->
            <AIBlockDialog :assistant="aiAssistant" />

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
              :highlightedBlockIndex="aiAssistant.activeBlockIndex.value"
              @update:content="handleContentUpdate"
              @ai-block-click="handleAiBlockClick"
            />
          </div>
        </div>
      </div>

      <!-- Floating toolbar -->
      <div class="fixed bottom-16 left-1/2 -translate-x-1/2 z-50">
        <EditorToolbar :editor="editorRef?.editor" />
      </div>
    </template>
  </div>

  <!-- Modal: Cover image -->
  <UiPromptModal
    :open="showCoverModal"
    title="Imagen de portada"
    placeholder="https://ejemplo.com/imagen.jpg"
    :initialValue="coverImage || ''"
    confirmLabel="Aplicar"
    @confirm="confirmCoverImage"
    @cancel="showCoverModal = false"
  />
</template>
