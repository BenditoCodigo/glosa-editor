<script setup lang="ts">
import { onBeforeUnmount, watch } from 'vue'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Typography from '@tiptap/extension-typography'
import Link from '@tiptap/extension-link'

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
    StarterKit,
    Placeholder.configure({
      placeholder: 'Comienza a escribir...',
    }),
    Typography,
    Link.configure({
      openOnClick: false,
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
}

.tiptap hr {
  border: none;
  border-top: 1px solid var(--color-outline-variant);
  margin: 2rem 0;
}
</style>
