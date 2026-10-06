# Estructura del código

Este documento explica cómo está organizado el código fuente para que puedas orientarte rápidamente al trabajar en el proyecto.

---

## Directorio raíz

```
src/
├── assets/styles/       # Tailwind CSS, design tokens, utilidades custom
├── components/          # Componentes Vue organizados por dominio
├── composables/         # Lógica reutilizable (hooks)
├── router/              # Definición de rutas
├── services/            # Capa de almacenamiento y servicios
├── stores/              # Estado global (Pinia)
├── types/               # Interfaces y tipos TypeScript
├── views/               # Vistas (una por ruta)
├── utils/               # Funciones utilitarias
├── App.vue              # Componente raíz
└── main.ts              # Punto de entrada
```

---

## Componentes (`src/components/`)

Organizados por dominio funcional:

| Carpeta | Contenido |
|---------|-----------|
| `ui/` | Componentes base genéricos: botones, modales, iconos, menú contextual. Sin lógica de negocio. Prefijo `Ui`. |
| `editor/` | Componentes del editor Tiptap: toolbar, contenido, bloques de código, selector de emoji. |
| `explorer/` | Tarjetas de notas y carpetas para la vista de explorador. |
| `layout/` | Estructura general: toolbar superior, sidebar, breadcrumbs. |

### Convención de nombres

- Componentes genéricos: `UiButton.vue`, `UiIcon.vue`, `UiContextMenu.vue`
- Componentes de dominio: `FolderCard.vue`, `NoteCard.vue`, `EditorToolbar.vue`

---

## Stores (`src/stores/`)

Estado global con Pinia en formato "setup store" (función):

| Store | Responsabilidad |
|-------|----------------|
| `notes.ts` | Notas: CRUD, favoritos, búsqueda |
| `folders.ts` | Carpetas: CRUD, favoritos, renombrar |
| `ui.ts` | Estado de interfaz: sidebar abierto/cerrado |
| `settings.ts` | Configuración: tema, storage provider, editor |

---

## Services (`src/services/`)

Capa de abstracción que desacopla los stores del almacenamiento concreto:

| Archivo | Rol |
|---------|-----|
| `storage.ts` | Fachada pública: exporta funciones CRUD genéricas |
| `platform/index.ts` | Abstracción de plataforma: detección de escritorio, operaciones FS y cliente de IA |
| `ai.ts` | Servicio de Inteligencia Artificial (Ollama, LM Studio, OpenAI) |
| `adapters/types.ts` | Interfaz `StorageAdapter` |
| `adapters/indexeddb.ts` | Implementación con IndexedDB (Dexie) |
| `adapters/filesystem.ts` | Implementación con archivos `.md` vía Capacitor Desktop Plugin |
| `frontmatter.ts` | Parser y serializador de frontmatter YAML |
| `slug.ts` | Generación de slugs para nombres de archivo |
| `activity.ts` | Tracking de actividad (qué notas se abren) |
| `db.ts` | Esquema de IndexedDB (Dexie) |

---

## Views (`src/views/`)

Una vista por ruta. Cada vista consume stores y componentes:

| Vista | Ruta | Descripción |
|-------|------|-------------|
| `HomeView.vue` | `/` | Pantalla de inicio con actividad reciente |
| `ExplorerView.vue` | `/notes`, `/folder/:path` | Explorador de carpetas y notas |
| `EditorView.vue` | `/note/:id` | Editor de nota individual |
| `FavoritesView.vue` | `/favorites` | Vista de favoritos |
| `TagView.vue` | `/tag/:tag` | Notas filtradas por etiqueta |
| `SettingsView.vue` | `/settings` | Configuración de la app |

---

## Convenciones generales

- **Composition API** con `<script setup lang="ts">` en todos los componentes
- **TypeScript** strict en todo el proyecto
- **Tailwind CSS 4** — estilos en el template, sin `@apply` en scoped styles
- **Props tipadas** con `defineProps<Props>()` y desestructuración reactiva
- **Stores** con `storeToRefs()` para estado reactivo, acciones directas
- Los archivos de test viven junto al código: `storage.test.ts` al lado de `storage.ts`

---

## Siguientes pasos

- [Almacenamiento](./04-almacenamiento.md) — Cómo funciona la persistencia
- [Entorno de desarrollo](./02-entorno-desarrollo.md) — Cómo correr el proyecto
- [Volver al índice](./README.md)
