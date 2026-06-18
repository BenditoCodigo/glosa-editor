<script setup lang="ts">
import { ref } from 'vue'
import type { Editor } from '@tiptap/vue-3'
import UiIconButton from '@/components/ui/UiIconButton.vue'
import UiPromptModal from '@/components/ui/UiPromptModal.vue'

interface Props {
  editor: Editor | undefined
}

const { editor } = defineProps<Props>()

const showLinkModal = ref(false)
const showImageModal = ref(false)
const linkInitialValue = ref('')

function toggleHeading() {
  editor?.chain().focus().toggleHeading({ level: 2 }).run()
}

function toggleBold() {
  editor?.chain().focus().toggleBold().run()
}

function toggleItalic() {
  editor?.chain().focus().toggleItalic().run()
}

function toggleBulletList() {
  editor?.chain().focus().toggleBulletList().run()
}

function toggleOrderedList() {
  editor?.chain().focus().toggleOrderedList().run()
}

function toggleTaskList() {
  editor?.chain().focus().toggleTaskList().run()
}

function toggleCodeBlock() {
  editor?.chain().focus().toggleCodeBlock().run()
}

function insertTable() {
  editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
}

function openLinkModal() {
  if (!editor) return
  linkInitialValue.value = editor.getAttributes('link').href || ''
  showLinkModal.value = true
}

function confirmLink(url: string) {
  showLinkModal.value = false
  if (!editor) return
  if (url === '') {
    editor.chain().focus().extendMarkRange('link').unsetLink().run()
    return
  }
  editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
}

function openImageModal() {
  showImageModal.value = true
}

function confirmImage(url: string) {
  showImageModal.value = false
  if (!editor || !url.trim()) return
  editor.chain().focus().setImage({ src: url.trim() }).run()
}
</script>

<template>
  <div class="
    glass-panel-md
    rounded-full p-2
    flex items-center gap-1
    transition-opacity duration-300
    opacity-60 hover:opacity-100
  ">
    <UiIconButton
      icon="format_h1"
      ariaLabel="Heading"
      size="sm"
      :class="editor?.isActive('heading') && 'bg-primary/10 text-primary'"
      @click="toggleHeading"
    />
    <UiIconButton
      icon="format_bold"
      ariaLabel="Bold"
      size="sm"
      :class="editor?.isActive('bold') && 'bg-primary/10 text-primary'"
      @click="toggleBold"
    />
    <UiIconButton
      icon="format_italic"
      ariaLabel="Italic"
      size="sm"
      :class="editor?.isActive('italic') && 'bg-primary/10 text-primary'"
      @click="toggleItalic"
    />

    <div class="w-px h-6 bg-outline-variant mx-1" />

    <UiIconButton
      icon="format_list_bulleted"
      ariaLabel="Bullet List"
      size="sm"
      :class="editor?.isActive('bulletList') && 'bg-primary/10 text-primary'"
      @click="toggleBulletList"
    />
    <UiIconButton
      icon="format_list_numbered"
      ariaLabel="Ordered List"
      size="sm"
      :class="editor?.isActive('orderedList') && 'bg-primary/10 text-primary'"
      @click="toggleOrderedList"
    />
    <UiIconButton
      icon="checklist"
      ariaLabel="Task List"
      size="sm"
      :class="editor?.isActive('taskList') && 'bg-primary/10 text-primary'"
      @click="toggleTaskList"
    />

    <div class="w-px h-6 bg-outline-variant mx-1" />

    <UiIconButton
      icon="table_chart"
      ariaLabel="Table"
      size="sm"
      :class="editor?.isActive('table') && 'bg-primary/10 text-primary'"
      @click="insertTable"
    />
    <UiIconButton
      icon="code"
      ariaLabel="Code Block"
      size="sm"
      :class="editor?.isActive('codeBlock') && 'bg-primary/10 text-primary'"
      @click="toggleCodeBlock"
    />

    <div class="w-px h-6 bg-outline-variant mx-1" />

    <UiIconButton
      icon="image"
      ariaLabel="Image"
      size="sm"
      @click="openImageModal"
    />
    <UiIconButton
      icon="link"
      ariaLabel="Link"
      size="sm"
      :class="editor?.isActive('link') && 'bg-primary/10 text-primary'"
      @click="openLinkModal"
    />
  </div>

  <!-- Modal: Link -->
  <UiPromptModal
    :open="showLinkModal"
    title="Insertar enlace"
    placeholder="https://ejemplo.com"
    :initialValue="linkInitialValue"
    confirmLabel="Aplicar"
    @confirm="confirmLink"
    @cancel="showLinkModal = false"
  />

  <!-- Modal: Image -->
  <UiPromptModal
    :open="showImageModal"
    title="Insertar imagen"
    placeholder="https://ejemplo.com/imagen.jpg"
    confirmLabel="Insertar"
    @confirm="confirmImage"
    @cancel="showImageModal = false"
  />
</template>
