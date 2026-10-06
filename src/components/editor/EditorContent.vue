<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { useEditor, EditorContent, VueNodeViewRenderer } from '@tiptap/vue-3'
import { Extension } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Typography from '@tiptap/extension-typography'
import Link from '@tiptap/extension-link'
import { Table, TableRow, TableCell, TableHeader } from '@tiptap/extension-table'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Image from '@tiptap/extension-image'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { Markdown } from 'tiptap-markdown'
import { common, createLowlight } from 'lowlight'
import CodeBlockNode from './CodeBlockNode.vue'
import { openExternalUrl } from '@/utils/openUrl'
import { useSettingsStore } from '@/stores/settings'
import UiIcon from '@/components/ui/UiIcon.vue'

const lowlight = createLowlight(common)
const settingsStore = useSettingsStore()

interface MarkdownStorage {
  markdown: {
    getMarkdown: () => string
  }
}

interface Props {
  content: string
  highlightedBlockIndex?: number | null
}

const props = withDefaults(defineProps<Props>(), {
  highlightedBlockIndex: null,
})

const emit = defineEmits<{
  'update:content': [value: string]
  'ai-block-click': [payload: { index: number; content: string; top: number; rect: DOMRect | null }]
}>()

const editorContainerRef = ref<HTMLElement | null>(null)

// Block Drag & Drop State
const activeBlockIndex = ref<number | null>(null)
const handleTop = ref<number | null>(null)
const handleVisible = ref(false)
const isDragging = ref(false)
const currentDropIndex = ref<number | null>(null)

let dragStartY = 0
let initialHandleTop = 0

// Cache initial untransformed bounding boxes during drag to avoid measurement thrashing
interface BlockBox {
  top: number
  bottom: number
  height: number
  midpoint: number
}
let initialBlockBoxes: BlockBox[] = []

let hideHandleTimeout: ReturnType<typeof setTimeout> | null = null

// Extension that provides Notion-style Mod-a (Cmd+A / Ctrl+A):
// First press selects only the active block's text. Second press selects all blocks.
const BlockSelectAll = Extension.create({
  name: 'blockSelectAll',
  addKeyboardShortcuts() {
    return {
      'Mod-a': ({ editor: ed }) => {
        const { state, commands } = ed
        const { selection } = state
        const { $from } = selection

        if ($from.depth < 1) return false
        const blockPos = $from.before(1)
        const node = state.doc.nodeAt(blockPos)
        if (!node) return false

        const contentStart = blockPos + 1
        const contentEnd = blockPos + node.nodeSize - 1

        // If selection doesn't already span the entire active block, select only this block
        if (selection.from !== contentStart || selection.to !== contentEnd) {
          commands.setTextSelection({ from: contentStart, to: contentEnd })
          return true
        }

        // If already selected the active block, allow default selectAll (all document)
        return false
      },
    }
  },
})

function handleEditorClick(event: MouseEvent) {
  const target = event.target as HTMLElement | null
  const anchor = target?.closest('a')
  if (anchor) {
    const href = anchor.getAttribute('href')
    if (href) {
      event.preventDefault()
      event.stopPropagation()
      openExternalUrl(href)
    }
  }
}

