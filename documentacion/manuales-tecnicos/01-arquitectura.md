# Arquitectura

Este documento describe cómo está organizado el sistema, las decisiones técnicas principales y cómo se relacionan las piezas.

---

## Visión general

Glosa es una aplicación frontend autónoma que no requiere backend para funcionar. Se ejecuta como aplicación de escritorio nativa (via Tauri) o directamente en un navegador web.

```
┌─────────────────────────────────────────┐
│           Frontend (Vue 3 + Vite)       │
│     Interfaz de usuario completa        │
├─────────────────────────────────────────┤
│         Capa de almacenamiento          │
│   IndexedDB ↔ Adapter ↔ Filesystem     │
├─────────────────────────────────────────┤
│         Tauri (shell nativo)            │
│   Acceso al sistema de archivos,        │
│   empaquetado como app de escritorio    │
└─────────────────────────────────────────┘
```

---

## Decisiones clave

### Frontend-first

La lógica completa vive en el frontend. No hay servidor ni API necesaria para operar. Esto simplifica el deploy, elimina latencia de red y garantiza que la app funcione sin internet.

### Adapter pattern para almacenamiento

El almacenamiento es intercambiable. Una interfaz `StorageAdapter` define las operaciones (CRUD de notas y carpetas) y existen implementaciones para:

- **IndexedDB** — almacenamiento en el navegador, ideal para uso rápido sin configuración
- **Filesystem** — archivos `.md` reales en disco, accesible vía Tauri

Ambos adapters comparten la misma interfaz. El store de Pinia no sabe qué adapter está activo.

### Formato markdown como contrato

Las notas se almacenan como markdown con frontmatter YAML. Este formato es:
- Legible por humanos sin herramientas especiales
- Editable con cualquier editor de texto
- Portable entre sistemas sin transformación
- Versionable con git

### Metadata distribuida

Cada carpeta puede tener un directorio `.glosa/` con un `meta.json` propio. La metadata (nombre personalizado, si es favorita) viaja con la carpeta. No hay un archivo central que pueda desincronizarse.

### Tauri para acceso nativo

Tauri 2 permite empaquetar la aplicación web como app nativa de escritorio y tablet. Proporciona acceso al sistema de archivos, diálogos nativos y observación de cambios en archivos — sin las desventajas de peso y memoria de soluciones basadas en Chromium embebido.

---

## Stack tecnológico

| Capa | Tecnología | Rol |
|------|-----------|-----|
| UI Framework | Vue 3.5 (Composition API) | Componentes reactivos |
| Bundler | Vite 8 | Build rápido, HMR |
| Estado | Pinia | Stores reactivos |
| Editor | Tiptap + tiptap-markdown | Edición rica con serialización markdown |
| Estilos | Tailwind CSS 4 | Utilidades CSS-first |
| Tipos | TypeScript (strict) | Seguridad de tipos |
| Desktop/Mobile | Tauri 2 | App nativa, acceso FS |
| Testing | Vitest + happy-dom | Tests unitarios rápidos |

---

## Plataformas soportadas

- macOS (escritorio)
- Windows (escritorio)
- Linux (escritorio)
- Android (tablets con pantalla ≥ 7")

Dispositivos con pantalla menor a 600px de ancho muestran un mensaje indicando que la aplicación requiere una pantalla más grande.

---

## Siguientes pasos

- [Entorno de desarrollo](./02-entorno-desarrollo.md) — Configura tu máquina
- [Estructura del código](./03-estructura-codigo.md) — Oriéntate en el repositorio
- [Volver al índice](./README.md)
