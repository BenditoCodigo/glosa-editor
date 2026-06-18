# Glosa - Definición de Interfaz y Navegación

Este steering describe la estructura, comportamiento y resultado esperado de la
interfaz de Glosa: una plataforma personal de notas en markdown con
navegación tipo Google Drive y edición tipo Notion.

---

## Concepto de producto

Plataforma privada para escribir notas en markdown (ideas, escaletas, anécdotas).
Gestión por carpetas/grupos con archivos/notas dentro. Local-first en esta etapa,
con almacenamiento en IndexedDB que preserva formato markdown + frontmatter
para eventual migración a S3/NAS.

---

## Layout general

```
┌─────────────────────────────────────────────────────────┐
│  Toolbar superior                                       │
│  [☰ Toggle sidebar] [🔍 Búsqueda] [🌙/☀️ Tema] [⚙ Settings]│
├──────────────┬──────────────────────────────────────────┤
│              │                                          │
│   Sidebar    │         Área principal                   │
│  (colapsable │                                          │
│   default    │   VISTA EXPLORADOR                       │
│   cerrado)   │   ó                                      │
│              │   VISTA EDITOR                           │
│  ┌─────────┐ │                                          │
│  │Favoritos│ │                                          │
│  │ (max 5) │ │                                          │
│  │ +toggle │ │                                          │
│  ├─────────┤ │                                          │
│  │  Árbol  │ │                                          │
│  │ carpetas│ │                                          │
│  └─────────┘ │                                          │
│              ├──────────────────────────────────────────┤
│              │  Breadcrumbs (inferior, navegables)       │
└──────────────┴──────────────────────────────────────────┘
```

---

## Sidebar

### Comportamiento
- Colapsable, cerrado por defecto (interfaz de enfoque)
- Se abre/cierra con botón toggle en toolbar o atajo de teclado
- Transición suave al colapsar/expandir
- Nivel 1 en jerarquía glass (superficie base, blur alto)

### Secciones

**1. Favoritos**
- Muestra los primeros 5 items marcados como favoritos
- Toggle "ver más" para mostrar el resto
- Pueden ser notas o carpetas
- Ordenados por fecha de añadido como favorito

**2. Árbol de carpetas**
- Estructura jerárquica completa del workspace
- Carpetas expandibles/colapsables con chevron
- Solo muestra carpetas (las notas se ven en el área principal)
- Click simple selecciona, doble click navega dentro
- Drag & drop: arrastrar items hacia carpetas del árbol

---

## Área principal

### Vista Explorador (estilo Drive)

Se muestra cuando se navega a una carpeta (incluyendo la raíz).

**Contenido:**
- Grid o lista con todos los items de la carpeta actual
- Carpetas y notas sueltas conviven al mismo nivel
- Carpetas se muestran primero, luego notas

**Cada item muestra:**
- Icono (carpeta o documento)
- Título
- Fecha de última modificación
- Preview corto (solo notas, primera línea de contenido)
- Indicador de favorito (estrella)

**Interacciones:**
- Click simple → selecciona el item (highlight visual)
- Doble click en carpeta → navega dentro de la carpeta
- Doble click en nota → abre el editor
- Click derecho → menú contextual (renombrar, mover, eliminar, favorito)
- Drag & drop → mover items entre carpetas
- Multi-selección con Ctrl/Cmd+click o Shift+click

**Acciones disponibles (toolbar del explorador o botón +):**
- Crear nueva nota
- Crear nueva carpeta
- Cambiar vista (grid/lista)
- Ordenar por (nombre, fecha, tipo)

### Vista Editor (estilo Notion)

Se muestra cuando se abre una nota.

**Contenido:**
- Editor Tiptap ocupando el espacio principal
- Título de la nota editable (h1 en la parte superior)
- Contenido markdown rico debajo

**Toolbar del editor (Nivel 3, sólida):**
- Formateo de texto (bold, italic, headings, etc.)
- Listas, checkboxes, code blocks
- Insertar (imagen, link, divider)
- Botón volver al explorador

**Comportamiento:**
- Autosave después de X segundos de inactividad
- Indicador visual de "guardando..." / "guardado"
- El sidebar permanece accesible (si está abierto) para navegar a otra nota

---

## Breadcrumbs

### Ubicación
- Parte inferior del área principal (debajo del contenido)
- Siempre visibles tanto en explorador como en editor

### Formato
```
Raíz  /  Ideas  /  Investigación  /  referencias.md
```