const editor = useEditor({
  content: props.content,
  extensions: [
    StarterKit.configure({
      codeBlock: false, // Replaced by CodeBlockLowlight
      dropcursor: false, // Prevent ProseMirror dropCursor plugin from re-rendering DOM and clearing transforms during drag
    }),
    CodeBlockLowlight.configure({
      lowlight,
      defaultLanguage: 'plaintext',
    }).extend({
      addNodeView() {
        return VueNodeViewRenderer(CodeBlockNode)
      },
    }),
    Markdown.configure({
      html: true,
      tightLists: true,
      bulletListMarker: '-',
      transformPastedText: true,
      transformCopiedText: true,
    }),
    Placeholder.configure({
      placeholder: 'Comienza a escribir...',
    }),
    Typography,
    Link.configure({
      openOnClick: true,
      autolink: true,
      linkOnPaste: true,
      HTMLAttributes: {
        target: '_blank',
        rel: 'noopener noreferrer',
      },
    }),
    Table.configure({
      resizable: true,
    }),
    TableRow,
    TableCell,
    TableHeader,
    TaskList,
    TaskItem.configure({
      nested: true,
    }),
    Image.extend({
      draggable: false, // Block drag handle controls dragging; prevent native image drag
    }).configure({
      inline: false,
      allowBase64: false,
      HTMLAttributes: {
        class: 'w-full rounded-xl object-cover',
      },
    }),
    BlockSelectAll,
  ],
  editorProps: {
    scrollThreshold: { top: 80, bottom: 200, left: 0, right: 0 },
    scrollMargin: { top: 80, bottom: 200, left: 0, right: 0 },
    attributes: {
      class:
        'prose max-w-none text-on-surface/90 focus:outline-none min-h-[400px] text-lg leading-relaxed',
    },
    handleClick(_view, _pos, event) {
      const target = event.target as HTMLElement | null
      const anchor = target?.closest('a')
      if (anchor) {
        const href = anchor.getAttribute('href')
        if (href) {
          event.preventDefault()
          event.stopPropagation()
          openExternalUrl(href)
          return true
        }
      }
      return false
    },
  },
  onUpdate: ({ editor: e }) => {
    const md = (e.storage as unknown as MarkdownStorage).markdown.getMarkdown()
    emit('update:content', md)
    ensureCursorVisible()
  },
  onSelectionUpdate: () => {
    ensureCursorVisible()
  },
})

function getScrollContainer(): HTMLElement {
  let el: HTMLElement | null = editorContainerRef.value
  while (el && el !== document.body) {
    const style = getComputedStyle(el)
    if (
      (style.overflowY === 'auto' || style.overflowY === 'scroll') &&
      el.scrollHeight > el.clientHeight
    ) {
      return el
    }
    el = el.parentElement
  }
  const fallback = editorContainerRef.value?.closest('.overflow-y-auto') as HTMLElement | null
  return fallback || (document.scrollingElement as HTMLElement) || document.documentElement
}

function ensureCursorVisible() {
  if (!editor.value?.view) return
  const view = editor.value.view
  const { state } = view
  const { selection } = state

  let coords: { top: number; bottom: number; left: number; right: number } | null = null
  try {
    coords = view.coordsAtPos(selection.from)
  } catch {
    return
  }
  if (!coords) return

  const container = getScrollContainer()
  const isWindow = container === document.documentElement || container === document.body
  const containerRect = isWindow
    ? { top: 0, bottom: window.innerHeight }
    : container.getBoundingClientRect()

  // Safe bottom margin (180px) to keep the cursor and active line well above
  // the floating bottom toolbar (bottom-16 = 64px + toolbar height 48px + margin)
  const BOTTOM_SAFETY_MARGIN = 180
  const threshold = containerRect.bottom - BOTTOM_SAFETY_MARGIN

  if (coords.bottom > threshold) {
    const diff = coords.bottom - threshold
    if (isWindow) {
      window.scrollBy({ top: diff })
    } else {
      container.scrollTop += diff
    }
  }
}

// Helper to get all top-level DOM block elements inside the editor
function getTiptapBlockElements(): HTMLElement[] {
  if (!editorContainerRef.value) return []
  const tiptapEl = editorContainerRef.value.querySelector('.tiptap')
  if (!tiptapEl) return []
  return Array.from(tiptapEl.children) as HTMLElement[]
}

