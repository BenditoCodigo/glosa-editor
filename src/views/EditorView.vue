<script setup lang="ts">
import { ref, watch, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useNotesStore } from '@/stores/notes'
import { trackActivity } from '@/services/activity'
import UiIcon from '@/components/ui/UiIcon.vue'
import UiIconButton from '@/components/ui/UiIconButton.vue'
import UiButton from '@/components/ui/UiButton.vue'
import CoverImageModal from '@/components/editor/CoverImageModal.vue'
import EditorContentComponent from '@/components/editor/EditorContent.vue'
import EditorToolbar from '@/components/editor/EditorToolbar.vue'
import EmojiPicker from '@/components/editor/EmojiPicker.vue'
import ExportMenu from '@/components/editor/ExportMenu.vue'
import AIBlockDialog from '@/components/ai/AIBlockDialog.vue'
import NoteReferencesModal from '@/components/editor/NoteReferencesModal.vue'
import WriterAnnotationModal from '@/components/editor/WriterAnnotationModal.vue'
import WriterAnnotationPopover from '@/components/editor/WriterAnnotationPopover.vue'
import WriterAnnotationsDrawer from '@/components/editor/WriterAnnotationsDrawer.vue'
import { createAnnotationAnchor, findAnchorPosition } from '@/services/annotations/anchorEngine'
import type { WriterAnnotation, WriterAnnotationColor } from '@/types/note'
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
    setTimeout(() => {
      copyFeedback.value = false
    }, 2000)
  }
}

const title = ref('')
const content = ref('')
const description = ref<string | undefined>(undefined)
const tags = ref<string[]>([])
const tagInput = ref('')
const emoji = ref<string | undefined>(undefined)
const coverImage = ref<string | undefined>(undefined)
const sources = ref<string[]>([])
const aiInstructions = ref('')
const temperature = ref<number | undefined>(undefined)
const topP = ref<number | undefined>(undefined)
const showReferencesModal = ref(false)
const saveStatus = ref<'saved' | 'saving' | 'unsaved'>('saved')
const isLoading = ref(true)
const editorRef = ref<InstanceType<typeof EditorContentComponent> | null>(null)
const titleRef = ref<HTMLTextAreaElement | null>(null)
const coverScale = ref(1)
const coverTranslateY = ref(0)
const isHeaderScrolledOut = ref(false)

// Writer Annotations State
const annotations = ref<WriterAnnotation[]>([])
const showAnnotationsDrawer = ref(false)
const showAnnotationModal = ref(false)
const modalIsEditing = ref(false)
const activeModalAnnotation = ref<WriterAnnotation | null>(null)
const selectedQuoteText = ref('')
const selectedRange = ref<{
  from: number
  to: number
  text: string
  docText: string
  blockIndex?: number
} | null>(null)
const popoverAnnotation = ref<WriterAnnotation | null>(null)
const popoverPosition = ref<{ top: number; left: number } | null>(null)
const orphanIds = ref<string[]>([])

function checkOrphanAnnotations() {
  const text = content.value || ''
  const orphans: string[] = []
  for (const item of annotations.value) {
    if (item.anchor) {
      const match = findAnchorPosition(text, item.anchor)
      if (match.isOrphan) {
        orphans.push(item.id)
      }
    }
  }
  orphanIds.value = orphans
}

let autosaveTimer: ReturnType<typeof setTimeout> | null = null
let attachedScrollParent: HTMLElement | null = null

// Scroll handler for parallax translation, zoom and header visibility detection
// The actual scroll container is in App.vue (flex-1 overflow-y-auto), not in this component.
// We find the nearest scrollable ancestor and listen on it.
const editorAreaRef = ref<HTMLElement | null>(null)

function handleScroll(event: Event) {
  const target = event.target as HTMLElement
  const scrollTop = target.scrollTop

  if (coverImage.value) {
    const viewportHeight = target.clientHeight || 800
    // Parallax: image smoothly descends as page scrolls down (without a rigid cap)
    coverTranslateY.value = scrollTop * 0.35
    const progress = Math.min(scrollTop / viewportHeight, 1)
    coverScale.value = 1 + progress * 0.15
  }

  // Header scrolls out when user scrolls past the top header height (~40px)
  isHeaderScrolledOut.value = scrollTop > 40
}

