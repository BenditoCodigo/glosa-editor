<script setup lang="ts">
import { ref, onBeforeUnmount, watch } from 'vue'
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

const lowlight = createLowlight(common)

interface MarkdownStorage {
  markdown: {
    getMarkdown: () => string
  }
}

interface Props {
  content: string
}

const { content } = defineProps<Props>()

const emit = defineEmits<{
  'update:content': [value: string]
}>()

const editorContainerRef = ref<HTMLElement | null>(null)

// Block Drag & Drop State
const activeBlockIndex = ref<number | null>(null)
const handleTop = ref<number | null>(null)
const handleVisible = ref(false)
const isDragging = ref(false)
const dropIndicatorTop = ref<number | null>(null)
const dropTargetIndex = ref<number | null>(null)
const dropInsertAfter = ref(false)

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
  content,
  extensions: [
    StarterKit.configure({
      codeBlock: false, // Replaced by CodeBlockLowlight
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
    Image.configure({
      inline: false,
      allowBase64: false,
    }),
    BlockSelectAll,
  ],
  editorProps: {
    attributes: {
      class: 'prose max-w-none text-on-surface/90 focus:outline-none min-h-[400px] text-lg leading-relaxed',
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
    handleDrop(_view, event) {
      if (isDragging.value || event.dataTransfer?.types.includes('application/x-glosa-block-index')) {
        event.preventDefault()
        return true
      }
      return false
    },
  },
  onUpdate: ({ editor: e }) => {
    const md = (e.storage as unknown as MarkdownStorage).markdown.getMarkdown()
    emit('update:content', md)
  },
})

// Find top-level block node (depth 1) at a given mouse client coordinate
function findTopLevelBlockAtCoords(clientX: number, clientY: number) {
  if (!editor.value?.view) return null
  const view = editor.value.view

  const posInfo = view.posAtCoords({ left: clientX, top: clientY })
  if (!posInfo) return null

  const $pos = view.state.doc.resolve(posInfo.pos)
  const index = $pos.depth >= 1 ? $pos.index(0) : 0
  if (index < 0 || index >= view.state.doc.childCount) return null

  let blockPos = 0
  for (let i = 0; i < index; i++) {
    blockPos += view.state.doc.child(i).nodeSize
  }
  const blockNode = view.state.doc.child(index)
  const domNode = view.nodeDOM(blockPos) as HTMLElement | null

  return { index, pos: blockPos, node: blockNode, dom: domNode }
}

function findTopLevelBlockByIndex(index: number) {
  if (!editor.value?.view) return null
  const view = editor.value.view
  if (index < 0 || index >= view.state.doc.childCount) return null

  let blockPos = 0
  for (let i = 0; i < index; i++) {
    blockPos += view.state.doc.child(i).nodeSize
  }
  const blockNode = view.state.doc.child(index)
  const domNode = view.nodeDOM(blockPos) as HTMLElement | null

  return { index, pos: blockPos, node: blockNode, dom: domNode }
}

// Fluid CSS displacement of other blocks during drag
function applyBlockDisplacement(sourceIdx: number, targetIdx: number, insertAfter: boolean) {
  if (!editorContainerRef.value) return
  const tiptapEl = editorContainerRef.value.querySelector('.tiptap')
  if (!tiptapEl) return

  const children = Array.from(tiptapEl.children) as HTMLElement[]
  if (!children[sourceIdx]) return

  const sourceRect = children[sourceIdx].getBoundingClientRect()
  const shiftY = sourceRect.height + 12

  children.forEach((child, i) => {
    if (i === sourceIdx) return

    let translateY = 0
    if (sourceIdx < targetIdx) {
      // Dragging downwards: blocks between source and target shift up
      const limit = insertAfter ? targetIdx : targetIdx - 1
      if (i > sourceIdx && i <= limit) {
        translateY = -shiftY
      }
    } else if (sourceIdx > targetIdx) {
      // Dragging upwards: blocks between target and source shift down
      const limit = insertAfter ? targetIdx + 1 : targetIdx
      if (i < sourceIdx && i >= limit) {
        translateY = shiftY
      }
    }

    child.style.transition = 'transform 0.2s cubic-bezier(0.2, 0, 0, 1)'
    child.style.transform = translateY !== 0 ? `translateY(${translateY}px)` : ''
  })
}

function clearBlockDisplacements() {
  if (!editorContainerRef.value) return
  const tiptapEl = editorContainerRef.value.querySelector('.tiptap')
  if (!tiptapEl) return

  const children = Array.from(tiptapEl.children) as HTMLElement[]
  children.forEach((child) => {
    child.style.transform = ''
    child.style.transition = ''
    child.classList.remove('is-being-dragged')
  })
}

function handleMouseMove(event: MouseEvent) {
  if (isDragging.value) return
  if (hideHandleTimeout) clearTimeout(hideHandleTimeout)

  const container = editorContainerRef.value
  if (!container || !editor.value?.view) return

  const containerRect = container.getBoundingClientRect()
  // Search slightly to the right if mouse is hovering in the left gutter
  const searchX = Math.max(event.clientX, containerRect.left + 30)
  const block = findTopLevelBlockAtCoords(searchX, event.clientY)

  if (block && block.dom && block.dom.getBoundingClientRect) {
    const rect = block.dom.getBoundingClientRect()
    activeBlockIndex.value = block.index
    handleTop.value = rect.top - containerRect.top
    handleVisible.value = true
  }
}

function handleMouseLeave() {
  if (isDragging.value) return
  hideHandleTimeout = setTimeout(() => {
    handleVisible.value = false
  }, 300)
}

function handleDragStart(event: DragEvent) {
  if (activeBlockIndex.value === null || !editor.value?.view) {
    event.preventDefault()
    return
  }

  const view = editor.value.view
  const index = activeBlockIndex.value
  if (index < 0 || index >= view.state.doc.childCount) {
    event.preventDefault()
    return
  }

  isDragging.value = true

  // Clear text selection and blur editor so no cursor is active to receive text drops
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur()
  }

  const block = findTopLevelBlockByIndex(index)
  if (block?.dom) {
    block.dom.classList.add('is-being-dragged')
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move'
      // Use ONLY custom data type so browser doesn't interpret it as plain text insertion
      event.dataTransfer.setData('application/x-glosa-block-index', String(index))
      event.dataTransfer.setDragImage(block.dom, 20, 20)
    }
  }
}