// Calculate target index (0 to N - 1) among blocks
function findNewIndex(sourceIdx: number, deltaY: number, clientY: number): number {
  if (initialBlockBoxes.length <= 1) return sourceIdx
  const sourceBox = initialBlockBoxes[sourceIdx]
  if (!sourceBox) return sourceIdx

  const draggedMidpoint = sourceBox.midpoint + deltaY

  let count = 0
  for (let i = 0; i < initialBlockBoxes.length; i++) {
    if (i === sourceIdx) continue
    const box = initialBlockBoxes[i]
    if (!box) continue

    if (i > sourceIdx) {
      // Neighbor is below source. Swaps when dragged block or cursor moves into it
      const threshold = Math.min(box.midpoint, box.top + Math.min(box.height / 2, 40))
      if (draggedMidpoint >= threshold || clientY >= threshold) {
        count++
      }
    } else {
      // Neighbor is above source. Swaps when dragged block or cursor moves above it
      const threshold = Math.max(box.midpoint, box.bottom - Math.min(box.height / 2, 40))
      if (draggedMidpoint >= threshold && clientY >= threshold) {
        count++
      }
    }
  }

  return Math.max(0, Math.min(count, initialBlockBoxes.length - 1))
}

// Fluid list reordering displacement: other blocks slide cleanly into the opened slot
function applyBlockDisplacement(sourceIdx: number, newIndex: number) {
  const children = getTiptapBlockElements()
  if (children.length === 0 || initialBlockBoxes.length === 0) return

  children.forEach((child, i) => {
    if (i === sourceIdx) return

    let translateY = 0
    if (newIndex < sourceIdx) {
      // Dragged item moved UP: items from newIndex to sourceIdx - 1 move DOWN
      if (i >= newIndex && i < sourceIdx) {
        const nextBox = initialBlockBoxes[i + 1]
        const currentBox = initialBlockBoxes[i]
        if (nextBox && currentBox) {
          translateY = nextBox.top - currentBox.top
        }
      }
    } else if (newIndex > sourceIdx) {
      // Dragged item moved DOWN: items from sourceIdx + 1 to newIndex move UP
      if (i > sourceIdx && i <= newIndex) {
        const prevBox = initialBlockBoxes[i - 1]
        const currentBox = initialBlockBoxes[i]
        if (prevBox && currentBox) {
          translateY = -(currentBox.top - prevBox.top)
        }
      }
    }

    child.style.transition = 'transform 0.18s cubic-bezier(0.2, 0, 0, 1)'
    child.style.transform = translateY !== 0 ? `translateY(${translateY}px)` : ''
  })
}

function clearBlockDisplacements() {
  const children = getTiptapBlockElements()
  children.forEach((child) => {
    child.style.transform = ''
    child.style.transition = ''
    child.style.zIndex = ''
    child.style.position = ''
    child.classList.remove('is-being-dragged')
  })
  initialBlockBoxes = []
}

function updateHandleForMouse(clientY: number) {
  if (isDragging.value) return
  if (hideHandleTimeout) {
    clearTimeout(hideHandleTimeout)
    hideHandleTimeout = null
  }

  const container = editorContainerRef.value
  if (!container) return

  const containerRect = container.getBoundingClientRect()
  const children = getTiptapBlockElements()
  if (children.length === 0) return

  // Find which block corresponds to the mouse Y position
  let foundIdx = -1
  for (let i = 0; i < children.length; i++) {
    const child = children[i]
    if (!child) continue
    const rect = child.getBoundingClientRect()
    if (clientY >= rect.top - 8 && clientY <= rect.bottom + 8) {
      foundIdx = i
      break
    }
  }

  if (foundIdx === -1) {
    let minDistance = Infinity
    for (let i = 0; i < children.length; i++) {
      const child = children[i]
      if (!child) continue
      const rect = child.getBoundingClientRect()
      const mid = rect.top + rect.height / 2
      const dist = Math.abs(clientY - mid)
      if (dist < minDistance) {
        minDistance = dist
        foundIdx = i
      }
    }
  }

  const targetEl = foundIdx !== -1 ? children[foundIdx] : undefined
  if (foundIdx !== -1 && targetEl) {
    const rect = targetEl.getBoundingClientRect()
    activeBlockIndex.value = foundIdx

    // For images, align handle near the top; for text, align with the first line
    const isImg = targetEl.tagName === 'IMG' || targetEl.querySelector('img') !== null
    const verticalOffset = isImg ? 8 : Math.max(0, Math.min(8, (rect.height - 24) / 2))
    handleTop.value = rect.top - containerRect.top + verticalOffset
    handleVisible.value = true
  }
}

