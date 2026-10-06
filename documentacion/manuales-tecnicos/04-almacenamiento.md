# Almacenamiento

Este documento explica cómo Glosa persiste los datos, los diferentes modos de almacenamiento y cómo funciona la metadata de carpetas.

---

## Patrón de diseño: Adapter

El almacenamiento usa el patrón adapter. Una interfaz `StorageAdapter` define las operaciones disponibles y existen dos implementaciones intercambiables:

```typescript
interface StorageAdapter {
  getAllNotes(): Promise<Note[]>
  getNoteById(id: string): Promise<Note | undefined>
  getNotesByFolder(folderId: string | null): Promise<Note[]>
  saveNote(note: Note): Promise<void>
  deleteNote(id: string): Promise<void>
  getAllFolders(): Promise<Folder[]>
  getFolderById(id: string): Promise<Folder | undefined>
  getFoldersByParent(parentId: string | null): Promise<Folder[]>
  saveFolder(folder: Folder): Promise<Folder>
  deleteFolder(id: string): Promise<void>
}
```

Los stores de Pinia llaman a funciones de `services/storage.ts` (la fachada) que despacha al adapter activo. Los stores no saben ni les importa qué adapter está en uso.

---

## IndexedDB Adapter

Almacenamiento por defecto. Usa Dexie.js como wrapper sobre IndexedDB del navegador.

- No requiere configuración
- Funciona en web y en la app de escritorio
- Los datos viven dentro del navegador/webview
- Ideal para empezar rápido

Las notas y carpetas se almacenan como objetos JavaScript serializados en tablas de IndexedDB.

---

## Filesystem Adapter

Almacenamiento en el sistema de archivos real. Disponible en la aplicación de escritorio (Capacitor Electron).

### Cómo funciona

1. El usuario vincula una carpeta desde Configuración
2. El adapter escanea recursivamente la carpeta buscando archivos `.md` y subdirectorios
3. Los archivos markdown se parsean: frontmatter → metadata, body → contenido
4. Todo se carga en memoria (cache) para lectura rápida
5. Las escrituras van directo al disco (archivos `.md`)
6. Un file watcher detecta cambios externos y actualiza el cache

### Formato de archivos

Cada nota es un archivo `.md` con frontmatter YAML que incluye su metadata estructurada:

```markdown
---
id: abc123
title: Mi nota
description: Breve resumen o sinopsis de la nota para tarjetas de vista previa.
createdAt: 2026-06-20T10:00:00Z
updatedAt: 2026-06-20T10:30:00Z
tags: [idea, investigacion]
isFavorite: false
emoji: 📝
coverImage: https://images.unsplash.com/photo-123...
sources:
  - https://ejemplo.com/articulo-fuente
aiInstructions: Eres un editor de investigación riguroso. Contrasta fuentes y fechas.
temperature: 0.4
topP: 0.85
---

Contenido en markdown...
```

- **`description`** — Resumen breve o sinopsis opcional. Si está presente, se visualiza en las tarjetas de la nota en el explorador e inicio.
- **`coverImage`** — URL externa o imagen local codificada en Data URL (Base64) que se muestra como encabezado y fondo difuminado.
- **`sources`** y **`aiInstructions`** — Lista de fuentes de consulta e instrucciones específicas para el asistente de IA con prioridad absoluta sobre las globales.
- **`temperature`** y **`topP`** — Parámetros de inferencia de IA específicos para el documento. Tienen prioridad sobre la configuración general de Glosa.

### Nombres de archivo

- El nombre del archivo se deriva del título usando un slug: "Mi Primera Nota" → `mi-primera-nota.md`
- Si hay colisión de nombres, se agrega un sufijo numérico: `mi-nota-2.md`
- El nombre legible siempre se recupera del frontmatter `title`, no del filename

### Nombres de carpeta

- Al crear una carpeta, el directorio en disco usa el nombre slugificado
- El nombre legible original se guarda en la metadata de la carpeta (ver siguiente sección)

---

## Metadata por carpeta

Cada carpeta puede tener un directorio oculto `.glosa/` con un archivo `meta.json`:

```
mi-carpeta/
├── .glosa/
│   └── meta.json
├── nota-1.md
└── nota-2.md
```

### Contenido de `meta.json`

```json
{
  "name": "Mi Carpeta",
  "isFavorite": true
}
```

- `name` — se guarda solo si difiere del nombre del directorio en disco
- `isFavorite` — se guarda solo si es `true`

### Comportamiento

- Glosa **no crea** `.glosa/meta.json` automáticamente al vincular una carpeta existente
- Solo se escribe cuando el usuario modifica la metadata (renombra, marca favorito)
- Si vinculas una carpeta de documentación existente y solo lees, Glosa no toca nada
- La metadata viaja con la carpeta si la mueves o copias

---

## Metadata global

En la raíz de la carpeta vinculada existe un `.glosa/meta.json` con datos globales:

```json
{
  "version": 1,
  "activity": [
    { "type": "open", "noteId": "abc123", "timestamp": "2026-06-20T10:00:00Z" }
  ]
}
```

Solo contiene el historial de actividad (qué notas se abrieron). Se usa para la pantalla de inicio.

---

## Migración entre adapters

Cuando el usuario vincula una carpeta por primera vez y tiene notas en IndexedDB, se ofrece un diálogo de migración con tres opciones:

1. **Exportar** — Copia las notas de IndexedDB como archivos `.md` en la carpeta
2. **Importar** — Usa los archivos que ya existen en la carpeta como set de trabajo
3. **Comenzar vacío** — Inicia sin notas en la carpeta vinculada

---

## Siguientes pasos

- [Arquitectura](./01-arquitectura.md)
- [Estructura del código](./03-estructura-codigo.md)
- [Volver al índice](./README.md)
