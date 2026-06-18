<script setup lang="ts">
import { onBeforeUnmount, watch } from 'vue'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Typography from '@tiptap/extension-typography'
import Link from '@tiptap/extension-link'
import { Table, TableRow, TableCell, TableHeader } from '@tiptap/extension-table'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Image from '@tiptap/extension-image'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { common, createLowlight } from 'lowlight'
import CodeBlockNode from './CodeBlockNode.vue'

const lowlight = createLowlight(common)

interface Props {
  content: string
}

const { content } = defineProps<Props>()

const emit = defineEmits<{
  'update:content': [value: string]
}>()

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
    Placeholder.configure({
      placeholder: 'Comienza a escribir...',
    }),
    Typography,
    Link.configure({
      openOnClick: false,
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
  ],
  editorProps: {
    attributes: {
      class: 'prose max-w-none text-on-surface/90 focus:outline-none min-h-[400px] text-lg leading-relaxed',
    },
  },
  onUpdate: ({ editor: e }) => {
    emit('update:content', e.getHTML())
  },
})

// Update editor content when prop changes externally (e.g. loading a different note)
watch(() => content, (newContent) => {
  if (!editor.value) return
  const currentContent = editor.value.getHTML()
  if (currentContent !== newContent) {
    editor.value.commands.setContent(newContent, { emitUpdate: false })
  }
})

onBeforeUnmount(() => {
  editor.value?.destroy()
})

defineExpose({ editor })
</script>

<template>
  <EditorContent :editor="editor" />
</template>

<style>
/* Tiptap editor styles */
.tiptap {
  outline: none;
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