function handleMouseMove(event: MouseEvent) {
  updateHandleForMouse(event.clientY)
}

function handleGlobalMouseMove(event: MouseEvent) {
  if (isDragging.value) return
  const container = editorContainerRef.value
  if (!container) return

  const containerRect = container.getBoundingClientRect()

  // Gutter hover zone: extends 80px to the left of the container (covering the left gutter area)
  // and across the full editor width
  if (
    event.clientX >= containerRect.left - 80 &&
    event.clientX <= containerRect.right + 40 &&
    event.clientY >= containerRect.top - 20 &&
    event.clientY <= containerRect.bottom + 20
  ) {
    updateHandleForMouse(event.clientY)
  } else if (handleVisible.value && !hideHandleTimeout) {
    hideHandleTimeout = setTimeout(() => {
      handleVisible.value = false
    }, 300)
  }
}

function handleMouseLeave() {
  if (isDragging.value) return
  hideHandleTimeout = setTimeout(() => {
    handleVisible.value = false
  }, 400)
}

function handlePointerDown(event: PointerEvent) {
  if (event.button !== 0) return // Left click only
  if (activeBlockIndex.value === null || !editor.value?.view) return

  const index = activeBlockIndex.value
  const children = getTiptapBlockElements()
  if (index < 0 || index >= children.length) return

  event.preventDefault()
  isDragging.value = true
  dragStartY = event.clientY
  initialHandleTop = handleTop.value ?? 0

  // Snapshot untransformed bounding boxes to prevent measurement thrashing during live displacement
  initialBlockBoxes = children.map((el) => {
    const rect = el.getBoundingClientRect()
    return {
      top: rect.top,
      bottom: rect.bottom,
      height: rect.height,
      midpoint: rect.top + rect.height / 2,
    }
  })

  // Clear text selection and blur editor so no cursor is active to receive text drops
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur()
  }

  const targetEl = children[index]
  if (targetEl) {
    targetEl.classList.add('is-being-dragged')
    targetEl.style.position = 'relative'
    targetEl.style.zIndex = '35'
    targetEl.style.transition = 'none'
  }

  window.addEventListener('pointermove', handlePointerMove, { passive: false })
  window.addEventListener('pointerup', handlePointerUp)
  window.addEventListener('pointercancel', handlePointerCancel)
}

function handlePointerMove(event: PointerEvent) {
  if (!isDragging.value || activeBlockIndex.value === null) return
  event.preventDefault()

  const sourceIdx = activeBlockIndex.value
  const children = getTiptapBlockElements()
  const targetEl = children[sourceIdx]
  const sourceBox = initialBlockBoxes[sourceIdx]
  if (!targetEl || !sourceBox) return

  const deltaY = event.clientY - dragStartY

  // 1. Physically displace the dragged block along the vertical axis with the cursor
  targetEl.style.transform = `translateY(${deltaY}px)`

  // 2. Also displace the drag handle alongside the block
  handleTop.value = initialHandleTop + deltaY

  // 3. Compute dynamic target index and fluidly displace neighboring items
  const newIndex = findNewIndex(sourceIdx, deltaY, event.clientY)
  currentDropIndex.value = newIndex
  applyBlockDisplacement(sourceIdx, newIndex)

  // 4. Auto-scroll when dragging near viewport/container edges
  const scrollContainer = editorContainerRef.value?.closest('.overflow-y-auto')
  if (scrollContainer) {
    const rect = scrollContainer.getBoundingClientRect()
    if (event.clientY < rect.top + 60) {
      scrollContainer.scrollTop -= 8
    } else if (event.clientY > rect.bottom - 60) {
      scrollContainer.scrollTop += 8
    }
  }
}

function handlePointerUp() {
  cleanupPointerListeners()
  commitDrop()
}

function handlePointerCancel() {
  cleanupPointerListeners()
  cancelDrag()
}

function cleanupPointerListeners() {
  window.removeEventListener('pointermove', handlePointerMove)
  window.removeEventListener('pointerup', handlePointerUp)
  window.removeEventListener('pointercancel', handlePointerCancel)
}

