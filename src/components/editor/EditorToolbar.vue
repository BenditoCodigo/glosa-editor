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
const showHeadings = ref(false)
const linkInitialValue = ref('')

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
  <!-- Main toolbar only -->
  <div class="
    glass-panel-md
    rounded-full p-2
    flex items-center gap-1
    transition-opacity duration-300
    opacity-60 hover:opacity-100
  ">
    <!-- Heading selector (expands on hover) -->
    <div class="relative" @mouseenter="showHeadings = true" @mouseleave="showHeadings = false">
      <UiIconButton
        icon="format_h1"
        ariaLabel="Heading"
        tooltip="Encabezado"
        size="sm"
        :class="editor?.isActive('heading') && 'bg-primary/10 text-primary'"
        @click="editor?.chain().focus().toggleHeading({ level: 1 }).run()"
      />
      <!-- Heading options H2-H4 (expand upward) -->
      <div
        v-show="showHeadings"
        class="
          absolute bottom-full left-1/2 -translate-x-1/2 mb-2
          flex flex-col-reverse items-center gap-1.5
          pb-1
        "
      >
        <button
          class="
            w-9 h-9 rounded-full flex items-center justify-center
            bg-white/70 dark:bg-white/15 backdrop-blur-lg
            border border-white/80 dark:border-white/20
            shadow-lg
            text-sm font-bold text-on-surface
            transition-all duration-150
            hover:bg-primary hover:text-on-primary hover:scale-110
          "
          :class="editor?.isActive('heading', { level: 2 }) && '!bg-primary !text-on-primary'"
          title="Encabezado 2"
          @click="editor?.chain().focus().toggleHeading({ level: 2 }).run()"
        >
          H2
        </button>
        <button
          class="
            w-9 h-9 rounded-full flex items-center justify-center
            bg-white/70 dark:bg-white/15 backdrop-blur-lg
            border border-white/80 dark:border-white/20
            shadow-lg
            text-[13px] font-bold text-on-surface
            transition-all duration-150
            hover:bg-primary hover:text-on-primary hover:scale-110
          "
          :class="editor?.isActive('heading', { level: 3 }) && '!bg-primary !text-on-primary'"
          title="Encabezado 3"
          @click="editor?.chain().focus().toggleHeading({ level: 3 }).run()"
        >
          H3
        </button>
        <button
          class="
            w-9 h-9 rounded-full flex items-center justify-center
            bg-white/70 dark:bg-white/15 backdrop-blur-lg
            border border-white/80 dark:border-white/20
            shadow-lg
            text-xs font-bold text-on-surface
            transition-all duration-150
            hover:bg-primary hover:text-on-primary hover:scale-110
          "
          :class="editor?.isActive('heading', { level: 4 }) && '!bg-primary !text-on-primary'"
          title="Encabezado 4"
          @click="editor?.chain().focus().toggleHeading({ level: 4 }).run()"
        >
          H4
        </button>
      </div>
    </div>
    <UiIconButton
      icon="format_bold"
      ariaLabel="Bold"
      tooltip="Negrita"
      size="sm"
      :class="editor?.isActive('bold') && 'bg-primary/10 text-primary'"
      @click="toggleBold"
    />
    <UiIconButton
      icon="format_italic"
      ariaLabel="Italic"
      tooltip="Cursiva"
      size="sm"
      :class="editor?.isActive('italic') && 'bg-primary/10 text-primary'"
      @click="toggleItalic"
    />

    <div class="w-px h-6 bg-outline-variant mx-1" />

    <UiIconButton
      icon="format_list_bulleted"
      ariaLabel="Bullet List"
      tooltip="Lista con viñetas"
      size="sm"
      :class="editor?.isActive('bulletList') && 'bg-primary/10 text-primary'"
      @click="toggleBulletList"
    />
    <UiIconButton
      icon="format_list_numbered"
      ariaLabel="Ordered List"
      tooltip="Lista numerada"
      size="sm"
      :class="editor?.isActive('orderedList') && 'bg-primary/10 text-primary'"
      @click="toggleOrderedList"
    />
    <UiIconButton
      icon="checklist"
      ariaLabel="Task List"
      tooltip="Lista de tareas"
      size="sm"
      :class="editor?.isActive('taskList') && 'bg-primary/10 text-primary'"
      @click="toggleTaskList"
    />

    <div class="w-px h-6 bg-outline-variant mx-1" />

    <UiIconButton
      icon="table_chart"
      ariaLabel="Table"
      tooltip="Insertar tabla"
      size="sm"
      :class="editor?.isActive('table') && 'bg-primary/10 text-primary'"
      @click="insertTable"
    />

    <!-- Table controls (inline, only when inside a table) -->
    <template v-if="editor?.isActive('table')">
      <UiIconButton
        icon="add_column_right"
        ariaLabel="Agregar columna"
        tooltip="Agregar columna"
        size="sm"
        @click="editor?.chain().focus().addColumnAfter().run()"
      />
      <UiIconButton
        icon="add_row_below"
        ariaLabel="Agregar fila"
        tooltip="Agregar fila"
        size="sm"
        @click="editor?.chain().focus().addRowAfter().run()"
      />
      <UiIconButton
        icon="remove"
        ariaLabel="Eliminar columna"
        tooltip="Eliminar columna"
        size="sm"
        @click="editor?.chain().focus().deleteColumn().run()"
      />
      <UiIconButton
        icon="delete_sweep"
        ariaLabel="Eliminar fila"
        tooltip="Eliminar fila"
        size="sm"
        @click="editor?.chain().focus().deleteRow().run()"
      />
      <UiIconButton
        icon="delete"
        ariaLabel="Eliminar tabla"
        tooltip="Eliminar tabla"
        size="sm"
        @click="editor?.chain().focus().deleteTable().run()"
      />
    </template>

    <UiIconButton
      icon="code"
      ariaLabel="Code Block"
      tooltip="Bloque de código"
      size="sm"
      :class="editor?.isActive('codeBlock') && 'bg-primary/10 text-primary'"
      @click="toggleCodeBlock"
    />

    <div class="w-px h-6 bg-outline-variant mx-1" />

    <UiIconButton
      icon="image"
      ariaLabel="Image"
      tooltip="Insertar imagen"
      size="sm"
      @click="openImageModal"
    />
    <UiIconButton
      icon="link"
      ariaLabel="Link"
      tooltip="Insertar enlace"
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
