<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiIcon from '@/components/ui/UiIcon.vue'
import UiIconButton from '@/components/ui/UiIconButton.vue'
import { optimizeImageFile } from '@/utils/imageOptimizer'

interface Props {
  open: boolean
  initialValue?: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  confirm: [value: string]
  remove: []
  cancel: []
}>()

const activeTab = ref<'file' | 'url'>('file')
const urlValue = ref('')
const previewValue = ref<string | null>(null)
const isDragging = ref(false)
const isProcessing = ref(false)
const errorMessage = ref<string | null>(null)

const fileInputRef = ref<HTMLInputElement | null>(null)
const urlInputRef = ref<HTMLInputElement | null>(null)

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      previewValue.value = props.initialValue || null
      urlValue.value = props.initialValue?.startsWith('data:') ? '' : props.initialValue || ''
      activeTab.value = props.initialValue?.startsWith('http') ? 'url' : 'file'
      errorMessage.value = null
      isProcessing.value = false
      isDragging.value = false

      if (activeTab.value === 'url') {
        nextTick(() => urlInputRef.value?.focus())
      }
    }
  },
  { immediate: true },
)

function setTab(tab: 'file' | 'url') {
  activeTab.value = tab
  errorMessage.value = null
  if (tab === 'url') {
    nextTick(() => urlInputRef.value?.focus())
  }
}

async function processFile(file: File) {
  if (!file.type.startsWith('image/')) {
    errorMessage.value = 'Por favor selecciona un archivo de imagen válido (PNG, JPG, WebP, SVG).'
    return
  }

  isProcessing.value = true
  errorMessage.value = null

  try {
    const dataUrl = await optimizeImageFile(file, {
      maxWidth: 1920,
      maxHeight: 1080,
      quality: 0.85,
    })
    previewValue.value = dataUrl
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : 'Error al procesar la imagen'
  } finally {
    isProcessing.value = false
  }
}

function handleFileInputChange(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    processFile(file)
  }
  // Reset input so re-uploading the same file triggers change
  target.value = ''
}

function handleDrop(event: DragEvent) {
  event.preventDefault()
  isDragging.value = false
  const file = event.dataTransfer?.files?.[0]
  if (file) {
    processFile(file)
  }
}

function handleDragOver(event: DragEvent) {
  event.preventDefault()
  isDragging.value = true
}

function handleDragLeave(event: DragEvent) {
  event.preventDefault()
  isDragging.value = false
}

function handleUrlInput() {
  const trimmed = urlValue.value.trim()
  if (trimmed) {
    previewValue.value = trimmed
    errorMessage.value = null
  } else {
    previewValue.value = null
  }
}

function handleConfirm() {
  if (previewValue.value) {
    emit('confirm', previewValue.value)
  } else {
    emit('remove')
  }
}