function commitDrop() {
  if (!isDragging.value || !editor.value?.view || activeBlockIndex.value === null) {
    cancelDrag()
    return
  }

  const sourceIndex = activeBlockIndex.value
  const targetIndex = currentDropIndex.value

  cleanupPointerListeners()
  clearBlockDisplacements()
  resetDragState()

  if (targetIndex === null || targetIndex === sourceIndex) {
    return
  }

  const view = editor.value.view
  const doc = view.state.doc
  const childCount = doc.childCount

  if (
    sourceIndex < 0 ||
    sourceIndex >= childCount ||
    targetIndex < 0 ||
    targetIndex >= childCount
  ) {
    return
  }

  // Calculate start position of source node
  let sourceStart = 0
  for (let i = 0; i < sourceIndex; i++) {
    sourceStart += doc.child(i).nodeSize
  }
  const nodeToMove = doc.child(sourceIndex)
  const sourceEnd = sourceStart + nodeToMove.nodeSize

  const tr = view.state.tr

  // 1. Delete source node from document
  tr.delete(sourceStart, sourceEnd)

  // 2. In modified document (which now has childCount - 1 nodes),
  // calculate exact target insertion position for targetIndex
  let insertPos = 0
  for (let i = 0; i < targetIndex; i++) {
    insertPos += tr.doc.child(i).nodeSize
  }

  // 3. Insert complete node at target position
  tr.insert(insertPos, nodeToMove)

  view.dispatch(tr)

  const md = (editor.value.storage as unknown as MarkdownStorage).markdown.getMarkdown()
  emit('update:content', md)
}

function cancelDrag() {
  cleanupPointerListeners()
  clearBlockDisplacements()
  resetDragState()
}

function handleGlobalKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && isDragging.value) {
    event.preventDefault()
    event.stopPropagation()
    cancelDrag()
  }
}

function resetDragState() {
  isDragging.value = false
  currentDropIndex.value = null
  handleVisible.value = false
}

function handleAiButtonClick() {
  if (activeBlockIndex.value === null || !editor.value?.view) return
  const index = activeBlockIndex.value
  const doc = editor.value.view.state.doc
  if (index < 0 || index >= doc.childCount) return

  const node = doc.child(index)
  const blockContent = node.textContent || ''
  const children = getTiptapBlockElements()
  const targetEl = children[index]
  const rect = targetEl ? targetEl.getBoundingClientRect() : null
  const top = handleTop.value ?? (targetEl ? targetEl.offsetTop : 0)

  emit('ai-block-click', {
    index,
    content: blockContent,
    top,
    rect,
  })
}

// Watch for active AI block highlighting
watch(
  () => props.highlightedBlockIndex,
  (newIdx) => {
    const children = getTiptapBlockElements()
    children.forEach((el, idx) => {
      if (newIdx !== null && newIdx !== undefined && idx === newIdx) {
        el.classList.add('ai-active-block')
      } else {
        el.classList.remove('ai-active-block')
      }
    })
  },
  { flush: 'post' },
)

// Update editor content when prop changes externally (e.g. loading a different note)
watch(
  () => props.content,
  (newContent) => {
    if (!editor.value) return
    const currentContent = (
      editor.value.storage as unknown as MarkdownStorage
    ).markdown.getMarkdown()
    if (currentContent !== newContent) {
      editor.value.commands.setContent(newContent, { emitUpdate: false })
    }
  },
)

onMounted(() => {
  window.addEventListener('mousemove', handleGlobalMouseMove, { passive: true })
  window.addEventListener('keydown', handleGlobalKeydown, true)
})

onBeforeUnmount(() => {
  cleanupPointerListeners()
  window.removeEventListener('mousemove', handleGlobalMouseMove)
  window.removeEventListener('keydown', handleGlobalKeydown, true)
  if (hideHandleTimeout) clearTimeout(hideHandleTimeout)
  clearBlockDisplacements()
  editor.value?.destroy()
})

