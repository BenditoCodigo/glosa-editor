<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useSettingsStore } from '@/stores/settings'
import { testConnection } from '@/services/ai'
import type { AIConnectionResult } from '@/services/ai'
import UiIcon from '@/components/ui/UiIcon.vue'
import UiIconButton from '@/components/ui/UiIconButton.vue'
import UiButton from '@/components/ui/UiButton.vue'
import MigrationModal from '@/components/ui/MigrationModal.vue'
import type { ThemeMode, StorageProvider, AICustomHeader } from '@/types'

const router = useRouter()
const settingsStore = useSettingsStore()
const { profile, theme, storageProvider, editor, isFileSystemSupported, filesystemPath, ai } = storeToRefs(settingsStore)

// Local state for avatar preview
const avatarInput = ref<HTMLInputElement | null>(null)
const showDeleteConfirm = ref(false)
const isSelectingFolder = ref(false)

// AI settings local state
const showApiKey = ref(false)
const showHeaderValues = ref<Record<number, boolean>>({})

// Connection test state
const isTestingConnection = ref(false)
const connectionResult = ref<AIConnectionResult | null>(null)

const canTestConnection = computed(() => ai.value.baseUrl.trim() !== '' && ai.value.model.trim() !== '')

// Migration modal state
const showMigrationModal = ref(false)
const migrationFolderPath = ref('')
const migrationNoteCount = ref(0)
const previousProviderBeforeMigration = ref<StorageProvider>('indexeddb')
const previousPathBeforeMigration = ref<string | null>(null)

const storageOptions = computed<{ id: StorageProvider; label: string; description: string; available: boolean }[]>(() => [
  { id: 'indexeddb', label: 'IndexedDB (local)', description: 'Almacenamiento en el navegador. Ideal para pruebas y uso personal.', available: true },
  { id: 'filesystem', label: 'Sistema de archivos', description: 'Archivos .md en tu disco local. Requiere la app de escritorio.', available: isFileSystemSupported.value },
  { id: 's3', label: 'Amazon S3', description: 'Bucket S3 privado para almacenamiento en la nube.', available: false },
  { id: 'webdav', label: 'WebDAV / NAS', description: 'Servidor WebDAV, Nextcloud, Synology, etc.', available: false },
])

const themeOptions: { id: ThemeMode; label: string; icon: string }[] = [
  { id: 'light', label: 'Claro', icon: 'light_mode' },
  { id: 'dark', label: 'Oscuro', icon: 'dark_mode' },
  { id: 'system', label: 'Sistema', icon: 'contrast' },
]

const autosaveIntervals = [
  { value: 3 as const, label: '3 segundos' },
  { value: 5 as const, label: '5 segundos' },
  { value: 10 as const, label: '10 segundos' },
]

function handleAvatarClick() {
  avatarInput.value?.click()
}

function handleAvatarChange(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    const dataUrl = e.target?.result as string
    settingsStore.updateProfile({ avatarUrl: dataUrl })
  }
  reader.readAsDataURL(file)
}

function removeAvatar() {
  settingsStore.updateProfile({ avatarUrl: null })
}

function handleThemeChange(mode: ThemeMode) {
  settingsStore.setTheme(mode)
}

async function handleStorageSelect(option: { id: StorageProvider; available: boolean }) {
  if (!option.available) return

  if (option.id === 'filesystem') {
    isSelectingFolder.value = true
    // Save previous state in case migration gets cancelled
    previousProviderBeforeMigration.value = settingsStore.settings.storageProvider
    previousPathBeforeMigration.value = settingsStore.settings.filesystemPath
    try {
      const result = await settingsStore.selectFilesystemFolder()
      if (result && result.needsMigration) {
        // Show migration dialog
        migrationFolderPath.value = result.path
        migrationNoteCount.value = result.noteCount
        showMigrationModal.value = true
      }
    } finally {
      isSelectingFolder.value = false
    }
  } else {
    settingsStore.setStorageProvider(option.id)
  }
}

async function handleMigrationComplete() {
  showMigrationModal.value = false
  // Reload stores with the new adapter's data
  await settingsStore.completeMigration()
}

function handleMigrationCancel() {
  showMigrationModal.value = false
  // Revert settings to before the folder was selected
  settingsStore.cancelMigration(previousPathBeforeMigration.value, previousProviderBeforeMigration.value)
}

async function handleUnlinkFolder() {
  await settingsStore.clearFilesystemPath()
}