function handleRemove() {
  previewValue.value = null
  urlValue.value = ''
  emit('remove')
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    emit('cancel')
  } else if (event.key === 'Enter' && activeTab.value === 'url') {
    event.preventDefault()
    handleConfirm()
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="open"
        class="fixed inset-0 z-[100] flex items-center justify-center p-4"
        @keydown="handleKeydown"
      >
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="emit('cancel')" />

        <!-- Modal -->
        <div
          class="glass-panel-md relative z-10 w-full max-w-lg rounded-2xl p-6 flex flex-col gap-5 shadow-2xl animate-fade-up"
        >
          <!-- Header -->
          <div class="flex items-center justify-between">
            <h2 class="font-display text-lg font-semibold text-on-surface">Imagen de portada</h2>
            <UiIconButton icon="close" ariaLabel="Cerrar" size="sm" @click="emit('cancel')" />
          </div>

          <!-- Mode switcher tabs -->
          <div
            class="flex items-center gap-1.5 p-1 bg-surface-lowest/50 rounded-xl border border-white/10 dark:border-white/5"
          >
            <button
              class="flex-1 flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg text-xs font-medium transition-all duration-150"
              :class="
                activeTab === 'file'
                  ? 'bg-primary text-on-primary shadow-sm font-semibold'
                  : 'text-secondary hover:text-on-surface hover:bg-white/5'
              "
              @click="setTab('file')"
            >
              <UiIcon name="upload_file" size="sm" />
              Subir archivo
            </button>
            <button
              class="flex-1 flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg text-xs font-medium transition-all duration-150"
              :class="
                activeTab === 'url'
                  ? 'bg-primary text-on-primary shadow-sm font-semibold'
                  : 'text-secondary hover:text-on-surface hover:bg-white/5'
              "
              @click="setTab('url')"
            >
              <UiIcon name="link" size="sm" />
              Enlace web (URL)
            </button>
          </div>

          <!-- Tab Content: File upload & Dropzone -->
          <div v-if="activeTab === 'file'" class="flex flex-col gap-3">
            <input
              ref="fileInputRef"
              type="file"
              accept="image/*"
              class="hidden"
              @change="handleFileInputChange"
            />

            <div
              class="relative flex flex-col items-center justify-center gap-3 p-8 rounded-xl border-2 border-dashed transition-all duration-150 cursor-pointer"
              :class="[
                isDragging
                  ? 'border-primary bg-primary/10 scale-[0.99]'
                  : 'border-outline/40 hover:border-primary/60 hover:bg-white/5 dark:hover:bg-white/5',
                isProcessing ? 'pointer-events-none opacity-60' : '',
              ]"
              @click="fileInputRef?.click()"
              @dragover="handleDragOver"
              @dragleave="handleDragLeave"
              @drop="handleDrop"
            >
              <div
                class="w-12 h-12 rounded-full flex items-center justify-center bg-primary/10 text-primary"
              >
                <UiIcon v-if="!isProcessing" name="add_photo_alternate" size="md" />
                <UiIcon v-else name="progress_activity" size="md" class="animate-spin" />
              </div>

              <div class="text-center">
                <p class="text-sm font-medium text-on-surface">
                  {{
                    isProcessing
                      ? 'Optimizando imagen...'
                      : 'Arrastra una imagen o haz clic para explorar'
                  }}
                </p>
                <p class="text-xs text-secondary mt-1">
                  Formatos soportados: PNG, JPG, WebP, SVG (máx. 1920px)
                </p>
              </div>
            </div>
          </div>

          <!-- Tab Content: URL input -->
          <div v-else class="flex flex-col gap-2">
            <label class="text-xs font-medium text-secondary"> URL de la imagen </label>
            <input
              ref="urlInputRef"
              v-model="urlValue"
              type="url"
              placeholder="https://images.unsplash.com/photo-..."
              class="glass-input w-full px-4 py-3 rounded-xl text-sm text-on-surface placeholder:text-secondary/50 focus:outline-none focus:ring-1 focus:ring-primary/40"
              @input="handleUrlInput"
            />
          </div>

          <!-- Error message -->
          <div v-if="errorMessage" class="text-xs text-error px-1">
            {{ errorMessage }}
          </div>

          <!-- Preview section -->
          <div v-if="previewValue" class="flex flex-col gap-2">
            <div class="flex items-center justify-between text-xs text-secondary px-1">
              <span>Vista previa</span>
              <button
                class="text-error hover:underline transition-all"
                @click="
                  previewValue = null
                  urlValue = ''
                "
              >
                Quitar previsualización
              </button>
            </div>
            <div
              class="relative w-full h-36 rounded-xl overflow-hidden border border-white/20 dark:border-white/10 shadow-inner"
            >
              <img
                :src="previewValue"
                alt="Vista previa"
                class="w-full h-full object-cover"
                @error="errorMessage = 'No se pudo cargar la imagen desde la dirección indicada.'"
              />
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center justify-between pt-2">
            <div>
              <UiButton
                v-if="initialValue"
                variant="ghost"
                size="sm"
                class="!text-error hover:!bg-error/10"
                @click="handleRemove"
              >
                <template #icon-left>
                  <UiIcon name="delete" size="sm" />
                </template>
                Eliminar portada
              </UiButton>
            </div>

            <div class="flex items-center gap-2">
              <UiButton variant="ghost" size="sm" @click="emit('cancel')"> Cancelar </UiButton>
              <UiButton
                variant="solid"
                size="sm"
                :disabled="isProcessing || !previewValue"
                @click="handleConfirm"
              >
                <template #icon-left>
                  <UiIcon name="check" size="sm" />
                </template>
                Aplicar
              </UiButton>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
