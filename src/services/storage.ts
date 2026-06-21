import { db } from './db'
import type { Note } from '@/types/note'
import type { Folder } from '@/types/folder'
import type { StorageAdapter } from './adapters/types'
import { IndexedDBAdapter } from './adapters/indexeddb'

let activeAdapter: StorageAdapter = new IndexedDBAdapter()

export function getAdapter(): StorageAdapter {
  return activeAdapter
}

export function setAdapter(adapter: StorageAdapter): void {
  if (!adapter) throw new Error('Invalid adapter')
  activeAdapter = adapter
}

// --- Notes ---

export async function getAllNotes(): Promise<Note[]> {
  return activeAdapter.getAllNotes()
}

export async function getNoteById(id: string): Promise<Note | undefined> {
  return activeAdapter.getNoteById(id)
}

export async function getNotesByFolder(folderId: string | null): Promise<Note[]> {
  return activeAdapter.getNotesByFolder(folderId)
}

export async function saveNote(note: Note): Promise<void> {
  return activeAdapter.saveNote(note)
}

export async function deleteNote(id: string): Promise<void> {
  return activeAdapter.deleteNote(id)
}

// --- Folders ---

export async function getAllFolders(): Promise<Folder[]> {
  return activeAdapter.getAllFolders()
}

export async function getFolderById(id: string): Promise<Folder | undefined> {
  return activeAdapter.getFolderById(id)
}

export async function getFoldersByParent(parentId: string | null): Promise<Folder[]> {
  return activeAdapter.getFoldersByParent(parentId)
}

export async function saveFolder(folder: Folder): Promise<Folder> {
  return activeAdapter.saveFolder(folder)
}

export async function deleteFolder(id: string): Promise<void> {
  return activeAdapter.deleteFolder(id)
}

// --- Seed data (for POC) ---

export async function seedIfEmpty(): Promise<void> {
  if (!(activeAdapter instanceof IndexedDBAdapter)) return

  const noteCount = await db.notes.count()
  if (noteCount > 0) return

  const now = new Date().toISOString()

  const folders: Folder[] = [
    { id: 'proyectos', name: 'Proyectos', parentFolder: null, isFavorite: true, createdAt: now, updatedAt: now },
    { id: 'ideas', name: 'Ideas', parentFolder: null, isFavorite: false, createdAt: now, updatedAt: now },
  ]

  const notes: Note[] = [
    {
      id: 'bienvenida',
      title: 'Bienvenido a Glosa',
      content: '# Bienvenido a Glosa\n\nGlosa es tu espacio personal de notas. Privado, potente y completamente tuyo.\n\n## Primeros pasos\n\n- **Doble click** en una nota para abrirla en el editor\n- **Doble click** en una carpeta para navegar dentro\n- Usa el botón **+ Nueva nota** para crear contenido\n- Usa **Nueva carpeta** para organizar tus ideas\n\n## Almacenamiento\n\nPor defecto tus notas se guardan localmente en IndexedDB. Puedes vincular una carpeta de tu disco desde **Configuración** para trabajar con archivos `.md` reales.\n\n## Formato\n\nGlosa usa markdown. Todo lo que escribas es texto plano portable — puedes copiar tus notas a cualquier editor.\n\n> Tu información es tuya, en tu máquina, bajo tu control.',
      folder: null,
      isFavorite: true,
      createdAt: now,
      updatedAt: now,
      tags: ['guía'],
    },
    {
      id: 'atajos',
      title: 'Atajos y gestos',
      content: '# Atajos y gestos\n\nAlgunas interacciones útiles para moverte rápido:\n\n| Acción | Cómo |\n|--------|------|\n| Abrir nota/carpeta | Doble click |\n| Menú de opciones | Click derecho o botón ⋮ |\n| Toggle sidebar | Botón ☰ en la toolbar |\n| Guardar nota | Automático después de 5s de inactividad |\n| Marcar favorito | Estrella en la tarjeta o menú contextual |\n\n## Organización\n\n- Crea carpetas para agrupar notas por tema\n- Marca como favorito lo que uses frecuentemente\n- Los favoritos aparecen en el sidebar para acceso rápido',
      folder: null,
      isFavorite: false,
      createdAt: now,
      updatedAt: now,
      tags: ['guía'],
    },
    {
      id: 'nota-proyecto',
      title: 'Mi primer proyecto',
      content: '# Mi primer proyecto\n\nUsa carpetas para organizar las notas de un proyecto.\n\nDentro de cada carpeta puedes crear tantas notas como necesites: especificaciones, bitácoras, lluvia de ideas, referencias.\n\n## Siguiente paso\n\nRenombra esta nota y empieza a escribir sobre tu próximo proyecto.',
      folder: 'proyectos',
      isFavorite: false,
      createdAt: now,
      updatedAt: now,
      tags: ['ejemplo'],
    },
    {
      id: 'nota-idea',
      title: 'Lluvia de ideas',
      content: '# Lluvia de ideas\n\nEste es un buen lugar para capturar pensamientos rápidos que quieras desarrollar después.\n\n- Idea 1: ...\n- Idea 2: ...\n- Idea 3: ...\n\nNo te preocupes por la estructura al inicio. Siempre puedes reorganizar después.',
      folder: 'ideas',
      isFavorite: false,
      createdAt: now,
      updatedAt: now,
      tags: ['ejemplo'],
    },
  ]

  await db.folders.bulkPut(folders)
  await db.notes.bulkPut(notes)
}
