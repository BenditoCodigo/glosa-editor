<script setup lang="ts">
import { ref, computed } from 'vue'
import { nodeViewProps, NodeViewWrapper, NodeViewContent } from '@tiptap/vue-3'

const props = defineProps(nodeViewProps)

const showLanguages = ref(false)
const copied = ref(false)

const languages = computed(() =>
  (
    props.extension.options as { lowlight: { listLanguages: () => string[] } }
  ).lowlight.listLanguages(),
)

const currentLanguage = computed(() => props.node.attrs.language || 'plaintext')

function selectLanguage(lang: string) {
  props.updateAttributes({ language: lang })
  showLanguages.value = false
}

async function copyCode() {
  const text = props.node.textContent || ''
  await navigator.clipboard.writeText(text)
  copied.value = true
  setTimeout(() => {
    copied.value = false
  }, 2000)
}
</script>

<template>
  <NodeViewWrapper as="div" class="code-block-wrapper relative my-4">
    <!-- Controls bar -->
    <div
      class="flex items-center justify-between px-3 py-1.5 border-b border-outline-variant/50 bg-black/5 dark:bg-white/5 rounded-t-lg"
    >
      <!-- Language selector -->
      <div class="relative">
        <button
          class="text-[11px] font-mono font-medium text-secondary hover:text-primary transition-colors px-2 py-0.5 rounded hover:bg-black/5 dark:hover:bg-white/10"
          @click="showLanguages = !showLanguages"
        >
          {{ currentLanguage }}
          <span class="ml-1 text-[9px]">▼</span>
        </button>

        <!-- Dropdown -->
        <div
          v-if="showLanguages"
          class="absolute top-full left-0 mt-1 z-50 bg-surface-container-highest border border-outline-variant rounded-lg shadow-lg max-h-48 overflow-y-auto w-40"
        >
          <button
            v-for="lang in languages"
            :key="lang"
            class="w-full text-left px-3 py-1.5 text-xs font-mono hover:bg-primary/10 transition-colors"
            :class="lang === currentLanguage && 'text-primary font-bold bg-primary/5'"
            @click="selectLanguage(lang)"
          >
            {{ lang }}
          </button>
        </div>

        <!-- Click outside to close -->
        <div v-if="showLanguages" class="fixed inset-0 z-40" @click="showLanguages = false" />
      </div>

      <!-- Copy button -->
      <button
        class="text-[11px] font-medium text-secondary hover:text-primary transition-colors px-2 py-0.5 rounded hover:bg-black/5 dark:hover:bg-white/10 flex items-center gap-1"
        @click="copyCode"
      >
        <span class="material-symbols-outlined text-[14px]">{{
          copied ? 'check' : 'content_copy'
        }}</span>
        <span>{{ copied ? 'Copiado' : 'Copiar' }}</span>
      </button>
    </div>

    <!-- Code content -->
    <pre class="!mt-0 !rounded-t-none"><NodeViewContent as="code" /></pre>
  </NodeViewWrapper>
</template>