function handleContainerDragOver(event: DragEvent) {
  if (!isDragging.value || !editor.value?.view || !editorContainerRef.value) return
  event.preventDefault()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }

  const container = editorContainerRef.value
  const containerRect = container.getBoundingClientRect()

  const searchX = Math.max(event.clientX, containerRect.left + 30)
  const block = findTopLevelBlockAtCoords(searchX, event.clientY)

  if (block && block.dom && block.dom.getBoundingClientRect && block.node) {
    const rect = block.dom.getBoundingClientRect()
    const midpoint = rect.top + rect.height / 2
    const isAbove = event.clientY < midpoint

    dropTargetIndex.value = block.index
    dropInsertAfter.value = !isAbove

    if (isAbove) {
      dropIndicatorTop.value = rect.top - containerRect.top
    } else {
      dropIndicatorTop.value = rect.bottom - containerRect.top
    }

    if (activeBlockIndex.value !== null) {
      applyBlockDisplacement(activeBlockIndex.value, block.index, !isAbove)
    }
  }
}

function handleContainerDrop(event: DragEvent) {
  if (!isDragging.value || !editor.value?.view) return
  event.preventDefault()
  event.stopPropagation()

  clearBlockDisplacements()

  const view = editor.value.view
  const doc = view.state.doc
  const sourceIndex = activeBlockIndex.value
  const targetIndex = dropTargetIndex.value
  const insertAfter = dropInsertAfter.value

  if (sourceIndex !== null && targetIndex !== null) {
    // Check if dropping on itself
    const isDroppingOnSelf =
      sourceIndex === targetIndex ||
      (insertAfter && targetIndex === sourceIndex - 1) ||
      (!insertAfter && targetIndex === sourceIndex + 1)

    if (!isDroppingOnSelf && sourceIndex >= 0 && sourceIndex < doc.childCount && targetIndex >= 0 && targetIndex < doc.childCount) {
      const nodeToMove = doc.child(sourceIndex)

      let sourceStart = 0
      for (let i = 0; i < sourceIndex; i++) {
        sourceStart += doc.child(i).nodeSize
      }
      const sourceEnd = sourceStart + nodeToMove.nodeSize

      const tr = view.state.tr

      // 1. Delete source node from document
      tr.delete(sourceStart, sourceEnd)

      // 2. In the new document after deletion, calculate exact target insertion position
      const newTargetIndex = targetIndex > sourceIndex ? targetIndex - 1 : targetIndex
      let insertPos = 0
      for (let i = 0; i < newTargetIndex; i++) {
        insertPos += tr.doc.child(i).nodeSize
      }
      if (insertAfter) {
        insertPos += tr.doc.child(newTargetIndex).nodeSize
      }

      // 3. Insert complete Node
      tr.insert(insertPos, nodeToMove)

      view.dispatch(tr)

      const md = (editor.value.storage as unknown as MarkdownStorage).markdown.getMarkdown()
      emit('update:content', md)
    }
  }

  resetDragState()
}

