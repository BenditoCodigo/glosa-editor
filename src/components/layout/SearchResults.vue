<script setup lang="ts">
import type {
  SearchResults,
  SearchResultItem,
  SearchResultNote,
  SearchResultFolder,
  SearchResultTag,
} from '@/types/search'
import SearchResultNoteVue from './SearchResultNote.vue'
import SearchResultFolderVue from './SearchResultFolder.vue'
import SearchResultTagVue from './SearchResultTag.vue'

interface Props {
  results: SearchResults
  highlightedIndex: number
  isVisible: boolean
}

interface Emits {
  (e: 'select', item: SearchResultItem): void
  (e: 'hover', index: number): void
}

const { results, highlightedIndex } = defineProps<Props>()
const emit = defineEmits<Emits>()

/**
 * Compute the flat index offset for a given group.
 * The flat index is the position of an item across ALL groups.
 */
function getGroupOffset(groupIndex: number): number {
  let offset = 0
  for (let i = 0; i < groupIndex; i++) {
    offset += results.groups[i]!.items.length
  }
  return offset
}

function handleSelect(item: SearchResultItem) {
  emit('select', item)
}

function handleHover(flatIndex: number) {
  emit('hover', flatIndex)
}
</script>

<template>
  <Transition name="search-results">
    <div
      v-if="isVisible"
      role="listbox"
      class="glass-panel-opaque absolute right-0 z-50 min-w-80 max-w-[480px] w-full mt-2 p-2 rounded-xl text-on-glass"
    >
      <!-- Results grouped by type -->
      <template v-if="results.hasResults">
        <div
          v-for="(group, groupIndex) in results.groups"
          :key="group.type"
          :class="[groupIndex > 0 && 'mt-2 border-t border-outline-variant/30 pt-2']"
        >
          <!-- Group header -->
          <div class="flex items-center justify-between px-3 py-1">
            <span class="text-xs font-medium text-on-surface-variant uppercase tracking-wide">
              {{ group.label }}
            </span>
            <span v-if="group.total > 5" class="text-xs text-on-surface-variant">
              {{ group.items.length }} de {{ group.total }}
            </span>
          </div>

          <!-- Group items -->
          <div role="group" :aria-label="group.label">
            <template v-for="(item, itemIndex) in group.items" :key="`${group.type}-${itemIndex}`">
              <SearchResultNoteVue
                v-if="item.type === 'note'"
                :result="item as SearchResultNote"
                :is-highlighted="highlightedIndex === getGroupOffset(groupIndex) + itemIndex"
                @select="handleSelect"
                @mouseenter="handleHover(getGroupOffset(groupIndex) + itemIndex)"
              />
              <SearchResultFolderVue
                v-if="item.type === 'folder'"
                :result="item as SearchResultFolder"
                :is-highlighted="highlightedIndex === getGroupOffset(groupIndex) + itemIndex"
                @select="handleSelect"
                @mouseenter="handleHover(getGroupOffset(groupIndex) + itemIndex)"
              />
              <SearchResultTagVue
                v-if="item.type === 'tag'"
                :result="item as SearchResultTag"
                :is-highlighted="highlightedIndex === getGroupOffset(groupIndex) + itemIndex"
                @select="handleSelect"
                @mouseenter="handleHover(getGroupOffset(groupIndex) + itemIndex)"
              />
            </template>
          </div>
        </div>
      </template>

      <!-- No results message -->
      <div v-else-if="results.query" class="flex items-center justify-center px-4 py-6">
        <p class="text-sm text-on-surface-variant">Sin resultados para '{{ results.query }}'</p>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.search-results-enter-active {
  transition:
    opacity 0.2s ease-out,
    transform 0.2s ease-out;
}

.search-results-leave-active {
  transition:
    opacity 0.15s ease-out,
    transform 0.15s ease-out;
}

.search-results-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.search-results-leave-to {
  opacity: 0;
  transform: translateY(0);
}
</style>