watch(
  editorAreaRef,
  (el) => {
    if (attachedScrollParent) {
      attachedScrollParent.removeEventListener('scroll', handleScroll)
      attachedScrollParent = null
    }
    if (!el) return
    // Walk up to find the scrolling ancestor
    let scrollParent: HTMLElement | null = el.parentElement
    while (scrollParent) {
      const style = getComputedStyle(scrollParent)
      if (style.overflowY === 'auto' || style.overflowY === 'scroll') break
      scrollParent = scrollParent.parentElement
    }
    if (scrollParent) {
      attachedScrollParent = scrollParent
      scrollParent.addEventListener('scroll', handleScroll, { passive: true })
    }
  },
  { flush: 'post' },
)

// Load note when route changes
watch(
  () => route.params.id,
  async (id) => {
    if (!id || typeof id !== 'string') return
    isLoading.value = true
    isHeaderScrolledOut.value = false
    coverTranslateY.value = 0
    coverScale.value = 1
    const note = await notesStore.loadNote(id)
    if (note) {
      title.value = note.title
      content.value = note.content
      description.value = note.description
      tags.value = [...note.tags]
      emoji.value = note.emoji
      coverImage.value = note.coverImage
      sources.value = note.sources ? [...note.sources] : []
      aiInstructions.value = note.aiInstructions ?? ''
      temperature.value = note.temperature
      topP.value = note.topP
      annotations.value = note.annotations ? JSON.parse(JSON.stringify(note.annotations)) : []
      checkOrphanAnnotations()
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
    description: description.value?.trim() || undefined,
    folder: activeNote.value.folder,
    isFavorite: activeNote.value.isFavorite,
    createdAt: activeNote.value.createdAt,
    updatedAt: activeNote.value.updatedAt,
    tags: [...tags.value],
    emoji: emoji.value,
    coverImage: coverImage.value,
    sources: sources.value.length > 0 ? [...sources.value] : undefined,
    aiInstructions: aiInstructions.value.trim() || undefined,
    temperature: temperature.value != null ? temperature.value : undefined,
    topP: topP.value != null ? topP.value : undefined,
    annotations: annotations.value.length > 0 ? JSON.parse(JSON.stringify(annotations.value)) : undefined,
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
  checkOrphanAnnotations()
  scheduleAutosave()
}

// Annotation Handlers
function handleOpenAddAnnotation() {
  const sel = editorRef.value?.getSelectedRange()
  if (!sel || !sel.text.trim()) {
    showAnnotationsDrawer.value = true
    return
  }
  selectedRange.value = sel
  selectedQuoteText.value = sel.text
  modalIsEditing.value = false
  activeModalAnnotation.value = null
  showAnnotationModal.value = true
}

function handleSaveAnnotation(payload: { comment: string; color: WriterAnnotationColor }) {
  if (modalIsEditing.value && activeModalAnnotation.value) {
    const target = annotations.value.find((a) => a.id === activeModalAnnotation.value?.id)
    if (target) {
      target.comment = payload.comment
      target.color = payload.color
      target.updatedAt = new Date().toISOString()
      editorRef.value?.updateAnnotationMark(target.id, { color: payload.color })
    }
    if (popoverAnnotation.value?.id === activeModalAnnotation.value.id) {
      popoverAnnotation.value.comment = payload.comment
      popoverAnnotation.value.color = payload.color
    }
  } else if (selectedRange.value) {
    const newId = `ant-${crypto.randomUUID().slice(0, 8)}`
    const now = new Date().toISOString()
    const anchor = createAnnotationAnchor(
      selectedRange.value.docText,
      selectedRange.value.from,
      selectedRange.value.to,
      selectedRange.value.blockIndex,
    )
    const newAnnotation: WriterAnnotation = {
      id: newId,
      comment: payload.comment,
      color: payload.color,
      createdAt: now,
      resolved: false,
      anchor,
    }
    annotations.value.push(newAnnotation)
    editorRef.value?.applyAnnotationMark(newId, payload.color, false)
    checkOrphanAnnotations()
  }

  showAnnotationModal.value = false
  activeModalAnnotation.value = null
  selectedRange.value = null
  scheduleAutosave()
}

function handleAnnotationClick(payload: { annotationId: string; rect: DOMRect }) {
  const item = annotations.value.find((a) => a.id === payload.annotationId)
  if (!item) return
  popoverAnnotation.value = item
  popoverPosition.value = {
    top: Math.min(window.innerHeight - 260, Math.max(70, payload.rect.bottom + 8)),
    left: Math.min(window.innerWidth - 340, Math.max(16, payload.rect.left)),
  }
}

function handleToggleResolved(annotation: WriterAnnotation) {
  annotation.resolved = !annotation.resolved
  annotation.updatedAt = new Date().toISOString()
  editorRef.value?.updateAnnotationMark(annotation.id, { resolved: annotation.resolved })
  scheduleAutosave()
}

function handleEditAnnotation(annotation: WriterAnnotation) {
  activeModalAnnotation.value = annotation
  selectedQuoteText.value = annotation.anchor?.exact || ''
  modalIsEditing.value = true
  showAnnotationModal.value = true
  popoverAnnotation.value = null
}

function handleDeleteAnnotation(annotation: WriterAnnotation) {
  annotations.value = annotations.value.filter((a) => a.id !== annotation.id)
  editorRef.value?.removeAnnotationMark(annotation.id)
  if (popoverAnnotation.value?.id === annotation.id) {
    popoverAnnotation.value = null
  }
  orphanIds.value = orphanIds.value.filter((id) => id !== annotation.id)
  scheduleAutosave()
}

function handleSelectFromDrawer(annotation: WriterAnnotation) {
  editorRef.value?.scrollToAnnotation(annotation.id)
}

function handleReanchorAnnotation(annotation: WriterAnnotation) {
  const sel = editorRef.value?.getSelectedRange()
  if (!sel || !sel.text.trim()) {
    alert('Por favor selecciona el nuevo texto en el editor antes de re-anclar la glosa.')
    return
  }
  const anchor = createAnnotationAnchor(sel.docText, sel.from, sel.to, sel.blockIndex)
  annotation.anchor = anchor
  annotation.updatedAt = new Date().toISOString()
  editorRef.value?.applyAnnotationMark(annotation.id, annotation.color || 'amber', annotation.resolved)
  orphanIds.value = orphanIds.value.filter((id) => id !== annotation.id)
  scheduleAutosave()
}

function handleAiBlockClick(payload: {
  index: number
  content: string
  top: number
  rect: DOMRect | null
}) {
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
      fullContent: content.value,
      sources: [...sources.value],
      aiInstructions: aiInstructions.value,
      temperature: temperature.value,
      topP: topP.value,
    },
    getContent: () => editorRef.value?.getBlockContent(payload.index) || payload.content,
    getContext: () => ({
      title: title.value || activeNote.value?.title || 'Sin título',
      folder: activeNote.value?.folder,
      tags: [...tags.value],
      updatedAt: activeNote.value?.updatedAt,
      emoji: emoji.value,
      fullContent: content.value,
      sources: [...sources.value],
      aiInstructions: aiInstructions.value,
      temperature: temperature.value,
      topP: topP.value,
    }),
  })
}