function handleDragEnd() {
  clearBlockDisplacements()
  resetDragState()
}

function resetDragState() {
  isDragging.value = false
  dropIndicatorTop.value = null
  dropTargetIndex.value = null
  dropInsertAfter.value = false
  handleVisible.value = false
}

// Update editor content when prop changes externally (e.g. loading a different note)
watch(() => content, (newContent) => {
  if (!editor.value) return
  const currentContent = (editor.value.storage as unknown as MarkdownStorage).markdown.getMarkdown()
  if (currentContent !== newContent) {
    editor.value.commands.setContent(newContent, { emitUpdate: false })
  }
})

onBeforeUnmount(() => {
  if (hideHandleTimeout) clearTimeout(hideHandleTimeout)
  clearBlockDisplacements()
  editor.value?.destroy()
})

defineExpose({ editor })
</script>

<template>
  <div
    ref="editorContainerRef"
    class="editor-block-container relative"
    @mousemove="handleMouseMove"
    @mouseleave="handleMouseLeave"
    @dragover="handleContainerDragOver"
    @drop="handleContainerDrop"
  >
    <!-- Notion-style Block Drag Handle -->
    <div
      v-show="handleVisible && handleTop !== null"
      class="block-drag-handle absolute -left-8 md:-left-9 z-20 flex items-center justify-center w-6 h-6 rounded-md cursor-grab active:cursor-grabbing text-outline hover:text-primary hover:bg-black/5 dark:hover:bg-white/10 transition-all duration-150"
      :style="{ top: `${handleTop}px` }"
      draggable="true"
      title="Arrastrar para mover bloque"
      @dragstart="handleDragStart"
      @dragend="handleDragEnd"
    >
      <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="8.5" cy="6.5" r="1.5" />
        <circle cx="15.5" cy="6.5" r="1.5" />
        <circle cx="8.5" cy="12" r="1.5" />
        <circle cx="15.5" cy="12" r="1.5" />
        <circle cx="8.5" cy="17.5" r="1.5" />
        <circle cx="15.5" cy="17.5" r="1.5" />
      </svg>
    </div>

    <!-- Drop Indicator Line -->
    <div
      v-if="isDragging && dropIndicatorTop !== null"
      class="drop-indicator absolute left-0 right-0 h-0.5 bg-primary z-30 pointer-events-none transition-all duration-75 flex items-center"
      :style="{ top: `${dropIndicatorTop}px` }"
    >
      <div class="w-2.5 h-2.5 rounded-full bg-primary -ml-1.5 shadow-md ring-2 ring-primary/30 animate-pulse" />
    </div>

    <!-- Tiptap Editor Content -->
    <EditorContent :editor="editor" @click="handleEditorClick" />
  </div>
</template>

<style>
/* Tiptap editor styles */
.tiptap {
  outline: none;
}

/* Being dragged block styling */
.tiptap > *.is-being-dragged {
  opacity: 0.35;
  filter: grayscale(0.5);
}

.tiptap p.is-editor-empty:first-child::before {
  content: attr(data-placeholder);
  float: left;
  color: var(--color-outline-variant);
  pointer-events: none;
  height: 0;
}

.tiptap h1 {
  font-family: var(--font-display);
  font-size: 2rem;
  font-weight: 700;
  line-height: 1.2;
  margin-top: 1.5rem;
  margin-bottom: 0.75rem;
}

.tiptap h2 {
  font-family: var(--font-display);
  font-size: 1.5rem;
  font-weight: 600;
  line-height: 1.3;
  margin-top: 1.25rem;
  margin-bottom: 0.5rem;
}

.tiptap h3 {
  font-family: var(--font-display);
  font-size: 1.25rem;
  font-weight: 600;
  line-height: 1.4;
  margin-top: 1rem;
  margin-bottom: 0.5rem;
}

.tiptap p {
  margin-bottom: 0.75rem;
}

.tiptap ul,
.tiptap ol {
  padding-left: 1.25rem;
  margin-bottom: 0.75rem;
}

.tiptap ul {
  list-style-type: disc;
}