function getBlockContent(index: number): string {
  if (!editor.value?.view) return ''
  const doc = editor.value.view.state.doc
  if (index < 0 || index >= doc.childCount) return ''
  const node = doc.child(index)
  return node.textContent || ''
}

defineExpose({ editor, getBlockContent })
</script>

<template>
  <div
    ref="editorContainerRef"
    class="editor-block-container relative -ml-12 pl-12 -mr-4 pr-4"
    @mousemove="handleMouseMove"
    @mouseleave="handleMouseLeave"
  >
    <!-- Notion-style Block Gutter Handles (Drag & AI Sparkles) -->
    <div
      v-show="handleVisible && handleTop !== null"
      class="block-gutter-handles absolute left-1 z-20 flex items-center gap-0.5 select-none"
      :style="{ top: `${handleTop}px` }"
    >
      <!-- AI Sparkles Button (shown when AI is configured) -->
      <button
        v-if="settingsStore.isAiConfigured"
        type="button"
        class="ai-block-sparkles-btn flex items-center justify-center w-6 h-6 rounded-md text-primary hover:text-primary hover:bg-primary/10 transition-all duration-150 cursor-pointer"
        title="Consultar a la IA sobre este bloque"
        aria-label="Consultar a la IA sobre este bloque"
        @click.stop="handleAiButtonClick"
      >
        <UiIcon name="auto_awesome" size="sm" class="text-[16px]" />
      </button>

      <!-- Drag Handle -->
      <div
        class="block-drag-handle flex items-center justify-center w-6 h-6 rounded-md cursor-grab active:cursor-grabbing text-outline hover:text-primary hover:bg-black/5 dark:hover:bg-white/10 transition-colors duration-150 select-none touch-none"
        title="Arrastrar para mover bloque (Esc para cancelar)"
        @pointerdown="handlePointerDown"
      >
        <svg class="w-3.5 h-3.5 pointer-events-none" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="8.5" cy="6.5" r="1.5" />
          <circle cx="15.5" cy="6.5" r="1.5" />
          <circle cx="8.5" cy="12" r="1.5" />
          <circle cx="15.5" cy="12" r="1.5" />
          <circle cx="8.5" cy="17.5" r="1.5" />
          <circle cx="15.5" cy="17.5" r="1.5" />
        </svg>
      </div>
    </div>

    <!-- Tiptap Editor Content -->
    <EditorContent
      :editor="editor"
      @click="handleEditorClick"
      @input="ensureCursorVisible"
      @keyup="ensureCursorVisible"
    />
  </div>
</template>

<style>
/* Tiptap editor styles */
.tiptap {
  outline: none;
}

/* Being dragged block styling - moves directly with the cursor without background glitch */
.tiptap > *.is-being-dragged {
  opacity: 0.8;
  cursor: grabbing !important;
  pointer-events: none;
  z-index: 40 !important;
}

/* Highlighted active block when discussing with AI */
.tiptap > *.ai-active-block {
  border-radius: 0.75rem;
  background-color: rgba(79, 96, 86, 0.08);
  box-shadow: 0 0 0 2px rgba(79, 96, 86, 0.35);
  transition: all 0.2s ease-in-out;
}

/* Clear, distinct Notion/Medium vertical block spacing */
.tiptap > * {
  margin-top: 1rem !important;
  margin-bottom: 1rem !important;
}

.tiptap p.is-editor-empty:first-child::before {
  content: attr(data-placeholder);
  float: left;
  color: var(--color-outline-variant);
  pointer-events: none;
  height: 0;
}

.tiptap > h1 {
  font-family: var(--font-display);
  font-size: 2rem;
  font-weight: 700;
  line-height: 1.2;
  margin-top: 2.25rem !important;
  margin-bottom: 0.85rem !important;
}

.tiptap > h2 {
  font-family: var(--font-display);
  font-size: 1.5rem;
  font-weight: 600;
  line-height: 1.3;
  margin-top: 1.85rem !important;
  margin-bottom: 0.65rem !important;
}

