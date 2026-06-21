<script setup lang="ts">
import { ref, computed } from 'vue'
import UiButton from './UiButton.vue'
import UiIcon from './UiIcon.vue'
import type { Note } from '@/types/note'
import type { Folder } from '@/types/folder'

interface Props {
  open: boolean
  folderPath: string
  noteCount: number
}

const { open, folderPath, noteCount } = defineProps<Props>()

const emit = defineEmits<{
  complete: [option: 'export' | 'import' | 'empty']
  cancel: []
}>()

type MigrationStep = 'choose' | 'exporting' | 'error'

const step = ref<MigrationStep>('choose')
const exportProgress = ref(0)
const exportTotal = ref(0)
const errorMessage = ref('')
const failedNoteTitle = ref('')

const progressLabel = computed(() =>
  `${exportProgress.value} de ${exportTotal.value} notas exportadas`,
)

const progressPercent = computed(() =>
  exportTotal.value > 0 ? Math.round((exportProgress.value / exportTotal.value) * 100) : 0,
)

async function handleExport() {
  step.value = 'exporting'
  exportProgress.value = 0
  errorMessage.value = ''
  failedNoteTitle.value = ''

  try {
    const { db } = await import('@/services/db')
    const notes: Note[] = await db.notes.toArray()
    const folders: Folder[] = await db.folders.toArray()
    exportTotal.value = notes.length

    const { mkdir, writeTextFile } = await import('@tauri-apps/plugin-fs')
    const { serializeNote } = await import('@/services/frontmatter')
    const { slugify, resolveFilename } = await import('@/services/slug')

    // Create subdirectories for folders using slugified names
    // Build a map from old folder id (UUID) to new directory name
    const folderIdToPath = new Map<string, string>()
    for (const folder of folders) {
      const slug = slugify(folder.name)
      // For nested folders, use the parent's resolved path
      const parentDir = folder.parentFolder
        ? `${folderPath}/${folderIdToPath.get(folder.parentFolder) ?? folder.parentFolder}`
        : folderPath
      const dirPath = `${parentDir}/${slug}`
      const relativePath = folder.parentFolder
        ? `${folderIdToPath.get(folder.parentFolder) ?? folder.parentFolder}/${slug}`
        : slug
      folderIdToPath.set(folder.id, relativePath)
      await mkdir(dirPath, { recursive: true })
    }

    // Track written filenames per directory for collision resolution
    const filenamesPerDir = new Map<string, string[]>()

    for (const note of notes) {
      try {
        const dirPath = note.folder
          ? `${folderPath}/${folderIdToPath.get(note.folder) ?? note.folder}`
          : folderPath

        // Ensure directory exists (might be a subfolder not in the folders table)
        await mkdir(dirPath, { recursive: true })

        // Resolve unique filename
        const existing = filenamesPerDir.get(dirPath) ?? []
        const slug = slugify(note.title)
        const filename = resolveFilename(slug, existing)
        existing.push(filename)
        filenamesPerDir.set(dirPath, existing)

        const serialized = serializeNote(note)
        await writeTextFile(`${dirPath}/${filename}`, serialized)

        exportProgress.value++
      } catch (err: unknown) {
        failedNoteTitle.value = note.title
        errorMessage.value = err instanceof Error
          ? err.message
          : 'Error desconocido al escribir la nota.'
        step.value = 'error'
        return
      }
    }

    // Export complete — activate filesystem adapter
    const { activateFilesystemAdapter } = await import('@/services/activateFilesystemAdapter')
    await activateFilesystemAdapter(folderPath)

    emit('complete', 'export')
  } catch (err: unknown) {
    errorMessage.value = err instanceof Error
      ? err.message
      : 'Error inesperado durante la exportación.'
    step.value = 'error'
  }
}

async function handleImport() {
  try {
    const { activateFilesystemAdapter } = await import('@/services/activateFilesystemAdapter')
    await activateFilesystemAdapter(folderPath)
    emit('complete', 'import')
  } catch (err: unknown) {
    console.error('[Glosa] Error en handleImport:', err)
    errorMessage.value = err instanceof Error
      ? err.message
      : typeof err === 'string'
        ? err
        : 'Error al leer la carpeta seleccionada.'
    step.value = 'error'
  }
}

async function handleStartEmpty() {
  try {
    const { FilesystemAdapter } = await import('@/services/adapters/filesystem')
    const { setAdapter } = await import('@/services/storage')
    const adapter = new FilesystemAdapter(folderPath)
    // Don't call initialize() — no scanning, start empty
    setAdapter(adapter)
    emit('complete', 'empty')
  } catch (err: unknown) {
    errorMessage.value = err instanceof Error
      ? err.message
      : 'Error al inicializar el almacenamiento.'
    step.value = 'error'
  }
}

function handleRetry() {
  step.value = 'choose'
  errorMessage.value = ''
  failedNoteTitle.value = ''
}