.tiptap ol {
  list-style-type: decimal;
}

.tiptap li {
  margin-bottom: 0.25rem;
}

.tiptap blockquote {
  border-left: 3px solid var(--color-primary);
  padding-left: 1rem;
  margin: 1.5rem 0;
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
  margin: 1rem 0;
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
.tiptap pre .hljs-built_in { color: #4f6056; font-weight: 600; }

.tiptap pre .hljs-string,
.tiptap pre .hljs-addition { color: #3a6b4f; }

.tiptap pre .hljs-number,
.tiptap pre .hljs-literal { color: #8b5c2a; }

.tiptap pre .hljs-comment,
.tiptap pre .hljs-quote { color: #737874; font-style: italic; }

.tiptap pre .hljs-function,
.tiptap pre .hljs-title { color: #3a4a41; font-weight: 600; }

.tiptap pre .hljs-variable,
.tiptap pre .hljs-template-variable,
.tiptap pre .hljs-attr { color: #506357; }

.tiptap pre .hljs-type,
.tiptap pre .hljs-class { color: #5e7a68; }

.tiptap pre .hljs-tag,
.tiptap pre .hljs-name { color: #4f6056; }

.tiptap pre .hljs-attribute { color: #6b8f7a; }

.tiptap pre .hljs-symbol,
.tiptap pre .hljs-bullet { color: #7a5c3a; }

.tiptap pre .hljs-deletion { color: #ba1a1a; }

.tiptap pre .hljs-meta { color: #737874; }

/* Syntax highlighting - Dark mode */
.dark .tiptap pre .hljs-keyword,
.dark .tiptap pre .hljs-selector-tag,
.dark .tiptap pre .hljs-built_in { color: #b8cbbf; font-weight: 600; }

.dark .tiptap pre .hljs-string,
.dark .tiptap pre .hljs-addition { color: #8fd4a8; }

.dark .tiptap pre .hljs-number,
.dark .tiptap pre .hljs-literal { color: #e0b080; }

.dark .tiptap pre .hljs-comment,
.dark .tiptap pre .hljs-quote { color: #8d918d; font-style: italic; }

.dark .tiptap pre .hljs-function,
.dark .tiptap pre .hljs-title { color: #d4e7da; font-weight: 600; }

.dark .tiptap pre .hljs-variable,
.dark .tiptap pre .hljs-template-variable,
.dark .tiptap pre .hljs-attr { color: #b7ccbd; }

.dark .tiptap pre .hljs-type,
.dark .tiptap pre .hljs-class { color: #a3c4ad; }

.dark .tiptap pre .hljs-tag,
.dark .tiptap pre .hljs-name { color: #b8cbbf; }

.dark .tiptap pre .hljs-attribute { color: #9ec2a8; }

.dark .tiptap pre .hljs-symbol,
.dark .tiptap pre .hljs-bullet { color: #d4a76a; }

.dark .tiptap pre .hljs-deletion { color: #ffa0a0; }

.dark .tiptap pre .hljs-meta { color: #8d918d; }

/* Links */
.tiptap a {
  color: #2563eb;
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;
  word-break: break-word;
  transition: opacity 0.15s ease, color 0.15s ease;
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
  margin: 2rem 0;
}

/* Task list (checks) */
.tiptap ul[data-type="taskList"] {
  list-style: none;
  padding-left: 0;
}

.tiptap ul[data-type="taskList"] li {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}

.tiptap ul[data-type="taskList"] li > label {
  flex-shrink: 0;
  margin-top: 0.2rem;
}

.tiptap ul[data-type="taskList"] li > label input[type="checkbox"] {
  appearance: none;
  width: 1.1rem;
  height: 1.1rem;
  border: 2px solid var(--color-outline);
  border-radius: 0.25rem;
  cursor: pointer;
  position: relative;
}

.tiptap ul[data-type="taskList"] li > label input[type="checkbox"]:checked {
  background-color: var(--color-primary);
  border-color: var(--color-primary);
}

.tiptap ul[data-type="taskList"] li > label input[type="checkbox"]:checked::after {
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

.tiptap ul[data-type="taskList"] li[data-checked="true"] > div > p {
  text-decoration: line-through;
  opacity: 0.6;
}

/* Table */
.tiptap table {
  border-collapse: collapse;
  width: 100%;
  margin: 1rem 0;
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
  max-width: 100%;
  height: auto;
  border-radius: 0.5rem;
  margin: 1rem 0;
}

.tiptap img.ProseMirror-selectednode {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
</style>
