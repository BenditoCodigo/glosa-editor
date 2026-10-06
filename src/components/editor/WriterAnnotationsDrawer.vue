<script setup lang="ts">
import { ref, computed } from 'vue'
import type { WriterAnnotation } from '@/types/note'
import UiIcon from '@/components/ui/UiIcon.vue'
import UiIconButton from '@/components/ui/UiIconButton.vue'

interface Props {
  open: boolean
  annotations: WriterAnnotation[]
  orphanIds?: string[]
}

const { open, annotations = [], orphanIds = [] } = defineProps<Props>()

const emit = defineEmits<{
  close: []
  select: [annotation: WriterAnnotation]
  edit: [annotation: WriterAnnotation]
  delete: [annotation: WriterAnnotation]
  toggleResolved: [annotation: WriterAnnotation]
  reanchor: [annotation: WriterAnnotation]
}>()

const activeTab = ref<'all' | 'active' | 'resolved' | 'orphans'>('all')
const searchQuery = ref('')

const categoryConfig: Record<string, { label: string; dotClass: string; badgeClass: string }> = {
  amber: {
    label: 'Justificación',
    dotClass: 'bg-amber-500',
    badgeClass: 'bg-amber-500/10 text-amber-800 dark:text-amber-200 border-amber-500/30',
  },
  emerald: {
    label: 'Referencia / Dato',
    dotClass: 'bg-emerald-500',
    badgeClass: 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-200 border-emerald-500/30',
  },
  rose: {
    label: 'Duda / Revisar',
    dotClass: 'bg-rose-500',
    badgeClass: 'bg-rose-500/10 text-rose-800 dark:text-rose-200 border-rose-500/30',
  },
  indigo: {
    label: 'Idea / Variación',
    dotClass: 'bg-indigo-500',
    badgeClass: 'bg-indigo-500/10 text-indigo-800 dark:text-indigo-200 border-indigo-500/30',
  },
  purple: {
    label: 'Estilo / Tono',
    dotClass: 'bg-purple-500',
    badgeClass: 'bg-purple-500/10 text-purple-800 dark:text-purple-200 border-purple-500/30',
  },
}

const activeCount = computed(() => annotations.filter((a) => !a.resolved).length)
const resolvedCount = computed(() => annotations.filter((a) => a.resolved).length)
const orphanCount = computed(
  () => annotations.filter((a) => orphanIds.includes(a.id)).length,
)

const filteredAnnotations = computed(() => {
  let list = [...annotations]

  if (activeTab.value === 'active') {
    list = list.filter((a) => !a.resolved)
  } else if (activeTab.value === 'resolved') {
    list = list.filter((a) => a.resolved)
  } else if (activeTab.value === 'orphans') {
    list = list.filter((a) => orphanIds.includes(a.id))
  }

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase()
    list = list.filter(
      (a) =>
        a.comment.toLowerCase().includes(q) ||
        a.anchor?.exact?.toLowerCase().includes(q),
    )
  }

  return list
})

function formatDate(iso?: string) {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('es', { day: 'numeric', month: 'short' })
  } catch {
    return ''
  }
}
</script>