function handleCancel() {
  if (step.value === 'exporting') return // Can't cancel mid-export
  step.value = 'choose'
  errorMessage.value = ''
  emit('cancel')
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="open"
        class="fixed inset-0 z-100 flex items-center justify-center p-4"
      >
        <!-- Backdrop -->
        <div
          class="absolute inset-0 bg-black/30 backdrop-blur-sm"
          @click="handleCancel"
        />

        <!-- Modal -->
        <div class="glass-panel-md relative z-10 w-full max-w-md rounded-2xl p-6 flex flex-col gap-5 animate-fade-up">
          <!-- Choose step -->
          <template v-if="step === 'choose'">
            <div class="flex items-center gap-3">
              <UiIcon name="sync_alt" class="text-primary" />
              <h2 class="font-display text-lg font-semibold text-on-surface">Migración de notas</h2>
            </div>

            <p class="text-sm text-secondary">
              Tienes {{ noteCount }} {{ noteCount === 1 ? 'nota' : 'notas' }} en almacenamiento local.
              ¿Cómo deseas iniciar la carpeta vinculada?
            </p>

            <div class="flex flex-col gap-3">
              <!-- Export option -->
              <button
                class="
                  flex items-start gap-3
                  p-4 rounded-xl
                  text-left
                  border border-outline-variant/30
                  transition-all duration-200
                  hover:border-primary/50 hover:bg-primary/5
                  dark:hover:bg-primary/10
                "
                @click="handleExport"
              >
                <UiIcon name="upload_file" class="text-primary mt-0.5 shrink-0" />
                <div>
                  <span class="text-sm font-medium text-on-surface">Exportar notas existentes</span>
                  <p class="text-xs text-secondary/70 mt-0.5">
                    Copia tus notas actuales como archivos .md en la carpeta seleccionada.
                  </p>
                </div>
              </button>

              <!-- Import option -->
              <button
                class="
                  flex items-start gap-3
                  p-4 rounded-xl
                  text-left
                  border border-outline-variant/30
                  transition-all duration-200
                  hover:border-primary/50 hover:bg-primary/5
                  dark:hover:bg-primary/10
                "
                @click="handleImport"
              >
                <UiIcon name="download" class="text-primary mt-0.5 shrink-0" />
                <div>
                  <span class="text-sm font-medium text-on-surface">Importar desde carpeta</span>
                  <p class="text-xs text-secondary/70 mt-0.5">
                    Usa los archivos .md que ya existen en la carpeta como tu set de trabajo.
                  </p>
                </div>
              </button>

              <!-- Start empty option -->
              <button
                class="
                  flex items-start gap-3
                  p-4 rounded-xl
                  text-left
                  border border-outline-variant/30
                  transition-all duration-200
                  hover:border-primary/50 hover:bg-primary/5
                  dark:hover:bg-primary/10
                "
                @click="handleStartEmpty"
              >
                <UiIcon name="note_add" class="text-primary mt-0.5 shrink-0" />
                <div>
                  <span class="text-sm font-medium text-on-surface">Comenzar vacío</span>
                  <p class="text-xs text-secondary/70 mt-0.5">
                    Inicia sin notas en la carpeta. Tus datos locales se conservan intactos.
                  </p>
                </div>
              </button>
            </div>

            <div class="flex items-center justify-end">
              <UiButton variant="ghost" size="sm" @click="handleCancel">
                Cancelar
              </UiButton>
            </div>
          </template>

          <!-- Exporting step -->
          <template v-if="step === 'exporting'">
            <div class="flex items-center gap-3">
              <UiIcon name="sync" class="text-primary animate-spin" />
              <h2 class="font-display text-lg font-semibold text-on-surface">Exportando notas…</h2>
            </div>

            <div class="flex flex-col gap-3">
              <p class="text-sm text-secondary">{{ progressLabel }}</p>

              <!-- Progress bar -->
              <div class="w-full h-2 rounded-full bg-outline-variant/20 overflow-hidden">
                <div
                  class="h-full rounded-full bg-primary transition-all duration-300"
                  :style="{ width: `${progressPercent}%` }"
                />
              </div>
            </div>
          </template>

          <!-- Error step -->
          <template v-if="step === 'error'">
            <div class="flex items-center gap-3">
              <UiIcon name="error" class="text-error" />
              <h2 class="font-display text-lg font-semibold text-on-surface">Error en la migración</h2>
            </div>

            <div class="flex flex-col gap-2">
              <p v-if="failedNoteTitle" class="text-sm text-secondary">
                Falló al exportar: <span class="font-medium text-on-surface">{{ failedNoteTitle }}</span>
              </p>
              <p class="text-sm text-error/80">{{ errorMessage }}</p>
              <p v-if="exportProgress > 0" class="text-xs text-secondary/60">
                {{ exportProgress }} notas se exportaron correctamente antes del error.
              </p>
            </div>

            <div class="flex items-center justify-end gap-3">
              <UiButton variant="ghost" size="sm" @click="handleCancel">
                Cancelar
              </UiButton>
              <UiButton variant="solid" size="sm" @click="handleRetry">
                <template #icon-left>
                  <UiIcon name="refresh" size="sm" />
                </template>
                Reintentar
              </UiButton>
            </div>
          </template>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