### Comportamiento
- Cada segmento es clickeable → navega a esa carpeta
- En vista editor, el último segmento es el nombre de la nota (no clickeable)
- En vista explorador, el último segmento es la carpeta actual

---

## Drag & Drop

### Qué se puede arrastrar
- Notas individuales
- Carpetas
- Selección múltiple de items

### Dónde se puede soltar
- Sobre una carpeta en el área principal → mover dentro
- Sobre una carpeta en el sidebar (árbol) → mover dentro
- En la raíz del árbol → mover a la raíz

### Feedback visual
- Item arrastrado con opacidad reducida + sombra
- Carpeta destino con highlight (borde de acento)
- Indicador de "drop aquí" cuando es válido
- Cursor cambia a "no-drop" cuando es inválido (ej. carpeta sobre sí misma)

---

## Interacciones y atajos

| Acción | Método |
|--------|--------|
| Abrir item | Doble click |
| Seleccionar item | Click simple |
| Multi-selección | Ctrl/Cmd + click |
| Toggle sidebar | Botón o atajo (ej. Ctrl+B) |
| Nueva nota | Botón + o atajo (ej. Ctrl+N) |
| Nueva carpeta | Botón + o atajo (ej. Ctrl+Shift+N) |
| Buscar | Click en 🔍 o atajo (ej. Ctrl+K) |
| Guardar nota | Autosave + manual con Ctrl+S |
| Volver al explorador | Botón back o Escape |
| Renombrar | F2 o menú contextual |
| Eliminar | Delete o menú contextual |
| Favorito toggle | Click en estrella o atajo |

---

## Rutas (Vue Router)

```
/                       → Explorador en raíz
/folder/:path(.*)       → Explorador en carpeta (path anidado dinámico)
/note/:id               → Editor de nota
```

Ejemplos:
- `/` → contenido de la raíz
- `/folder/ideas` → contenido de carpeta "Ideas"
- `/folder/ideas/investigacion` → subcarpeta
- `/note/abc123` → nota abierta en editor

---

## Gestión de datos (POC)

### Modelo de datos

```typescript
interface Note {
  id: string
  title: string
  content: string          // markdown con frontmatter
  folder: string | null    // path de la carpeta padre, null = raíz
  isFavorite: boolean
  createdAt: string        // ISO 8601
  updatedAt: string        // ISO 8601
  tags: string[]
}

interface Folder {
  id: string
  name: string
  parentFolder: string | null  // null = raíz
  isFavorite: boolean
  createdAt: string
  updatedAt: string
}
```

### Almacenamiento (POC)
- IndexedDB vía abstracción `useStorage`
- Cada nota se guarda como markdown puro con frontmatter YAML
- Formato idéntico al destino final (S3/NAS) para migración sin transformación
- Función de exportar todo como .zip con estructura de carpetas

---

## Temas (Light / Dark)

### Toggle en toolbar
- Icono sol/luna
- Persiste preferencia en localStorage
- Clase `dark` en `<html>` para activar variante Tailwind

### Comportamiento visual según tema
- Light: superficies glass con cristal esmerilado, texto gris oscuro
- Dark: superficies glass ahumado, bordes especulares, texto blanco
- Transición suave al cambiar de tema (200ms en background/color)

---

## Prioridad de implementación (fases)

### Fase 1 - POC funcional
1. Layout base (toolbar + área principal, sin sidebar)
2. Vista explorador con lista de notas/carpetas
3. Crear nota y carpeta
4. Doble click para abrir nota/navegar carpeta
5. Editor Tiptap básico (formato markdown)
6. Autosave a IndexedDB
7. Breadcrumbs funcionales
8. Toggle dark/light mode

### Fase 2 - Navegación completa
1. Sidebar con árbol de carpetas
2. Toggle colapsable del sidebar
3. Favoritos (marcar, mostrar en sidebar)
4. Búsqueda básica (por título)
5. Menú contextual (renombrar, eliminar)

### Fase 3 - Interacciones avanzadas
1. Drag & drop (mover notas/carpetas)
2. Multi-selección
3. Atajos de teclado
4. Vista grid en explorador
5. Ordenamiento (nombre, fecha, tipo)
6. Exportar notas como .zip

### Fase 4 - Polish
1. Animaciones y transiciones glass
2. Responsive / breakpoint móvil
3. Búsqueda avanzada (contenido, tags)
4. Indicadores de estado (guardando, error)
