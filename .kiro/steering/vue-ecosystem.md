# Vue Ecosystem - Estándares y Mejores Prácticas

Este steering define las convenciones de desarrollo para el proyecto Libreta Abierta.
Stack: Vue 3.5+, Vite 6+, Pinia, Vue Router 4, Tailwind CSS 4, TypeScript.

---

## Vue 3.5+ (Composition API)

### Sintaxis obligatoria

- Usar siempre `<script setup lang="ts">` en todos los SFC
- No usar Options API bajo ninguna circunstancia
- Orden en SFC: `<script setup>` → `<template>` → `<style>`

### APIs modernas (Vue 3.4/3.5)

- Usar `defineModel()` para v-model bidireccional en componentes (reemplaza prop + emit manual)
- Usar `useTemplateRef('name')` para referencias a elementos DOM (reemplaza `ref(null)` con nombre de variable)
- Usar `onWatcherCleanup()` dentro de watchers para cancelar side effects (peticiones fetch, timers)
- Reactive props destructuring es estable: `const { title, count = 0 } = defineProps<Props>()`
- Usar `defineOptions({ name: 'ComponentName' })` solo cuando se necesite nombre explícito (recursión, devtools)

### Composables

- Prefijo `use` obligatorio: `useNotes`, `useStorage`, `useEditor`
- Un composable = una responsabilidad
- Retornar siempre un objeto con propiedades nombradas (no tuplas)
- Los composables manejan lógica reutilizable; el estado global va en Pinia
- Ubicación: `src/composables/`

```typescript
// ✅ Correcto
export function useNotes() {
  const notes = ref<Note[]>([])
  const isLoading = ref(false)

  async function fetchNotes() { /* ... */ }

  return { notes, isLoading, fetchNotes }
}

// ❌ Incorrecto - retornar tupla
export function useNotes() {
  return [notes, isLoading, fetchNotes]
}
```

### Reactividad

- Usar `ref()` para primitivos y valores que se reasignan
- Usar `reactive()` solo para objetos complejos que no se reasignan
- Usar `computed()` para valores derivados (no crear refs que se actualizan manualmente en watchers)
- Usar `shallowRef()` para objetos grandes que se reemplazan completos (como contenido del editor)
- Usar `toRefs()` / `storeToRefs()` al desestructurar stores o reactive objects

### Watchers

- Preferir `watchEffect()` cuando el watcher depende de todo lo que lee
- Usar `watch()` explícito cuando solo interesa un subset de dependencias
- Usar `{ immediate: true }` en vez de llamar la función manualmente después del watch
- Limpiar side effects con `onWatcherCleanup()`:

```typescript
watch(searchQuery, (query) => {
  const controller = new AbortController()
  onWatcherCleanup(() => controller.abort())

  fetch(`/api/search?q=${query}`, { signal: controller.signal })
    .then(/* ... */)
})
```

---

## Pinia (Estado global)

### Convenciones

- Usar Setup Stores (función) en vez de Option Stores (objeto):

```typescript
// ✅ Setup Store
export const useNotesStore = defineStore('notes', () => {
  const notes = ref<Note[]>([])
  const activeNote = ref<Note | null>(null)

  const sortedNotes = computed(() =>
    [...notes.value].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  )

  function addNote(note: Note) {
    notes.value.push(note)
  }

  return { notes, activeNote, sortedNotes, addNote }
})
```

- Un store por dominio/feature (no un store monolítico)
- Stores pequeños y cohesivos: `useNotesStore`, `useEditorStore`, `useUiStore`
- Ubicación: `src/stores/`
- Naming: `use[Feature]Store` en el archivo `src/stores/[feature].ts`

### Acceso desde componentes

- Usar `storeToRefs()` para desestructurar estado reactivo del store
- Las acciones (funciones) se desestructuran directo sin `storeToRefs`

```typescript
const store = useNotesStore()
const { notes, activeNote } = storeToRefs(store)
const { addNote, deleteNote } = store
```

---

## Vue Router 4

### Estructura

- Definir rutas en `src/router/index.ts`
- Usar lazy loading para todas las vistas: `() => import('@/views/NoteView.vue')`
- Las rutas se definen con objetos tipados, no strings sueltos

### Convenciones