function handleDeleteAllData() {
  showDeleteConfirm.value = true
}

async function confirmDeleteAll() {
  // Clear IndexedDB
  const { db } = await import('@/services/db')
  await db.notes.clear()
  await db.folders.clear()
  await db.activity.clear()
  settingsStore.resetAll()
  showDeleteConfirm.value = false
  router.push('/')
  // Reload to reset app state
  window.location.reload()
}

function toggleHeaderValueVisibility(index: number) {
  showHeaderValues.value = { ...showHeaderValues.value, [index]: !showHeaderValues.value[index] }
}

async function handleTestConnection() {
  if (isTestingConnection.value || !canTestConnection.value) return

  isTestingConnection.value = true
  connectionResult.value = null

  try {
    connectionResult.value = await testConnection()
  } catch (error) {
    connectionResult.value = {
      success: false,
      message: `Error inesperado: ${String(error)}`,
    }
  } finally {
    isTestingConnection.value = false
  }

  // Auto-hide success message after 5 seconds
  if (connectionResult.value?.success) {
    setTimeout(() => {
      if (connectionResult.value?.success) {
        connectionResult.value = null
      }
    }, 5000)
  }
}
</script>

<template>
  <div class="p-6 lg:p-12 animate-fade-in">
    <div class="max-w-[720px] mx-auto">
      <!-- Header -->
      <div class="flex items-center gap-4 mb-10">
        <UiIconButton icon="arrow_back" ariaLabel="Volver" size="sm" @click="router.push('/')" />
        <div class="flex items-center gap-3">
          <UiIcon name="settings" class="text-primary" />
          <h1 class="font-display text-2xl font-bold text-on-surface">Configuración</h1>
        </div>
      </div>

      <!-- Sections -->
      <div class="space-y-10">
        <!-- 1. Perfil de usuario -->
        <section>
          <div class="flex items-center gap-4 mb-5">
            <h2 class="text-[11px] font-semibold text-secondary uppercase tracking-widest">Perfil</h2>
            <div class="h-px flex-1 bg-outline-variant/30"></div>
          </div>

          <div class="glass-panel-md rounded-2xl p-6">
            <div class="flex items-start gap-6">
              <!-- Avatar -->
              <div class="flex flex-col items-center gap-2">
                <button
                  class="
                    relative w-20 h-20 rounded-full overflow-hidden
                    bg-primary-container
                    flex items-center justify-center
                    text-on-primary-container font-bold text-2xl
                    hover:opacity-80 transition-opacity
                    ring-2 ring-white/20
                  "
                  title="Cambiar avatar"
                  @click="handleAvatarClick"
                >
                  <img
                    v-if="profile.avatarUrl"
                    :src="profile.avatarUrl"
                    alt="Avatar"
                    class="absolute inset-0 w-full h-full object-cover"
                  >
                  <span v-else>{{ settingsStore.userInitial }}</span>
                  <div class="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity">
                    <UiIcon name="photo_camera" class="text-white" />
                  </div>
                </button>
                <button
                  v-if="profile.avatarUrl"
                  class="text-xs text-error hover:underline"
                  @click="removeAvatar"
                >
                  Eliminar
                </button>
                <input
                  ref="avatarInput"
                  type="file"
                  accept="image/*"
                  class="hidden"
                  @change="handleAvatarChange"
                >
              </div>

              <!-- Username -->
              <div class="flex-1">
                <label class="block text-xs font-medium text-secondary mb-2">Nombre de usuario</label>
                <input
                  :value="profile.username"
                  type="text"
                  placeholder="Tu nombre"
                  class="
                    glass-input
                    w-full max-w-xs px-4 py-2.5
                    rounded-xl
                    text-sm text-on-surface
                    placeholder:text-secondary/50
                    focus:outline-none focus:ring-1 focus:ring-primary/40
                  "
                  @input="settingsStore.updateProfile({ username: ($event.target as HTMLInputElement).value })"
                >
                <p class="mt-2 text-xs text-secondary/60">
                  Se mostrará en tus notas exportadas.
                </p>
              </div>
            </div>
          </div>
        </section>

        <!-- 2. Almacenamiento -->
        <section>
          <div class="flex items-center gap-4 mb-5">
            <h2 class="text-[11px] font-semibold text-secondary uppercase tracking-widest">Almacenamiento</h2>
            <div class="h-px flex-1 bg-outline-variant/30"></div>
          </div>

          <div class="glass-panel-md rounded-2xl p-6">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                v-for="option in storageOptions"
                :key="option.id"
                class="
                  relative flex flex-col gap-1.5
                  p-4 rounded-xl
                  text-left transition-all duration-200
                  border
                "
                :class="[
                  storageProvider === option.id
                    ? 'border-primary bg-primary/5 dark:bg-primary/20 dark:border-primary-fixed-dim'
                    : 'border-outline-variant/30 hover:border-outline-variant/60',
                  !option.available && 'opacity-50 cursor-not-allowed',
                ]"
                :disabled="!option.available || isSelectingFolder"
                @click="handleStorageSelect(option)"
              >
                <div class="flex items-center gap-2">
                  <div
                    class="w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center"
                    :class="storageProvider === option.id ? 'border-primary dark:border-primary-fixed-dim' : 'border-outline-variant'"
                  >
                    <div
                      v-if="storageProvider === option.id"
                      class="w-1.5 h-1.5 rounded-full bg-primary dark:bg-primary-fixed-dim"
                    />
                  </div>
                  <span class="text-sm font-medium text-on-surface">{{ option.label }}</span>
                  <span
                    v-if="!option.available"
                    class="ml-auto text-[10px] font-medium text-secondary/60 uppercase tracking-wider"
                  >
                    Próximamente
                  </span>
                </div>
                <p class="text-xs text-secondary/70 pl-5.5">{{ option.description }}</p>
              </button>
            </div>

            <!-- Linked folder info -->
            <div
              v-if="storageProvider === 'filesystem' && filesystemPath"
              class="mt-4 flex items-center gap-3 p-3 rounded-xl border border-outline-variant/30 bg-primary/5 dark:bg-primary/10"
            >
              <UiIcon name="folder" class="text-primary shrink-0" />
              <div class="flex-1 min-w-0">
                <p class="text-xs font-medium text-secondary">Carpeta vinculada</p>
                <p class="text-sm text-on-surface truncate">{{ filesystemPath }}</p>
              </div>
              <button
                class="text-xs text-error hover:underline shrink-0"
                @click="handleUnlinkFolder"
              >
                Desvincular
              </button>
            </div>
          </div>
        </section>

        <!-- 3. Apariencia -->
        <section>
          <div class="flex items-center gap-4 mb-5">
            <h2 class="text-[11px] font-semibold text-secondary uppercase tracking-widest">Apariencia</h2>
            <div class="h-px flex-1 bg-outline-variant/30"></div>
          </div>

          <div class="glass-panel-md rounded-2xl p-6">
            <label class="block text-xs font-medium text-secondary mb-3">Tema</label>
            <div class="flex gap-3">
              <button
                v-for="option in themeOptions"
                :key="option.id"
                class="
                  flex items-center gap-2
                  px-4 py-2.5 rounded-xl
                  text-sm font-medium
                  border transition-all duration-200
                "
                :class="theme === option.id
                  ? 'border-primary bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-fixed-dim dark:border-primary-fixed-dim'
                  : 'border-outline-variant/30 text-secondary hover:border-outline-variant/60 hover:text-on-surface'
                "
                @click="handleThemeChange(option.id)"
              >
                <UiIcon :name="option.icon" size="sm" />
                <span>{{ option.label }}</span>
              </button>
            </div>
          </div>
        </section>

        <!-- 4. Editor -->
        <section>
          <div class="flex items-center gap-4 mb-5">
            <h2 class="text-[11px] font-semibold text-secondary uppercase tracking-widest">Editor</h2>
            <div class="h-px flex-1 bg-outline-variant/30"></div>
          </div>

          <div class="glass-panel-md rounded-2xl p-6 space-y-6">
            <!-- Autosave toggle -->
            <div class="flex items-center justify-between">
              <div>
                <span class="text-sm font-medium text-on-surface">Autoguardado</span>
                <p class="text-xs text-secondary/60 mt-0.5">Guardar cambios automáticamente mientras escribes.</p>
              </div>
              <button
                class="
                  relative w-11 h-6 rounded-full
                  transition-colors duration-200
                "
                :class="editor.autosaveEnabled ? 'bg-primary' : 'bg-outline-variant/50'"
                role="switch"
                :aria-checked="editor.autosaveEnabled"
                @click="settingsStore.updateEditor({ autosaveEnabled: !editor.autosaveEnabled })"
              >
                <span
                  class="
                    absolute top-0.5 left-0.5
                    w-5 h-5 rounded-full
                    bg-white shadow-sm
                    transition-transform duration-200
                  "
                  :class="editor.autosaveEnabled && 'translate-x-5'"
                />
              </button>
            </div>

            <!-- Autosave interval -->
            <div v-if="editor.autosaveEnabled" class="pl-0">
              <label class="block text-xs font-medium text-secondary mb-2">Intervalo de autoguardado</label>
              <div class="flex gap-2">
                <button
                  v-for="interval in autosaveIntervals"
                  :key="interval.value"
                  class="
                    px-3 py-1.5 rounded-lg
                    text-xs font-medium
                    border transition-all duration-200
                  "
                  :class="editor.autosaveInterval === interval.value
                    ? 'border-primary bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-fixed-dim dark:border-primary-fixed-dim'
                    : 'border-outline-variant/30 text-secondary hover:border-outline-variant/60'
                  "
                  @click="settingsStore.updateEditor({ autosaveInterval: interval.value })"
                >
                  {{ interval.label }}
                </button>
              </div>
            </div>

            <!-- Word count toggle -->
            <div class="flex items-center justify-between">
              <div>
                <span class="text-sm font-medium text-on-surface">Conteo de palabras</span>
                <p class="text-xs text-secondary/60 mt-0.5">Mostrar palabras y caracteres en el editor.</p>
              </div>
              <button
                class="
                  relative w-11 h-6 rounded-full
                  transition-colors duration-200
                "
                :class="editor.showWordCount ? 'bg-primary' : 'bg-outline-variant/50'"
                role="switch"
                :aria-checked="editor.showWordCount"
                @click="settingsStore.updateEditor({ showWordCount: !editor.showWordCount })"
              >
                <span
                  class="
                    absolute top-0.5 left-0.5
                    w-5 h-5 rounded-full
                    bg-white shadow-sm
                    transition-transform duration-200
                  "
                  :class="editor.showWordCount && 'translate-x-5'"
                />
              </button>
            </div>
          </div>
        </section>

        <!-- 5. Inteligencia Artificial -->
        <section>
          <div class="flex items-center gap-4 mb-5">
            <h2 class="text-[11px] font-semibold text-secondary uppercase tracking-widest">Inteligencia Artificial</h2>
            <div class="h-px flex-1 bg-outline-variant/30"></div>
          </div>

          <div class="glass-panel-md rounded-2xl p-6 space-y-6">
            <!-- Enable toggle -->
            <div class="flex items-center justify-between">
              <div>
                <span class="text-sm font-medium text-on-surface">Habilitar asistente de IA</span>
                <p class="text-xs text-secondary/60 mt-0.5">Conecta un modelo de lenguaje local o remoto.</p>
              </div>
              <button
                class="relative w-11 h-6 rounded-full transition-colors duration-200"
                :class="ai.enabled ? 'bg-primary' : 'bg-outline-variant/50'"
                role="switch"
                :aria-checked="ai.enabled"
                @click="settingsStore.updateAI({ enabled: !ai.enabled })"
              >
                <span
                  class="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200"
                  :class="ai.enabled && 'translate-x-5'"
                />
              </button>
            </div>

            <!-- Connection fields (shown when enabled) -->
            <Transition name="fade-up">
              <div v-if="ai.enabled" class="space-y-5 pt-2">
                <!-- Base URL -->
                <div>
                  <label class="block text-xs font-medium text-secondary mb-2">URL Base</label>
                  <input
                    :value="ai.baseUrl"
                    type="text"
                    placeholder="http://localhost:11434/v1"
                    class="glass-input w-full px-4 py-2.5 rounded-xl text-sm text-on-surface placeholder:text-secondary/50 focus:outline-none focus:ring-1 focus:ring-primary/40"
                    @input="settingsStore.updateAI({ baseUrl: ($event.target as HTMLInputElement).value })"
                  >
                </div>

                <!-- Model -->
                <div>
                  <label class="block text-xs font-medium text-secondary mb-2">Modelo</label>
                  <input
                    :value="ai.model"
                    type="text"
                    placeholder="llama3.1:8b"
                    class="glass-input w-full px-4 py-2.5 rounded-xl text-sm text-on-surface placeholder:text-secondary/50 focus:outline-none focus:ring-1 focus:ring-primary/40"
                    @input="settingsStore.updateAI({ model: ($event.target as HTMLInputElement).value })"
                  >
                </div>

                <!-- API Key -->
                <div>
                  <label class="block text-xs font-medium text-secondary mb-2">API Key</label>
                  <div class="relative">
                    <input
                      :value="ai.apiKey"
                      :type="showApiKey ? 'text' : 'password'"
                      placeholder="sk-... (opcional)"
                      class="glass-input w-full px-4 py-2.5 pr-10 rounded-xl text-sm text-on-surface placeholder:text-secondary/50 focus:outline-none focus:ring-1 focus:ring-primary/40"
                      @input="settingsStore.updateAI({ apiKey: ($event.target as HTMLInputElement).value })"
                    >
                    <button
                      class="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-lg text-secondary/60 hover:text-secondary transition-colors"
                      type="button"
                      :aria-label="showApiKey ? 'Ocultar API Key' : 'Mostrar API Key'"
                      @click="showApiKey = !showApiKey"
                    >
                      <UiIcon :name="showApiKey ? 'visibility_off' : 'visibility'" size="sm" />
                    </button>
                  </div>
                </div>

                <!-- Custom Headers -->
                <div>
                  <label class="block text-xs font-medium text-secondary mb-2">Headers personalizados</label>
                  <div v-if="ai.headers.length > 0" class="space-y-2 mb-3">
                    <div
                      v-for="(header, index) in ai.headers"
                      :key="index"
                      class="flex items-center gap-2"
                    >
                      <input
                        :value="header.key"
                        type="text"
                        placeholder="Header name"
                        class="glass-input flex-1 px-3 py-2 rounded-lg text-sm text-on-surface placeholder:text-secondary/50 focus:outline-none focus:ring-1 focus:ring-primary/40"
                        @input="settingsStore.updateAIHeader(index, { ...header, key: ($event.target as HTMLInputElement).value })"
                      >
                      <div class="relative flex-1">
                        <input
                          :value="header.value"
                          :type="showHeaderValues[index] ? 'text' : 'password'"
                          placeholder="Value"
                          class="glass-input w-full px-3 py-2 pr-8 rounded-lg text-sm text-on-surface placeholder:text-secondary/50 focus:outline-none focus:ring-1 focus:ring-primary/40"
                          @input="settingsStore.updateAIHeader(index, { ...header, value: ($event.target as HTMLInputElement).value })"
                        >
                        <button
                          class="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-secondary/60 hover:text-secondary transition-colors"
                          type="button"
                          :aria-label="showHeaderValues[index] ? 'Ocultar valor' : 'Mostrar valor'"
                          @click="toggleHeaderValueVisibility(index)"
                        >
                          <UiIcon :name="showHeaderValues[index] ? 'visibility_off' : 'visibility'" size="sm" />
                        </button>
                      </div>
                      <button
                        class="p-1.5 rounded-lg text-secondary/60 hover:text-error hover:bg-error/10 transition-colors"
                        type="button"
                        aria-label="Eliminar header"
                        @click="settingsStore.removeAIHeader(index)"
                      >
                        <UiIcon name="close" size="sm" />
                      </button>
                    </div>
                  </div>
                  <button
                    class="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                    type="button"
                    @click="settingsStore.addAIHeader()"
                  >
                    <UiIcon name="add" size="sm" />
                    <span>Agregar header</span>
                  </button>
                </div>

                <!-- Connection test -->
                <div class="flex items-center gap-3 pt-2">
                  <button
                    class="
                      inline-flex items-center gap-2
                      px-4 py-2 rounded-xl
                      text-sm font-medium
                      border border-primary/30 text-primary
                      hover:bg-primary/10
                      transition-all duration-200
                      disabled:opacity-50 disabled:cursor-not-allowed
                    "
                    type="button"
                    :disabled="!canTestConnection || isTestingConnection"
                    @click="handleTestConnection"
                  >
                    <UiIcon v-if="!isTestingConnection" name="power" size="sm" />
                    <span v-else class="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                    <span>{{ isTestingConnection ? 'Probando...' : 'Probar conexión' }}</span>
                  </button>

                  <!-- Success indicator -->
                  <Transition name="fade">
                    <div v-if="connectionResult?.success" class="flex items-center gap-2 text-sm">
                      <UiIcon name="check_circle" size="sm" class="text-green-600 dark:text-green-400" />
                      <span class="text-green-700 dark:text-green-300">{{ connectionResult.message }}</span>
                      <span v-if="connectionResult.latencyMs" class="text-xs text-secondary/60">({{ connectionResult.latencyMs }}ms)</span>
                    </div>
                  </Transition>

                  <!-- Error indicator -->
                  <Transition name="fade">
                    <div v-if="connectionResult && !connectionResult.success" class="flex items-center gap-2 text-sm">
                      <UiIcon name="error" size="sm" class="text-error" />
                      <span class="text-error">{{ connectionResult.message }}</span>
                    </div>
                  </Transition>
                </div>
              </div>
            </Transition>
          </div>
        </section>

        <!-- 6. Datos -->
        <section>
          <div class="flex items-center gap-4 mb-5">
            <h2 class="text-[11px] font-semibold text-secondary uppercase tracking-widest">Datos</h2>
            <div class="h-px flex-1 bg-outline-variant/30"></div>
          </div>

          <div class="glass-panel-md rounded-2xl p-6 space-y-4">
            <div class="flex flex-wrap gap-3">
              <UiButton variant="ghost" size="sm" disabled>
                <template #icon-left>
                  <UiIcon name="download" size="sm" />
                </template>
                Exportar notas (.zip)
              </UiButton>
              <UiButton variant="ghost" size="sm" disabled>
                <template #icon-left>
                  <UiIcon name="upload" size="sm" />
                </template>
                Importar notas
              </UiButton>
            </div>
            <p class="text-xs text-secondary/50">Exportar e importar estarán disponibles próximamente.</p>

            <div class="pt-4 border-t border-outline-variant/20">
              <UiButton variant="ghost" size="sm" class="text-error hover:bg-error/10" @click="handleDeleteAllData">
                <template #icon-left>
                  <UiIcon name="delete_forever" size="sm" />
                </template>
                Borrar todos los datos
              </UiButton>
              <p class="mt-1 text-xs text-secondary/50">Esta acción es irreversible. Se eliminarán todas las notas, carpetas y configuraciones.</p>
            </div>
          </div>
        </section>

        <!-- 7. Acerca de -->
        <section>
          <div class="flex items-center gap-4 mb-5">
            <h2 class="text-[11px] font-semibold text-secondary uppercase tracking-widest">Acerca de</h2>
            <div class="h-px flex-1 bg-outline-variant/30"></div>
          </div>

          <div class="glass-panel-md rounded-2xl p-6">
            <div class="space-y-3">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container font-bold text-sm">
                  G
                </div>
                <div>
                  <span class="font-display text-base font-semibold text-on-surface">Glosa</span>
                  <span class="ml-2 text-xs text-secondary/60">v0.1.0</span>
                </div>
              </div>
              <p class="text-sm text-secondary">
                Plataforma personal de notas en markdown. Privada, local, tuya.
              </p>
              <p class="text-xs text-secondary/60">
                Hecho con 💚 por Bendito Código
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>

  <!-- Delete confirmation modal -->
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="showDeleteConfirm"
        class="fixed inset-0 z-100 flex items-center justify-center p-4"
      >
        <div
          class="absolute inset-0 bg-black/30 backdrop-blur-sm"
          @click="showDeleteConfirm = false"
        />
        <div class="glass-panel-md relative z-10 w-full max-w-sm rounded-2xl p-6 flex flex-col gap-5 animate-fade-up">
          <div class="flex items-center gap-3">
            <UiIcon name="warning" class="text-error" />
            <h2 class="font-display text-lg font-semibold text-on-surface">¿Borrar todo?</h2>
          </div>
          <p class="text-sm text-secondary">
            Se eliminarán permanentemente todas las notas, carpetas y configuraciones. Esta acción no se puede deshacer.
          </p>
          <div class="flex items-center justify-end gap-3">
            <UiButton variant="ghost" size="sm" @click="showDeleteConfirm = false">
              Cancelar
            </UiButton>
            <UiButton variant="solid" size="sm" class="!bg-error hover:!bg-error/80" @click="confirmDeleteAll">
              <template #icon-left>
                <UiIcon name="delete_forever" size="sm" />
              </template>
              Borrar todo
            </UiButton>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- Migration modal -->
  <MigrationModal
    :open="showMigrationModal"
    :folder-path="migrationFolderPath"
    :note-count="migrationNoteCount"
    @complete="handleMigrationComplete"
    @cancel="handleMigrationCancel"
  />
</template>
