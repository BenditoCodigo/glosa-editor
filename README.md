# 📓 Glosa

**Anotaciones, metadata y documentación — en tus propios márgenes.**

Glosa es una plataforma de notas en formato markdown con una interfaz moderna y fluida. Funciona como alternativa privada a herramientas como Notion o AppFlowy — sin telemetría, sin tracking, sin explotar tus datos.

El nombre viene de las glosas: las anotaciones y traducciones que los eruditos escribían en los márgenes de textos antiguos. Refleja la acción de tomar notas, agregar metadata y documentar.

Tus notas son tuyas. En tu infraestructura. Bajo tu control.

---

## ¿Por qué existe?

Las plataformas comerciales de productividad:

- Almacenan tu información en sus servidores sin garantías reales de privacidad
- Utilizan datos de usuarios para entrenar modelos de IA sin consentimiento explícito
- Cobran suscripciones por funcionalidad que un perfil técnico puede sostener por cuenta propia
- Pueden desaparecer, cambiar términos, o bloquear el acceso a tu contenido

Glosa existe para quienes tienen la capacidad técnica de mantener sus propias herramientas y eligen hacerlo por principio.

---

## Características

- ✍️ Editor rico en markdown (Tiptap) con formateo, tablas, listas de tareas, imágenes y bloques de código con syntax highlighting
- 📁 Organización por carpetas con navegación tipo Google Drive
- 🏷️ Sistema de tags navegables
- ⭐ Favoritos con acceso rápido
- 🌙 Tema claro y oscuro (Liquid Glass design system)
- 🏠 Vista de inicio con actividad reciente y nota destacada
- 💾 Autosave con persistencia local (IndexedDB)
- 📝 Formato portable: archivos markdown con frontmatter YAML — legibles por cualquier editor
- 🔒 Zero datos enviados a terceros. Nunca.

---

## Stack técnico

| Capa | Tecnología |
|------|-----------|
| Framework | Vue 3.5+ (Composition API, `<script setup>`) |
| Bundler | Vite 8 |
| Estado | Pinia |
| Router | Vue Router 4 |
| Editor | Tiptap + extensiones (tablas, tasks, code highlight, imágenes) |
| Estilos | Tailwind CSS 4 (CSS-first, sin config JS) |
| Almacenamiento | IndexedDB (Dexie.js) — migrable a S3/NAS |
| Testing | Vitest + happy-dom + fake-indexeddb |
| Lenguaje | TypeScript (strict mode) |
| Desktop | Tauri 2 (app nativa multiplataforma) |

---

## Inicio rápido

### Web (navegador)

```bash
# Clonar el repositorio
git clone https://gitlab.com/bendito-codigo/glosa-frontend.git
cd glosa-frontend

# Instalar dependencias
npm install

# Ejecutar en desarrollo
npm run dev

# Build de producción
npm run build

# Ejecutar pruebas
npm run test

# Lint
npm run lint
```

> Requiere Node.js 22+ y npm 10+

### Desktop (app nativa con Tauri)

La misma app empaquetada como aplicación de escritorio nativa. No requiere navegador abierto.

```bash
# Requisitos adicionales: Rust (https://rustup.rs)

# Ejecutar en modo desarrollo (con hot reload)
npm run tauri:dev

# Generar instalador para tu plataforma
npm run tauri:build
```

Los binarios se generan en `src-tauri/target/release/bundle/`:
- **macOS**: `.app` + `.dmg`
- **Windows**: `.exe` + `.msi`
- **Linux**: `.AppImage` + `.deb`

---

## Estructura del proyecto

```
src/                        # Frontend Vue
├── assets/styles/          # Tailwind + design tokens + utilidades glass
├── components/
│   ├── ui/                 # Componentes base reutilizables (Button, Icon, Modal...)
│   ├── editor/             # Componentes del editor Tiptap
│   ├── explorer/           # Componentes del explorador de archivos
│   └── layout/             # Layout (Toolbar, Sidebar, Breadcrumbs)
├── composables/            # Lógica reutilizable
├── router/                 # Definición de rutas
├── services/               # Capa de storage y actividad (IndexedDB)
├── stores/                 # Pinia stores (notas, carpetas, UI)
├── types/                  # Interfaces TypeScript
└── views/                  # Vistas/páginas

src-tauri/                  # App de escritorio (Tauri/Rust)
├── tauri.conf.json         # Configuración de la ventana y build
├── Cargo.toml              # Dependencias Rust
├── src/main.rs             # Entry point (~10 líneas)
└── icons/                  # Íconos de la app por plataforma
```

