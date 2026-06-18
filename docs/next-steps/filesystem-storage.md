# File System Access API — Storage en Filesystem Local

## Resumen

Implementar un adapter de storage que use la File System Access API del navegador
para leer/escribir archivos markdown directamente en una carpeta del sistema del usuario.

Esto elimina la dependencia de IndexedDB para persistencia y permite que las notas
sean archivos reales visibles en el filesystem — editables con cualquier editor,
versionables con Git, y sincronizables con cualquier servicio de archivos.

---

## Flujo de usuario

1. El usuario entra a Configuración
2. Selecciona "Vincular carpeta local"
3. El navegador muestra el diálogo nativo de selección de carpeta
4. El usuario selecciona/crea una carpeta (ej. `~/Documents/glosa/`)
5. El navegador otorga permisos de lectura/escritura sobre esa carpeta
6. A partir de ahí, la app lee y escribe archivos `.md` directamente

Al reabrir el navegador, la app solicita re-autorización con un click
("Permitir acceso a la carpeta vinculada").

---

## Estructura de archivos en disco

```
~/Documents/glosa/
├── .glosa/
│   └── meta.json              ← Metadata de la app (folders, activity, etc.)
├── ideas/
│   ├── proyecto-x.md
│   └── brainstorm.md
├── escaletas/
│   └── cortometraje.md
└── nota-suelta.md
```

### Convenciones:

- Cada carpeta en el filesystem = un Folder en la app
- Cada archivo `.md` = una Note
- La metadata que no cabe en frontmatter (activity, orden de favoritos) va en `.glosa/meta.json`
- Los archivos se nombran con el slug del título: `mi-nota-importante.md`
- Si hay conflicto de nombre, se agrega un sufijo numérico: `mi-nota-importante-2.md`

### Formato de cada nota (sin cambios):

```markdown
---
id: abc123
title: Mi nota
createdAt: 2026-06-17T10:00:00Z
updatedAt: 2026-06-17T10:30:00Z
tags: [idea, proyecto]
isFavorite: false
emoji: 📝
coverImage: https://...
---

# Mi nota

Contenido en markdown...
```

---

## Consideraciones técnicas

### API a utilizar

```typescript
// Solicitar acceso a carpeta
const dirHandle = await window.showDirectoryPicker({
  mode: 'readwrite',
  startIn: 'documents',
})

// Listar archivos
for await (const [name, handle] of dirHandle.entries()) {
  if (handle.kind === 'file' && name.endsWith('.md')) {
    // Es una nota
  } else if (handle.kind === 'directory' && !name.startsWith('.')) {
    // Es una carpeta
  }
}

// Leer archivo
const fileHandle = await dirHandle.getFileHandle('nota.md')
const file = await fileHandle.getFile()
const content = await file.text()

// Escribir archivo
const writable = await fileHandle.createWritable()
await writable.write(content)
await writable.close()

// Crear archivo nuevo
const newHandle = await dirHandle.getFileHandle('nueva-nota.md', { create: true })

// Crear subcarpeta
const subDir = await dirHandle.getDirectoryHandle('ideas', { create: true })

// Eliminar
await dirHandle.removeEntry('nota.md')
await dirHandle.removeEntry('carpeta', { recursive: true })
```

### Persistencia del permiso

El `FileSystemDirectoryHandle` se puede almacenar en IndexedDB para reutilizarlo
entre sesiones. Al reabrir, se llama:

```typescript
const permission = await dirHandle.queryPermission({ mode: 'readwrite' })
if (permission === 'granted') {
  // Ya tiene acceso
} else {
  // Pedir permiso de nuevo (requiere gesto del usuario)
  await dirHandle.requestPermission({ mode: 'readwrite' })
}
```

Esto significa que al reabrir el navegador, la app puede mostrar un botón
"Reconectar carpeta" que con un solo click restaura el acceso.

### Compatibilidad

| Navegador | Soporte |
|-----------|---------|
| Chrome 86+ | ✅ Completo |
| Edge 86+ | ✅ Completo |
| Arc | ✅ (basado en Chromium) |
| Brave | ✅ (basado en Chromium) |
| Opera | ✅ (basado en Chromium) |
| Firefox | ❌ No soportado |
| Safari | ❌ No soportado (parcial en Safari 15.2+ solo lectura) |

**Decisión:** Ofrecer filesystem como opción opt-in. IndexedDB sigue siendo el
default y funciona en todos los navegadores. Si el browser no soporta la API,
el botón "Vincular carpeta" no aparece.

### Detección de soporte

```typescript
const isFileSystemSupported = 'showDirectoryPicker' in window
```

---

## Arquitectura del adapter

### Interface común (ya existente implícitamente)

```typescript
interface StorageAdapter {
  getAllNotes(): Promise<Note[]>
  getNoteById(id: string): Promise<Note | undefined>
  saveNote(note: Note): Promise<void>
  deleteNote(id: string): Promise<void>
  getAllFolders(): Promise<Folder[]>
  saveFolder(folder: Folder): Promise<void>
  deleteFolder(id: string): Promise<void>
}
```