.tiptap > h3 {
  font-family: var(--font-display);
  font-size: 1.25rem;
  font-weight: 600;
  line-height: 1.4;
  margin-top: 1.5rem !important;
  margin-bottom: 0.5rem !important;
}

.tiptap > p {
  margin-top: 0.85rem !important;
  margin-bottom: 0.85rem !important;
  line-height: 1.75;
}

.tiptap > ul,
.tiptap > ol {
  padding-left: 1.5rem;
  margin-top: 0.85rem !important;
  margin-bottom: 0.85rem !important;
}

.tiptap ul {
  list-style-type: disc;
}

.tiptap ol {
  list-style-type: decimal;
}

.tiptap li {
  margin-bottom: 0.35rem;
}

.tiptap blockquote {
  border-left: 3px solid var(--color-primary);
  padding-left: 1rem;
  margin: 1.75rem 0 !important;
  font-style: italic;
  color: var(--color-on-surface-variant);
}

.tiptap pre {
  background: var(--bc-glass-input-bg);
  border: 1px solid var(--color-outline-variant);
  border-radius: 0.5rem;
  padding: 1rem;
  font-family: var(--font-mono);
  font-size: 0.875rem;
  overflow-x: auto;
  margin: 1.25rem 0 !important;
  position: relative;
}

.tiptap code {
  background: var(--bc-glass-input-bg);
  border-radius: 0.25rem;
  padding: 0.15rem 0.3rem;
  font-family: var(--font-mono);
  font-size: 0.875em;
}

.tiptap pre code {
  background: none;
  padding: 0;
  border-radius: 0;
  font-size: inherit;
}

/* Language label */
.tiptap pre::before {
  content: attr(data-language);
  position: absolute;
  top: 0.5rem;
  right: 0.75rem;
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-outline);
  font-family: var(--font-sans);
  font-weight: 500;
}

/* Syntax highlighting - Light mode (sage-inspired) */
.tiptap pre .hljs-keyword,
.tiptap pre .hljs-selector-tag,
.tiptap pre .hljs-built_in {
  color: #4f6056;
  font-weight: 600;
}

.tiptap pre .hljs-string,
.tiptap pre .hljs-addition {
  color: #3a6b4f;
}

.tiptap pre .hljs-number,
.tiptap pre .hljs-literal {
  color: #8b5c2a;
}

.tiptap pre .hljs-comment,
.tiptap pre .hljs-quote {
  color: #737874;
  font-style: italic;
}

.tiptap pre .hljs-function,
.tiptap pre .hljs-title {
  color: #3a4a41;
  font-weight: 600;
}

.tiptap pre .hljs-variable,
.tiptap pre .hljs-template-variable,
.tiptap pre .hljs-attr {
  color: #506357;
}

.tiptap pre .hljs-type,
.tiptap pre .hljs-class {
  color: #5e7a68;
}

.tiptap pre .hljs-tag,
.tiptap pre .hljs-name {
  color: #4f6056;
}

.tiptap pre .hljs-attribute {
  color: #6b8f7a;
}

.tiptap pre .hljs-symbol,
.tiptap pre .hljs-bullet {
  color: #7a5c3a;
}

.tiptap pre .hljs-deletion {
  color: #ba1a1a;
}

.tiptap pre .hljs-meta {
  color: #737874;
}

/* Syntax highlighting - Dark mode */
.dark .tiptap pre .hljs-keyword,
.dark .tiptap pre .hljs-selector-tag,
.dark .tiptap pre .hljs-built_in {
  color: #b8cbbf;
  font-weight: 600;
}

.dark .tiptap pre .hljs-string,
.dark .tiptap pre .hljs-addition {
  color: #8fd4a8;
}

.dark .tiptap pre .hljs-number,
.dark .tiptap pre .hljs-literal {
  color: #e0b080;
}

.dark .tiptap pre .hljs-comment,
.dark .tiptap pre .hljs-quote {
  color: #8d918d;
  font-style: italic;
}

.dark .tiptap pre .hljs-function,
.dark .tiptap pre .hljs-title {
  color: #d4e7da;
  font-weight: 600;
}