<template>
  <Transition name="slide-right">
    <aside
      v-show="open"
      class="fixed right-0 top-0 bottom-0 h-dvh z-40 w-80 sm:w-[320px] md:w-[360px] glass-panel bg-[#f4f6f5]/95 dark:bg-[#131715]/98 backdrop-blur-2xl border-l border-white/20 shadow-2xl flex flex-col text-on-surface"
    >
      <!-- Drawer Header -->
      <div class="px-6 py-4.5 border-b border-outline/15 dark:border-white/10 flex items-center justify-between">
      <div class="flex items-center gap-2.5">
        <div class="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
          <UiIcon name="rate_review" size="sm" />
        </div>
        <div>
          <h3 class="font-display text-base font-bold text-on-surface">
            Glosas del Manuscrito
          </h3>
          <p class="text-xs text-secondary">
            {{ annotations.length }} {{ annotations.length === 1 ? 'nota de autor' : 'notas de autor' }}
          </p>
        </div>
      </div>

      <UiIconButton
        icon="close"
        variant="ghost"
        size="sm"
        ariaLabel="Cerrar panel de glosas"
        @click="emit('close')"
      />
    </div>

    <!-- Filter Tabs -->
    <div class="px-4 pt-3 flex items-center gap-1.5 border-b border-outline/10 dark:border-white/5 pb-2 text-xs font-medium">
      <button
        type="button"
        class="px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1"
        :class="[
          activeTab === 'all'
            ? 'bg-primary/15 text-primary font-semibold'
            : 'text-secondary hover:text-on-surface hover:bg-surface/50',
        ]"
        @click="activeTab = 'all'"
      >
        <span>Todas</span>
        <span class="opacity-70 text-[11px]">({{ annotations.length }})</span>
      </button>

      <button
        type="button"
        class="px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1"
        :class="[
          activeTab === 'active'
            ? 'bg-primary/15 text-primary font-semibold'
            : 'text-secondary hover:text-on-surface hover:bg-surface/50',
        ]"
        @click="activeTab = 'active'"
      >
        <span>Activas</span>
        <span class="opacity-70 text-[11px]">({{ activeCount }})</span>
      </button>

      <button
        type="button"
        class="px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1"
        :class="[
          activeTab === 'resolved'
            ? 'bg-primary/15 text-primary font-semibold'
            : 'text-secondary hover:text-on-surface hover:bg-surface/50',
        ]"
        @click="activeTab = 'resolved'"
      >
        <span>Resueltas</span>
        <span class="opacity-70 text-[11px]">({{ resolvedCount }})</span>
      </button>

      <button
        v-if="orphanCount > 0"
        type="button"
        class="px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 text-rose-500 bg-rose-500/10"
        :class="[
          activeTab === 'orphans'
            ? 'ring-1 ring-rose-500 font-semibold'
            : 'hover:bg-rose-500/20',
        ]"
        @click="activeTab = 'orphans'"
      >
        <span>Huérfanas</span>
        <span class="text-[11px]">({{ orphanCount }})</span>
      </button>
    </div>

    <!-- Search input -->
    <div v-if="annotations.length > 3" class="px-4 py-2">
      <div class="relative">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Buscar en glosas..."
          class="w-full pl-8 pr-3 py-1.5 text-xs text-on-surface bg-surface/80 dark:bg-surface/30 border border-outline/20 dark:border-white/10 rounded-lg placeholder:text-secondary/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
        />
        <div class="absolute left-2.5 top-1/2 -translate-y-1/2 text-secondary pointer-events-none">
          <UiIcon name="search" size="sm" />
        </div>
      </div>
    </div>

    <!-- Notes List -->
    <div class="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
      <!-- Empty state -->
      <div
        v-if="filteredAnnotations.length === 0"
        class="flex-1 flex flex-col items-center justify-center text-center p-6 text-secondary"
      >
        <div class="w-12 h-12 rounded-2xl bg-surface/50 flex items-center justify-center mb-3">
          <UiIcon name="rate_review" size="md" />
        </div>
        <p class="text-sm font-medium text-on-surface mb-1">
          {{ annotations.length === 0 ? 'Sin glosas aún' : 'No hay glosas en este filtro' }}
        </p>
        <p class="text-xs max-w-xs">
          {{
            annotations.length === 0
              ? 'Selecciona cualquier palabra o frase en el editor para registrar tus motivos y decisiones de escritura.'
              : 'Prueba cambiando de pestaña o limpiando el término de búsqueda.'
          }}
        </p>
      </div>

      <!-- Cards -->
      <div
        v-for="item in filteredAnnotations"
        :key="item.id"
        class="p-3.5 rounded-xl border transition-all cursor-pointer group flex flex-col gap-2.5 text-left"
        :class="[
          orphanIds.includes(item.id)
            ? 'bg-rose-500/5 border-rose-500/30 hover:border-rose-500/50'
            : item.resolved
              ? 'bg-surface/40 dark:bg-surface/20 border-outline/10 dark:border-white/5 opacity-70 hover:opacity-100 hover:border-outline/20'
              : 'bg-surface/70 dark:bg-surface/30 border-outline/15 dark:border-white/10 hover:border-primary/40 hover:bg-surface/90 dark:hover:bg-surface/50 shadow-sm',
        ]"
        @click="emit('select', item)"
      >
        <!-- Top bar: Category + Date -->
        <div class="flex items-center justify-between gap-2">
          <div
            class="flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium border"
            :class="categoryConfig[item.color || 'amber']?.badgeClass"
          >
            <span
              class="w-1.5 h-1.5 rounded-full"
              :class="categoryConfig[item.color || 'amber']?.dotClass"
            />
            <span>{{ categoryConfig[item.color || 'amber']?.label }}</span>
          </div>

          <span class="text-[11px] text-secondary">{{ formatDate(item.createdAt) }}</span>
        </div>

        <!-- Quoted text -->
        <div
          v-if="item.anchor?.exact"
          class="text-xs font-serif italic text-on-surface/80 border-l-2 pl-2 line-clamp-2"
          :class="[orphanIds.includes(item.id) ? 'border-rose-500/60 text-rose-300/80' : 'border-primary/50']"
        >
          "{{ item.anchor.exact }}"
        </div>

        <!-- Author Comment -->
        <p class="text-xs text-on-surface whitespace-pre-wrap leading-relaxed line-clamp-4">
          {{ item.comment }}
        </p>

        <!-- Orphan Warning & Reanchor Action -->
        <div
          v-if="orphanIds.includes(item.id)"
          class="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 flex flex-col gap-1.5 text-[11px] text-rose-300"
          @click.stop
        >
          <div class="flex items-center gap-1 font-medium">
            <UiIcon name="warning" size="sm" />
            <span>Texto desanclado (eliminado del texto)</span>
          </div>
          <button
            type="button"
            class="self-start px-2 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 rounded font-medium transition-colors"
            @click="emit('reanchor', item)"
          >
            Re-anclar a selección actual
          </button>
        </div>

        <!-- Card Footer Actions -->
        <div
          class="flex items-center justify-between pt-2 border-t border-outline/10 dark:border-white/5 text-xs text-secondary"
          @click.stop
        >
          <button
            type="button"
            class="flex items-center gap-1 hover:text-on-surface transition-colors"
            @click="emit('toggleResolved', item)"
          >
            <UiIcon
              :name="item.resolved ? 'check_circle' : 'radio_button_unchecked'"
              size="sm"
              :class="item.resolved ? 'text-emerald-500' : ''"
            />
            <span :class="item.resolved ? 'text-emerald-500 font-medium' : ''">
              {{ item.resolved ? 'Resuelta' : 'Resolver' }}
            </span>
          </button>

          <div class="flex items-center gap-1">
            <button
              type="button"
              title="Editar"
              class="p-1 hover:text-on-surface hover:bg-surface/80 rounded transition-colors"
              @click="emit('edit', item)"
            >
              <UiIcon name="edit" size="sm" />
            </button>
            <button
              type="button"
              title="Eliminar"
              class="p-1 hover:text-rose-500 hover:bg-rose-500/10 rounded transition-colors"
              @click="emit('delete', item)"
            >
              <UiIcon name="delete" size="sm" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </aside>
</Transition>
</template>