---

## Formato de notas

Cada nota es un archivo markdown válido con frontmatter YAML:

```markdown
---
id: abc123
title: Mi primera nota
createdAt: 2026-06-17T10:00:00Z
updatedAt: 2026-06-17T10:30:00Z
tags: [idea, proyecto]
folder: ideas
isFavorite: false
emoji: 📝
---

# Mi primera nota

Contenido libre en markdown...
```

Este formato es el contrato entre frontend, backend y storage. No se transforma al migrar — se copia tal cual.

---

## Arquitectura

Glosa está diseñada para funcionar **sin backend**. El frontend es completamente autónomo — persiste tus notas en el navegador (IndexedDB) y no necesita ningún servidor para operar.

El backend y el almacenamiento en la nube son **opcionales**. Si los quieres, puedes clonar el repo del backend oficial o construir el tuyo propio — la API es simple (CRUD de archivos markdown).

```
┌─────────────────────────────────────────┐
│          Frontend (este repo)            │
│     Vue 3 + Vite + Tailwind + Tiptap    │
│     ✅ Funciona solo, sin backend        │
├─────────────────────────────────────────┤
│     Backend (opcional, repo aparte)      │
│     Python (FastAPI) dockerizado         │
│     Clónalo o construye el tuyo         │
├─────────────────────────────────────────┤
│        Storage (tú decides)             │
│     IndexedDB / Filesystem / S3 / NAS   │
├─────────────────────────────────────────┤
│        AI (opcional, próximamente)       │
│     Ollama — modelos locales            │
└─────────────────────────────────────────┘
```

**¿Quieres solo tomar notas?** Clona este repo, corre `npm run dev`, listo. Sin Docker, sin API keys, sin configuración.

**¿Quieres sync entre dispositivos o backup en la nube?** Conecta un backend. El frontend detecta si hay un API disponible y la usa; si no, trabaja en modo local.

---

## Modelo de uso

Glosa sigue el modelo de [Bitwarden](https://bitwarden.com/): código abierto completo, sin features castrados.

**Self-hosted (gratuito):** La app completa en tu infraestructura. Sin cuenta, sin servidor central, sin limitaciones.

**Servicio managed (próximamente):** Para quienes prefieren no gestionar infra — cuenta en la plataforma, storage cifrado en S3, sync entre dispositivos. Mismo software, alguien más se encarga del hosting.

---

## Principios

1. **Privacidad primero** — Ningún dato sale de tu máquina sin tu consentimiento
2. **Portabilidad** — Tus notas son archivos markdown estándar, legibles por cualquier editor
3. **Simplicidad** — Resolver el problema actual, no sobreingeniear
4. **Independencia** — Mínimas dependencias externas, sin servicios cloud obligatorios
5. **Interfaz en español** — Impulsando el open source latino

---

## Estado actual

🟡 **En desarrollo activo — Fase POC**

El proyecto está funcional localmente con:
- Editor completo con formateo rico
- Navegación por carpetas y tags
- Persistencia en IndexedDB
- Sistema de diseño Liquid Glass (light/dark)
- Activity tracking para home personalizado

Próximos pasos:
- [ ] Integración con backend Python
- [ ] Storage en S3
- [ ] Cifrado end-to-end
- [ ] PWA / offline
- [ ] Integración con Ollama

---

## Contribuciones

Por ahora este es un proyecto personal de [Bendito Código](https://benditocodigo.com). No está abierto a contribuciones externas en esta etapa, pero el código es público para que cualquier interesado pueda auditarlo, deployarlo y adaptarlo a sus necesidades.

---

## Licencia

Por definir. Será una licencia permisiva (MIT o similar).

---

**Hecho con 🌿 por [Bendito Código](https://benditocodigo.com)**
