# Arquitectura

Este documento describe cómo está organizado el sistema, las decisiones técnicas principales y cómo se relacionan las piezas.

---

## Visión general

Glosa es una aplicación frontend autónoma que no requiere backend para funcionar. Se ejecuta como aplicación de escritorio nativa (vía Capacitor + Electron) o directamente en un navegador web.

```
┌─────────────────────────────────────────┐
│           Frontend (Vue 3 + Vite)       │
│     Interfaz de usuario completa        │
├─────────────────────────────────────────┤
│         Capa de almacenamiento          │
│   IndexedDB ↔ Adapter ↔ Filesystem     │
├─────────────────────────────────────────┤
│     Capacitor + Capawesome Electron     │
│   Acceso al sistema de archivos (FS),   │
│   streaming de IA local y empaquetado   │
└─────────────────────────────────────────┘
```

---

## Decisiones clave

### Frontend-first

La lógica completa vive en el frontend. No hay servidor ni API necesaria para operar. Esto simplifica el deploy, elimina latencia de red y garantiza que la app funcione sin internet.

### Adapter pattern para almacenamiento

El almacenamiento es intercambiable. Una interfaz `StorageAdapter` define las operaciones (CRUD de notas y carpetas) y existen implementaciones para:

- **IndexedDB** — almacenamiento en el navegador, ideal para uso rápido sin configuración
- **Filesystem** — archivos `.md` reales en disco, accesible vía Capacitor Desktop Plugin (`@glosa/desktop-plugin`)

Ambos adapters comparten la misma interfaz. El store de Pinia no sabe qué adapter está activo.

### Formato markdown como contrato

Las notas se almacenan como markdown con frontmatter YAML. Este formato es:
- Legible por humanos sin herramientas especiales
- Editable con cualquier editor de texto
- Portable entre sistemas sin transformación
- Versionable con git

### Metadata distribuida

Cada carpeta puede tener un directorio `.glosa/` con un `meta.json` propio. La metadata (nombre personalizado, si es favorita) viaja con la carpeta. No hay un archivo central que pueda desincronizarse.

### Capacitor y Capawesome Electron para acceso nativo y soporte de IA

Capacitor y Capawesome Electron permiten empaquetar la aplicación web como app nativa de escritorio para macOS (formato `.dmg`). A través del plugin `@glosa/desktop-plugin`, proporciona:
- Acceso al sistema de archivos local y selector nativo de directorios.
- Observación de cambios externos en archivos en tiempo real con `chokidar`.
- Puente de red para modelos locales de Inteligencia Artificial (Ollama, LM Studio) con soporte para streaming SSE y resolución de protocolos locales.

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
| Desktop Shell | Capacitor + Capawesome Electron | App nativa de escritorio, acceso FS e IA |
| Testing | Vitest + happy-dom | Tests unitarios rápidos |

---

## Plataformas soportadas

- macOS (escritorio `.dmg`)
- Navegadores web modernos (PWA / SPA)

Dispositivos con pantalla menor a 600px de ancho muestran un mensaje indicando que la aplicación requiere una pantalla más grande.

---

## Siguientes pasos

- [Entorno de desarrollo](./02-entorno-desarrollo.md) — Configura tu máquina
- [Estructura del código](./03-estructura-codigo.md) — Oriéntate en el repositorio
- [Volver al índice](./README.md)
