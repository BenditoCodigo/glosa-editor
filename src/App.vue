<script setup lang="ts">
import { RouterView } from 'vue-router'
import { useUiStore } from '@/stores/ui'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import AppToolbar from '@/components/layout/AppToolbar.vue'
import AppBreadcrumbs from '@/components/layout/AppBreadcrumbs.vue'

const uiStore = useUiStore()

const breadcrumbs = [
  { label: 'All Notes', path: '/' },
  { label: 'Personal', path: '/folder/personal' },
  { label: 'Deep Work Space' },
]
</script>

<template>
  <div class="bg-fluid-gradient flex h-dvh overflow-hidden">
    <!-- Sidebar -->
    <AppSidebar />

    <!-- Main content -->
    <main class="flex-1 flex flex-col min-w-0 relative">
      <AppToolbar />

      <!-- Content area -->
      <div class="flex-1 overflow-y-auto">
        <RouterView />
      </div>

      <!-- Breadcrumbs -->
      <AppBreadcrumbs :segments="breadcrumbs" />
    </main>
  </div>
</template>
