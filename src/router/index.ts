import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'explorer-root',
      component: () => import('@/views/ExplorerView.vue'),
    },
    {
      path: '/folder/:path(.*)',
      name: 'explorer-folder',
      component: () => import('@/views/ExplorerView.vue'),
    },
    {
      path: '/favorites',
      name: 'favorites',
      component: () => import('@/views/FavoritesView.vue'),
    },
    {
      path: '/tag/:tag',
      name: 'tag-view',
      component: () => import('@/views/TagView.vue'),
    },
    {
      path: '/note/:id',
      name: 'editor',
      component: () => import('@/views/EditorView.vue'),
    },
  ],
})

export default router
