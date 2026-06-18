<script setup lang="ts">
import { ref } from 'vue'
import UiIcon from '@/components/ui/UiIcon.vue'
import UiIconButton from '@/components/ui/UiIconButton.vue'

// Mock state for initial UI
const title = ref('Philosophical Approaches to Minimalism')
const isSaved = ref(true)

const toolbarItems = [
  { icon: 'format_h1', label: 'Headings' },
  { icon: 'format_bold', label: 'Bold' },
  { icon: 'format_italic', label: 'Italic' },
  { divider: true },
  { icon: 'format_list_bulleted', label: 'Bullet List' },
  { icon: 'format_list_numbered', label: 'Numbered List' },
  { divider: true },
  { icon: 'code', label: 'Code Block' },
  { icon: 'link', label: 'Link' },
] as const
</script>

<template>
  <div class="flex-1 flex flex-col">
    <!-- Save indicator -->
    <div class="flex items-center gap-2 text-secondary px-6 lg:px-12 py-2">
      <UiIcon :name="isSaved ? 'cloud_done' : 'sync'" size="sm" />
      <span class="text-xs opacity-70">{{ isSaved ? 'Saved' : 'Saving...' }}</span>
    </div>

    <!-- Editor area -->
    <div class="flex-1 overflow-y-auto px-4 md:px-12 py-8">
      <div class="max-w-[720px] mx-auto glass-panel-md rounded-2xl p-8 md:p-12">
        <!-- Tags / Category -->
        <div class="flex items-center gap-2 mb-4">
          <span class="text-[11px] text-secondary/40 uppercase tracking-[0.2em] font-medium">Strategy</span>
          <span class="text-outline-variant">/</span>
          <span class="text-[11px] text-secondary/40 uppercase tracking-[0.2em] font-medium">2024</span>
        </div>

        <!-- Title -->
        <input
          v-model="title"
          type="text"
          placeholder="Note Title"
          class="w-full bg-transparent border-none p-0 mb-8 focus:ring-0 focus:outline-none font-display text-4xl md:text-5xl font-bold text-on-surface leading-tight tracking-tight placeholder:text-outline-variant"
        >

        <!-- Content (placeholder for Tiptap) -->
        <div class="prose max-w-none text-on-surface/90 space-y-6">
          <p class="text-lg leading-relaxed">
            True digital silence is not merely the absence of notification sounds. It is the active curation of one's environment to allow for the most precious resource of the information age: <span class="bg-primary-fixed text-on-primary-fixed px-1 rounded">undistracted focus</span>.
          </p>

          <h3 class="font-display text-2xl font-semibold text-on-surface pt-4">The Invisible Interface</h3>

          <p class="text-lg leading-relaxed">
            When the interface disappears, the friction between thought and expression evaporates. We seek to build tools that feel like a fresh sheet of heavy, textured paper—tactile, private, and waiting.
          </p>

          <!-- Blockquote -->
          <div class="my-8 p-6 glass-panel-md rounded-xl border-l-4 border-l-primary">
            <p class="italic text-on-surface-variant text-lg">
              "Perfection is achieved, not when there is nothing more to add, but when there is nothing left to take away."
            </p>
            <p class="text-xs mt-4 text-secondary">— Antoine de Saint-Exupéry</p>
          </div>

          <p class="text-lg leading-relaxed">Our roadmap for the next quarter centers on these three pillars:</p>

          <ul class="list-disc pl-5 space-y-3 text-lg marker:text-primary">
            <li>Semantic search that understands context over keywords.</li>
            <li>Bi-directional linking for organic thought mapping.</li>
            <li>Offline-first architecture to ensure "local-only" privacy options.</li>
          </ul>

          <!-- Code block -->
          <pre class="glass-panel-md p-4 rounded-lg font-mono text-sm text-on-surface-variant overflow-x-auto">// Principles of ZenFlow Design
const philosophy = {
  minimalism: true,
  privacy: "absolute",
  focus: "deep",
  distractions: 0
};</pre>
        </div>
      </div>
    </div>

    <!-- Floating toolbar -->
    <div class="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
      <div class="
        bg-surface-container-highest
        shadow-lg border border-outline-variant
        rounded-full p-2
        flex items-center gap-1
      ">
        <template v-for="(item, index) in toolbarItems" :key="index">
          <div v-if="'divider' in item" class="w-px h-6 bg-outline-variant mx-1" />
          <UiIconButton
            v-else
            :icon="item.icon"
            :ariaLabel="item.label"
            size="sm"
          />
        </template>
      </div>
    </div>
  </div>
</template>
