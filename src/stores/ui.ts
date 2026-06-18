import { ref } from 'vue'
import { defineStore } from 'pinia'

export const useUiStore = defineStore('ui', () => {
  const sidebarOpen = ref(false)
  const theme = ref<'light' | 'dark'>(getInitialTheme())

  function toggleSidebar() {
    sidebarOpen.value = !sidebarOpen.value
  }

  function toggleTheme() {
    theme.value = theme.value === 'light' ? 'dark' : 'light'
    applyTheme(theme.value)
  }

  function applyTheme(mode: 'light' | 'dark') {
    if (mode === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    localStorage.setItem('libreta-theme', mode)
  }

  function getInitialTheme(): 'light' | 'dark' {
    const stored = localStorage.getItem('libreta-theme')
    if (stored === 'dark' || stored === 'light') return stored
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }

  // Apply on store creation
  applyTheme(theme.value)

  return {
    sidebarOpen,
    theme,
    toggleSidebar,
    toggleTheme,
  }
})