.dark .tiptap pre .hljs-variable,
.dark .tiptap pre .hljs-template-variable,
.dark .tiptap pre .hljs-attr {
  color: #b7ccbd;
}

.dark .tiptap pre .hljs-type,
.dark .tiptap pre .hljs-class {
  color: #a3c4ad;
}

.dark .tiptap pre .hljs-tag,
.dark .tiptap pre .hljs-name {
  color: #b8cbbf;
}

.dark .tiptap pre .hljs-attribute {
  color: #9ec2a8;
}

.dark .tiptap pre .hljs-symbol,
.dark .tiptap pre .hljs-bullet {
  color: #d4a76a;
}

.dark .tiptap pre .hljs-deletion {
  color: #ffa0a0;
}

.dark .tiptap pre .hljs-meta {
  color: #8d918d;
}

/* Links */
.tiptap a {
  color: #2563eb;
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;
  word-break: break-word;
  transition:
    opacity 0.15s ease,
    color 0.15s ease;
}

.tiptap a:hover {
  color: #1d4ed8;
  opacity: 0.85;
}

.dark .tiptap a {
  color: #60a5fa;
}

.dark .tiptap a:hover {
  color: #93c5fd;
}

.tiptap hr {
  border: none;
  border-top: 1px solid var(--color-outline-variant);
  margin: 2.25rem 0 !important;
}

/* Task list (checks) */
.tiptap ul[data-type='taskList'] {
  list-style: none;
  padding-left: 0;
}

.tiptap ul[data-type='taskList'] li {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  margin-bottom: 0.35rem;
}

.tiptap ul[data-type='taskList'] li > label {
  flex-shrink: 0;
  margin-top: 0.2rem;
}

.tiptap ul[data-type='taskList'] li > label input[type='checkbox'] {
  appearance: none;
  width: 1.1rem;
  height: 1.1rem;
  border: 2px solid var(--color-outline);
  border-radius: 0.25rem;
  cursor: pointer;
  position: relative;
}

.tiptap ul[data-type='taskList'] li > label input[type='checkbox']:checked {
  background-color: var(--color-primary);
  border-color: var(--color-primary);
}

.tiptap ul[data-type='taskList'] li > label input[type='checkbox']:checked::after {
  content: '✓';
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 0.7rem;
  font-weight: bold;
}

.tiptap ul[data-type='taskList'] li[data-checked='true'] > div > p {
  text-decoration: line-through;
  opacity: 0.6;
}

/* Table */
.tiptap table {
  border-collapse: collapse;
  width: 100%;
  margin: 1.25rem 0 !important;
  overflow: hidden;
  border-radius: 0.5rem;
  border: 1px solid var(--color-outline-variant);
}

.tiptap table td,
.tiptap table th {
  border: 1px solid var(--color-outline-variant);
  padding: 0.5rem 0.75rem;
  text-align: left;
  vertical-align: top;
  min-width: 80px;
}

.tiptap table th {
  background: var(--bc-glass-input-bg);
  font-weight: 600;
  font-size: 0.875rem;
}

.tiptap table td {
  font-size: 0.875rem;
}

.tiptap table .selectedCell {
  background: rgba(79, 96, 86, 0.1);
}

.tiptap table .column-resize-handle {
  position: absolute;
  right: -2px;
  top: 0;
  bottom: 0;
  width: 4px;
  cursor: col-resize;
  background-color: var(--color-primary);
  opacity: 0;
  transition: opacity 0.2s;
}

.tiptap table .column-resize-handle:hover,
.tiptap table .resize-cursor {
  opacity: 1;
}

/* Image */
.tiptap img {
  width: 100% !important;
  max-width: 100% !important;
  height: auto;
  display: block;
  border-radius: 0.75rem;
  margin: 1.5rem 0 !important;
  -webkit-user-drag: none;
  user-select: none;
  pointer-events: auto;
}

.tiptap *:has(> img),
.tiptap div:has(> img) {
  width: 100% !important;
}

.tiptap img.ProseMirror-selectednode {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
</style>
