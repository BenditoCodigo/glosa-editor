<script setup lang="ts">
import { ref } from 'vue'

interface Props {
  currentEmoji?: string
}

const { currentEmoji } = defineProps<Props>()

const emit = defineEmits<{
  select: [emoji: string]
}>()

const showPicker = ref(false)

const commonEmojis = [
  '📝', '💡', '🎯', '🚀', '✨', '📖', '🧠', '💭',
  '🔥', '⭐', '🎨', '📌', '🗂️', '📋', '🎬', '🎵',
  '❤️', '🌱', '🏗️', '⚡', '🔍', '💻', '📸', '🌙',
]

function selectEmoji(emoji: string) {
  emit('select', emoji)
  showPicker.value = false
}

function togglePicker() {
  showPicker.value = !showPicker.value
}
</script>

<template>
  <div class="relative">
    <button
      class="
        w-9 h-9 rounded-lg
        flex items-center justify-center
        text-xl leading-none
        hover:bg-white/20 dark:hover:bg-white/5
        transition-colors
      "
      :title="currentEmoji ? 'Change emoji' : 'Add emoji'"
      @click="togglePicker"
    >
      {{ currentEmoji || '😀' }}
    </button>

    <!-- Picker dropdown -->
    <Transition name="fade-up">
      <div
        v-if="showPicker"
        class="
          absolute top-full left-0 mt-2 z-50
          bg-surface-container-highest
          border border-outline-variant
          rounded-xl shadow-lg
          p-3
          grid grid-cols-8 gap-1
          w-[280px]
        "
      >
        <button
          v-for="emoji in commonEmojis"
          :key="emoji"
          class="
            w-8 h-8 rounded-lg
            flex items-center justify-center
            text-lg
            hover:bg-white/30 dark:hover:bg-white/10
            transition-colors
            active:scale-90
          "
          @click="selectEmoji(emoji)"
        >
          {{ emoji }}
        </button>
      </div>
    </Transition>

    <!-- Click outside to close -->
    <div
      v-if="showPicker"
      class="fixed inset-0 z-40"
      @click="showPicker = false"
    />
  </div>
</template>