function handleSaveReferences(payload: {
  description: string
  sources: string[]
  aiInstructions: string
  temperature?: number
  topP?: number
}) {
  description.value = payload.description.trim() || undefined
  sources.value = payload.sources
  aiInstructions.value = payload.aiInstructions
  temperature.value = payload.temperature
  topP.value = payload.topP
  showReferencesModal.value = false
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

// Cover image
const showCoverModal = ref(false)

function handleSetCoverImage() {
  showCoverModal.value = true
}

function confirmCoverImage(urlOrDataUrl: string) {
  showCoverModal.value = false
  coverImage.value = urlOrDataUrl || undefined
  scheduleAutosave()
}

function handleRemoveCoverImage() {
  showCoverModal.value = false
  coverImage.value = undefined
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

function navigateToTag(tag: string) {
  router.push({ name: 'tag-view', params: { tag } })
}

function goBack() {
  if (activeNote.value?.folder) {
    router.push({ name: 'explorer-folder', params: { path: activeNote.value.folder } })
  } else {
    router.push('/')
  }
}

onUnmounted(() => {
  if (attachedScrollParent) {
    attachedScrollParent.removeEventListener('scroll', handleScroll)
    attachedScrollParent = null
  }
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
          <UiIconButton
            icon="arrow_back"
            ariaLabel="Back to explorer"
            tooltip="Volver"
            size="sm"
            @click="goBack"
          />
          <div class="flex items-center gap-2 text-secondary">
            <UiIcon
              :name="
                saveStatus === 'saving' ? 'sync' : saveStatus === 'saved' ? 'cloud_done' : 'edit'
              "
              size="sm"
              :class="saveStatus === 'saving' && 'animate-spin'"
            />
            <span class="text-xs opacity-70">
              {{
                saveStatus === 'saved'
                  ? 'Guardado'
                  : saveStatus === 'saving'
                    ? 'Guardando...'
                    : 'Guardando'
              }}
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
          <UiButton
            variant="ghost"
            size="sm"
            class="gap-1.5"
            :class="showAnnotationsDrawer && 'bg-primary/15 text-primary'"
            @click="showAnnotationsDrawer = !showAnnotationsDrawer"
          >
            <template #icon-left>
              <UiIcon name="rate_review" size="sm" />
            </template>
            <span class="hidden sm:inline">Glosas</span>
            <span
              v-if="annotations.length > 0"
              class="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/20 text-primary"
            >
              {{ annotations.length }}
            </span>
          </UiButton>
          <UiIconButton
            icon="menu_book"
            ariaLabel="Fuentes e instrucciones de IA"
            tooltip="Fuentes e instrucciones de IA"
            size="sm"
            :class="(sources.length > 0 || aiInstructions.trim().length > 0) && 'text-primary'"
            @click="showReferencesModal = true"
          />
          <UiIconButton
            icon="image"
            ariaLabel="Cover image"
            tooltip="Imagen de portada"
            size="sm"
            @click="handleSetCoverImage"
          />
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
      <div ref="editorAreaRef" class="flex-1 overflow-y-auto px-4 md:px-12 pt-8 pb-48">
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
              :style="{ transform: `translateY(${coverTranslateY}px) scale(${coverScale})` }"
            />
            <!-- Bottom fade so the glass panel blends smoothly -->
            <div
              class="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white/90 to-transparent dark:hidden"
            ></div>
            <div
              class="absolute inset-x-0 bottom-0 h-24 hidden dark:block bg-gradient-to-t from-black/70 to-transparent"
            ></div>
          </div>

          <!-- Glass editor panel -->
          <div class="relative z-[1] glass-panel-md rounded-2xl p-8 md:p-12 pb-24 md:pb-32">
            <!-- AI Block Dialog -->
            <AIBlockDialog :assistant="aiAssistant" />

            <!-- Emoji + Tags editor -->
            <div class="flex items-center gap-3 mb-4">
              <!-- Emoji picker -->
              <EmojiPicker :currentEmoji="emoji" @select="handleEmojiSelect" />

              <!-- Tags -->
              <div class="flex flex-wrap items-center gap-2 flex-1">
                <div
                  v-for="(tag, index) in tags"
                  :key="tag"
                  role="button"
                  tabindex="0"
                  class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary-fixed/50 text-on-primary-fixed text-[11px] uppercase tracking-[0.1em] font-semibold hover:bg-primary-fixed transition-colors cursor-pointer group select-none"
                  title="Ver notas con esta etiqueta"
                  @click="navigateToTag(tag)"
                  @keydown.enter.prevent="navigateToTag(tag)"
                >
                  <span>{{ tag }}</span>
                  <button
                    type="button"
                    class="opacity-0 group-hover:opacity-100 hover:scale-110 active:scale-95 transition-all p-0.5 -mr-1 rounded text-on-primary-fixed/70 hover:text-on-primary-fixed flex items-center justify-center"
                    title="Eliminar etiqueta"
                    aria-label="Eliminar etiqueta"
                    @click.stop="removeTag(index)"
                  >
                    <UiIcon name="close" size="sm" class="text-[12px]" />
                  </button>
                </div>
                <input
                  v-model="tagInput"
                  type="text"
                  placeholder="#"
                  class="bg-transparent border-none p-0 text-[14px] uppercase tracking-[0.1em] text-secondary/60 placeholder:text-secondary/30 focus:outline-none focus:ring-0 w-20"
                  @keydown="handleTagKeydown"
                  @blur="addTag"
                />
              </div>
            </div>

            <!-- Title (auto-resizing textarea) -->
            <textarea
              ref="titleRef"
              :value="title"
              placeholder="Título de la nota"
              rows="1"
              class="w-full bg-transparent border-none p-0 mb-8 focus:ring-0 focus:outline-none font-display text-4xl md:text-5xl font-bold text-on-surface leading-tight tracking-tight placeholder:text-outline-variant resize-none overflow-hidden"
              @input="handleTitleInput"
            />

            <!-- Tiptap Editor -->
            <EditorContentComponent
              ref="editorRef"
              :content="content"
              :highlightedBlockIndex="aiAssistant.activeBlockIndex.value"
              @update:content="handleContentUpdate"
              @ai-block-click="handleAiBlockClick"
              @annotation-click="handleAnnotationClick"
            />
          </div>
        </div>
      </div>

      <!-- Floating bottom dock: Editor toolbar + Companion bubble on scroll -->
      <div
        class="fixed bottom-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 pointer-events-none max-w-[calc(100vw-2rem)]"
      >
        <div class="pointer-events-auto shrink-0">
          <EditorToolbar
            :editor="editorRef?.editor"
            @add-annotation="handleOpenAddAnnotation"
          />
        </div>

        <!-- Scroll companion bubble: Save status, Save button, Fuentes button -->
        <Transition
          enter-active-class="transition-all duration-300 ease-out"
          enter-from-class="opacity-0 scale-90 translate-x-3"
          enter-to-class="opacity-100 scale-100 translate-x-0"
          leave-active-class="transition-all duration-200 ease-in"
          leave-from-class="opacity-100 scale-100 translate-x-0"
          leave-to-class="opacity-0 scale-90 translate-x-3"
        >
          <div
            v-if="isHeaderScrolledOut"
            class="pointer-events-auto glass-toolbar rounded-full p-2 flex items-center gap-1 shadow-2xl shrink-0 transition-all duration-200"
          >
            <!-- Save status & cloud feedback -->
            <div
              class="flex items-center gap-1.5 px-2 py-1 select-none text-secondary"
              :title="
                saveStatus === 'saved'
                  ? 'Guardado'
                  : saveStatus === 'saving'
                    ? 'Guardando...'
                    : 'Cambios sin guardar'
              "
            >
              <UiIcon
                :name="
                  saveStatus === 'saving' ? 'sync' : saveStatus === 'saved' ? 'cloud_done' : 'edit'
                "
                size="sm"
                :class="
                  saveStatus === 'saving'
                    ? 'animate-spin text-primary'
                    : saveStatus === 'saved'
                      ? 'text-primary'
                      : 'text-secondary/70'
                "
              />
              <span class="text-xs opacity-75 font-medium whitespace-nowrap hidden sm:inline">
                {{
                  saveStatus === 'saved'
                    ? 'Guardado'
                    : saveStatus === 'saving'
                      ? 'Guardando...'
                      : 'Guardando'
                }}
              </span>
            </div>

            <div class="w-px h-5 bg-outline-variant/50 mx-0.5" />

            <!-- Save button (disk) -->
            <UiIconButton
              icon="save"
              ariaLabel="Guardar nota"
              tooltip="Guardar"
              size="sm"
              @click="save"
            />

            <!-- Fuentes e instrucciones button -->
            <UiIconButton
              icon="menu_book"
              ariaLabel="Metadatos e instrucciones de IA"
              tooltip="Metadatos e instrucciones de IA"
              size="sm"
              :class="
                (sources.length > 0 ||
                  aiInstructions.trim().length > 0 ||
                  (description && description.trim().length > 0) ||
                  temperature !== undefined ||
                  topP !== undefined) &&
                'text-primary'
              "
              @click="showReferencesModal = true"
            />
          </div>
        </Transition>
      </div>
    </template>
  </div>

  <!-- Modal: Cover image -->
  <CoverImageModal
    :open="showCoverModal"
    :initialValue="coverImage || ''"
    @confirm="confirmCoverImage"
    @remove="handleRemoveCoverImage"
    @cancel="showCoverModal = false"
  />

  <!-- Modal: Fuentes e instrucciones de IA -->
  <NoteReferencesModal
    :open="showReferencesModal"
    :sources="sources"
    :aiInstructions="aiInstructions"
    :description="description"
    :noteTitle="title"
    :noteContent="content"
    :temperature="temperature"
    :topP="topP"
    @save="handleSaveReferences"
    @cancel="showReferencesModal = false"
  />

  <!-- Writer Annotations Modal -->
  <WriterAnnotationModal
    :open="showAnnotationModal"
    :isEditing="modalIsEditing"
    :selectedText="selectedQuoteText"
    :initialComment="activeModalAnnotation?.comment || ''"
    :initialColor="activeModalAnnotation?.color || 'amber'"
    @save="handleSaveAnnotation"
    @cancel="showAnnotationModal = false"
  />

  <!-- Writer Annotation Popover on click -->
  <WriterAnnotationPopover
    :annotation="popoverAnnotation"
    :position="popoverPosition"
    @edit="handleEditAnnotation"
    @toggleResolved="handleToggleResolved"
    @delete="handleDeleteAnnotation"
    @close="popoverAnnotation = null"
  />

  <!-- Writer Annotations Side Drawer -->
  <WriterAnnotationsDrawer
    :open="showAnnotationsDrawer"
    :annotations="annotations"
    :orphanIds="orphanIds"
    @close="showAnnotationsDrawer = false"
    @select="handleSelectFromDrawer"
    @edit="handleEditAnnotation"
    @delete="handleDeleteAnnotation"
    @toggleResolved="handleToggleResolved"
    @reanchor="handleReanchorAnnotation"
  />
</template>
