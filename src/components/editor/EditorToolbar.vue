<script setup lang="ts">
import type { Editor } from '@tiptap/vue-3'
import UiIconButton from '@/components/ui/UiIconButton.vue'

interface Props {
  editor: Editor | undefined
}

const { editor } = defineProps<Props>()

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

function toggleCodeBlock() {
  editor?.chain().focus().toggleCodeBlock().run()
}

function setLink() {
  if (!editor) return

  const previousUrl = editor.getAttributes('link').href
  const url = window.prompt('URL', previousUrl)

  if (url === null) return
  if (url === '') {
    editor.chain().focus().extendMarkRange('link').unsetLink().run()
    return
  }

  editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
}
</script>

<template>
  <div class="
    bg-surface-container-highest
    shadow-lg border border-outline-variant
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

    <div class="w-px h-6 bg-outline-variant mx-1" />

    <UiIconButton
      icon="code"
      ariaLabel="Code Block"
      size="sm"
      :class="editor?.isActive('codeBlock') && 'bg-primary/10 text-primary'"
      @click="toggleCodeBlock"
    />
    <UiIconButton
      icon="link"
      ariaLabel="Link"
      size="sm"
      @click="setLink"
    />
  </div>
</template>