### Implementaciones

```
services/
├── storage.ts              ← Facade que delega al adapter activo
├── adapters/
│   ├── indexeddb.ts        ← Adapter actual (Dexie)
│   └── filesystem.ts      ← Nuevo adapter (File System Access API)
└── db.ts                   ← Schema Dexie (usado por indexeddb adapter)
```

### Selección del adapter

```typescript
// services/storage.ts
import type { StorageAdapter } from './adapters/types'
import { IndexedDBAdapter } from './adapters/indexeddb'
import { FileSystemAdapter } from './adapters/filesystem'

let activeAdapter: StorageAdapter = new IndexedDBAdapter()

export function setAdapter(adapter: StorageAdapter) {
  activeAdapter = adapter
}

export async function switchToFileSystem(dirHandle: FileSystemDirectoryHandle) {
  activeAdapter = new FileSystemAdapter(dirHandle)
  // Persist handle reference in IndexedDB for next session
}

// Todas las funciones existentes delegan:
export async function getAllNotes() {
  return activeAdapter.getAllNotes()
}
// ...
```

---

## Parsing de archivos

### Leer nota desde archivo `.md`

```typescript
import matter from 'gray-matter'  // o implementación propia

function parseNoteFile(filename: string, content: string): Note {
  const { data, content: body } = matter(content)
  return {
    id: data.id || generateId(),
    title: data.title || filenameToTitle(filename),
    content: body,
    folder: null, // Se determina por la carpeta donde vive
    isFavorite: data.isFavorite ?? false,
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: data.updatedAt || new Date().toISOString(),
    tags: data.tags || [],
    emoji: data.emoji,
    coverImage: data.coverImage,
  }
}
```

### Escribir nota a archivo `.md`

```typescript
function serializeNote(note: Note): string {
  const frontmatter = {
    id: note.id,
    title: note.title,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
    tags: note.tags,
    isFavorite: note.isFavorite,
    ...(note.emoji && { emoji: note.emoji }),
    ...(note.coverImage && { coverImage: note.coverImage }),
  }
  return `---\n${yaml.stringify(frontmatter)}---\n\n${note.content}`
}
```

---

## Manejo de carpetas

Las carpetas en el filesystem se mapean directamente a Folders en la app.
El `id` de un folder es su path relativo desde la raíz (ej. `ideas`, `ideas/sub`).

Al listar una carpeta:
1. Iterar entries del `DirectoryHandle`
2. Subdirectorios (excepto `.glosa`) → Folders
3. Archivos `.md` → Notes (con `folder` = path relativo del padre)

---

## Migración IndexedDB → Filesystem

Al vincular una carpeta por primera vez, ofrecer:

1. **Exportar notas existentes** — Escribe todas las notas de IndexedDB como archivos `.md` en la carpeta
2. **Importar carpeta existente** — Lee archivos `.md` ya presentes y los carga en la app
3. **Empezar vacío** — Ignora IndexedDB, empieza fresh

---

## Conflictos y edge cases

| Caso | Solución |
|------|----------|
| Archivo editado externamente | Al enfocar la app, re-leer archivos modificados (comparar `lastModified`) |
| Archivo eliminado externamente | Detectar al listar, marcar como eliminado en la app |
| Nombre de archivo duplicado | Agregar sufijo numérico |
| Caracteres no válidos en filename | Slugificar título (quitar acentos, especiales, etc.) |
| Carpeta `.glosa` | Siempre oculta en la app, no se muestra como folder |
| Nota sin frontmatter (creada externamente) | Generar frontmatter al abrir por primera vez |

---

## Pasos de implementación

1. [ ] Crear interface `StorageAdapter`
2. [ ] Refactorizar `services/storage.ts` para usar adapters
3. [ ] Extraer lógica actual a `adapters/indexeddb.ts`
4. [ ] Implementar `adapters/filesystem.ts`
5. [ ] Agregar parsing de frontmatter (gray-matter o implementación ligera)
6. [ ] UI de configuración: botón "Vincular carpeta local"
7. [ ] Persistir `DirectoryHandle` en IndexedDB para reconexión
8. [ ] UI de reconexión al reabrir ("Reconectar carpeta")
9. [ ] Migración: exportar de IndexedDB a filesystem
10. [ ] Detección de cambios externos (file watching via polling)
11. [ ] Tests unitarios para el adapter filesystem (mock de File System API)

---

## Dependencias adicionales

- `gray-matter` (o implementación propia) para parsear frontmatter YAML
- No se necesita nada más — la File System Access API es nativa del browser

---

## Impacto en UX

- En la configuración aparece una sección "Almacenamiento"
- Opciones: "Navegador (IndexedDB)" o "Carpeta local"
- Si el browser no soporta la API, solo se muestra la opción de navegador
- Al vincular carpeta, los archivos son inmediatamente visibles en Finder/Explorer
- El usuario puede editar notas con otro editor y los cambios se reflejan en la app