- Vistas (páginas completas) en `src/views/`
- Componentes reutilizables en `src/components/`
- Usar `meta` fields para títulos y metadata de ruta
- Navegación programática con `router.push({ name: 'routeName' })` (por nombre, no por path)

---

## Tailwind CSS 4

### Configuración CSS-first

Tailwind v4 elimina `tailwind.config.js`. Toda la configuración va en CSS:

```css
/* src/assets/styles/main.css */
@import "tailwindcss";

@theme {
  --color-primary: #your-color;
  --color-surface: #your-surface;
  --font-sans: 'Inter', sans-serif;
  --radius-md: 0.5rem;
}
```

### Convenciones

- No crear archivo `tailwind.config.js` — usar directiva `@theme` en CSS
- Customización de tema en `src/assets/styles/main.css`
- Usar clases de utilidad en el template directamente
- Para estilos complejos o repetitivos, extraer con `@apply` en el CSS solo como último recurso
- Usar variantes de Tailwind (`dark:`, `hover:`, `focus:`) antes de escribir CSS custom
- SCSS es válido para estilos del editor Tiptap o componentes que requieran scoped styles complejos

---

## TypeScript

### Configuración

- Strict mode habilitado
- Interfaces para definir shapes de datos (preferir `interface` sobre `type` para objetos)
- Types para uniones, intersecciones, y utilidades

### Convenciones

- Todas las props tipadas con `defineProps<Props>()`
- Todos los emits tipados con `defineEmits<Emits>()`
- No usar `any` — usar `unknown` si el tipo es desconocido
- Tipos compartidos en `src/types/`
- Tipos específicos de un feature colocados junto al feature

```typescript
// src/types/note.ts
export interface Note {
  id: string
  title: string
  content: string
  createdAt: string
  updatedAt: string
  tags: string[]
  folder?: string
}

export interface NoteMetadata {
  id: string
  title: string
  updatedAt: string
  folder?: string
}
```

---

## Estructura de proyecto

```
src/
├── assets/
│   └── styles/
│       └── main.css          # Tailwind + @theme
├── components/
│   ├── ui/                   # Componentes base (Button, Input, Modal)
│   └── editor/               # Componentes del editor Tiptap
├── composables/              # Composables reutilizables
├── router/
│   └── index.ts
├── stores/                   # Pinia stores
├── types/                    # TypeScript interfaces/types
├── views/                    # Páginas/vistas (una por ruta)
├── services/                 # Capa de abstracción de storage/API
├── App.vue
└── main.ts
```

---

## Nombrado de archivos

| Tipo | Convención | Ejemplo |
|------|-----------|---------|
| Componentes Vue | PascalCase | `NoteCard.vue`, `EditorToolbar.vue` |
| Composables | camelCase con prefijo use | `useNotes.ts`, `useStorage.ts` |
| Stores | camelCase | `notes.ts`, `editor.ts` |
| Types | camelCase | `note.ts`, `editor.ts` |
| Servicios | camelCase | `storageService.ts` |
| Vistas | PascalCase | `HomeView.vue`, `NoteView.vue` |
| Utilidades | camelCase | `markdown.ts`, `formatDate.ts` |

---

## Componentes

### Organización interna de `<script setup>`

Orden recomendado dentro del bloque script:

1. Imports
2. Props y emits
3. Stores / composables
4. Refs y reactive state
5. Computed properties
6. Watchers
7. Funciones/métodos
8. Lifecycle hooks

### Reglas

- Componentes pequeños y con una sola responsabilidad
- Props hacia abajo, eventos hacia arriba (no mutar props)
- Usar `v-model` con `defineModel()` para inputs controlados
- Slots para composición flexible
- Componentes base (ui/) son genéricos y sin lógica de negocio

---

## Vite

### Configuración base

- Alias `@` → `src/` configurado en `vite.config.ts` y `tsconfig.json`
- Variables de entorno en archivos `.env` con prefijo `VITE_`
- Plugins mínimos: `@vitejs/plugin-vue`

---

## Testing (cuando se solicite)

- Unit tests con Vitest
- Component tests con @vue/test-utils + Vitest
- E2E con Playwright
- Archivos de test junto al código: `useNotes.test.ts` al lado de `useNotes.ts`
