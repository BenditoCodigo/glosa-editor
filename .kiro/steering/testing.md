# Testing - Convenciones y Prácticas

Este steering define cómo escribir y mantener pruebas unitarias en Libreta Abierta.
Stack: Vitest + happy-dom + fake-indexeddb + @vue/test-utils.

---

## Setup

### Configuración

- Vitest configurado en `vite.config.ts` con `test` block
- Entorno: `happy-dom` (simula DOM sin browser real)
- Setup file: `src/tests/setup.ts` (carga `fake-indexeddb/auto` para simular IndexedDB)
- Globals habilitados (`describe`, `it`, `expect` sin importar)

### Ejecución

```bash
npm run test        # Corre una vez y sale
npm run test:watch  # Modo watch (re-ejecuta en cambios)
```

---

## Ubicación de archivos de test

Los tests viven junto al código que prueban:

```
src/
├── services/
│   ├── storage.ts
│   └── storage.test.ts     ← Test del servicio
├── stores/
│   ├── notes.ts
│   ├── notes.test.ts       ← Test del store
│   ├── folders.ts
│   └── folders.test.ts     ← Test del store
├── composables/
│   ├── useSearch.ts
│   └── useSearch.test.ts   ← Test del composable
```

Nombrado: `[archivo].test.ts` al lado del archivo que prueba.

---

## Qué probar

### Obligatorio probar (unit tests):

1. **Services** (storage, API calls): Todas las funciones CRUD
2. **Stores** (Pinia): Acciones, getters computados, efectos secundarios
3. **Composables**: Lógica reutilizable, transformaciones de datos
4. **Utilidades**: Funciones puras (formatters, parsers, validators)

### No probar (o probar con E2E):

- Templates/renderizado de componentes (salvo lógica compleja)
- Estilos CSS
- Configuración de Vue Router
- Integraciones con librerías externas (Tiptap, Dexie internals)

---

## Patrones

### Patrón base de un test

```typescript
import { describe, it, expect, beforeEach } from 'vitest'

describe('NombreDelModulo', () => {
  beforeEach(async () => {
    // Limpiar estado entre tests
  })

  it('describe el comportamiento esperado', () => {
    // Arrange
    // Act
    // Assert
  })
})
```

### Tests de servicios (IndexedDB)

```typescript
import { db } from './db'
import { saveNote, getNoteById } from './storage'

describe('Storage Service', () => {
  beforeEach(async () => {
    await db.notes.clear()
    await db.folders.clear()
  })

  it('saves and retrieves a note', async () => {
    const note = makeNote({ title: 'Test' })
    await saveNote(note)

    const result = await getNoteById(note.id)
    expect(result).toBeDefined()
    expect(result!.title).toBe('Test')
  })
})
```

### Tests de stores (Pinia)

```typescript
import { setActivePinia, createPinia } from 'pinia'
import { useNotesStore } from './notes'
import { db } from '@/services/db'

describe('Notes Store', () => {
  beforeEach(async () => {
    setActivePinia(createPinia())  // Pinia fresco por test
    await db.notes.clear()         // DB limpia por test
  })

  it('createNote persists and updates store', async () => {
    const store = useNotesStore()
    const note = await store.createNote(null)

    expect(store.notes).toHaveLength(1)
    const fromDb = await db.notes.get(note.id)
    expect(fromDb).toBeDefined()
  })
})
```

### Factory helpers

Crear funciones helper para generar datos de test:

```typescript
function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    id: crypto.randomUUID(),
    title: 'Test Note',
    content: 'Content',
    folder: null,
    isFavorite: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tags: [],
    ...overrides,
  }
}
```

---

## Reglas

### 1. Cada test es independiente

- No depender del orden de ejecución
- Limpiar DB y stores en `beforeEach`
- No compartir estado mutable entre tests

### 2. Probar comportamiento, no implementación

```typescript
// ✅ Prueba el resultado
it('toggleFavorite changes isFavorite to true', async () => {
  const store = useNotesStore()
  const note = await store.createNote(null)
  await store.toggleFavorite(note.id)
  expect(store.notes[0]!.isFavorite).toBe(true)
})

// ❌ Prueba cómo lo hace internamente
it('toggleFavorite calls saveNote with updated object', async () => {
  // Demasiado acoplado a la implementación
})
```

### 3. Cubrir edge cases

- ¿Qué pasa si el ID no existe?
- ¿Qué pasa con contenido vacío?
- ¿Qué pasa con caracteres especiales?
- ¿Qué pasa si se llama dos veces rápido?

### 4. Un assert por concepto (no por línea)

```typescript
// ✅ Múltiples expects sobre el mismo concepto
it('creates a note with correct defaults', async () => {
  const note = await store.createNote(null)
  expect(note.title).toBe('Untitled Note')
  expect(note.content).toBe('')
  expect(note.folder).toBeNull()
  expect(note.isFavorite).toBe(false)
})
```

### 5. Naming descriptivo

Formato: `it('[acción] [resultado esperado]')` o `it('[condición] [comportamiento]')`

```typescript
it('returns undefined for non-existent note')
it('creates note in the specified folder')
it('does not re-seed if data already exists')
it('clears activeNote when the active note is removed')
```

---

## Pitfalls comunes en este proyecto

### Vue Reactive Proxies + IndexedDB

IndexedDB no puede clonar objetos reactivos de Vue. Siempre usar `toRaw()` + `structuredClone()` antes de escribir a la DB:

```typescript
import { toRaw } from 'vue'

const plain = structuredClone(toRaw(reactiveObject))
await storage.saveNote(plain)
```

### Timestamps en tests

Si dos operaciones ocurren en el mismo milisegundo, los timestamps serán iguales.
Para tests que verifican "updatedAt cambió", agregar un `await new Promise(r => setTimeout(r, 5))` entre operaciones.

### fake-indexeddb es síncrono internamente

Las operaciones de `fake-indexeddb` no simulan latencia real. Los tests corren
más rápido pero no detectarán race conditions. Para eso usar E2E.

---

## Cuándo agregar tests

1. **Al crear un nuevo service o store**: Tests desde el primer commit
2. **Al reportar un bug**: Escribir test que reproduzca el bug ANTES de fixearlo
3. **Al modificar lógica de negocio**: Verificar que los tests existentes pasan, agregar nuevos si el comportamiento cambió
4. **No es necesario**: Para componentes puramente visuales o configuración
