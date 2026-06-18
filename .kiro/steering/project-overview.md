# Libreta Abierta - Overview del Proyecto

---

## Qué es

Libreta Abierta es una plataforma personal de notas en formato markdown. Funciona como
una alternativa privada y autogestionada a herramientas como Notion o AppFlowy.

El nombre refleja la intención: un cuaderno abierto — abierto en código, transparente
en su funcionamiento, pero cerrado a terceros que quieran explotar tu información.

---

## Por qué existe

Las plataformas comerciales de notas y productividad:

- Almacenan tu información en sus servidores sin garantías reales de privacidad
- Venden o utilizan datos de usuarios para entrenar modelos de IA sin consentimiento explícito
- Cobran suscripciones mensuales por funcionalidad que un perfil técnico puede sostener por cuenta propia
- Pueden desaparecer, cambiar términos, o bloquear el acceso a TU contenido

Libreta Abierta existe para quienes tienen la capacidad técnica de mantener sus propias
herramientas y eligen hacerlo por principio: tu información es tuya, en tu infraestructura,
bajo tu control.

---

## Para quién

- Desarrolladores y perfiles técnicos que prefieren self-hosting
- Personas que valoran la privacidad de sus ideas, escritos y notas personales
- Quienes quieren dejar de depender de SaaS para funcionalidad que pueden construir

No es una herramienta colaborativa ni pretende reemplazar plataformas de equipos.
Es un cuaderno personal, potente y privado.

---

## Visión a futuro

1. **Código abierto**: El proyecto será open source eventualmente. No con el objetivo
   de recibir contribuciones comunitarias, sino para que otros interesados puedan
   deployarlo, auditarlo y adaptarlo a sus necesidades.

2. **Self-hosted por diseño**: Cada usuario controla dónde viven sus notas
   (disco local, NAS, S3, lo que sea). No hay servidor central ni cuenta de usuario
   en un servicio de terceros.

3. **Integración con IA local**: Vía Ollama u otros modelos locales. La IA asiste
   en la escritura sin que tus datos salgan de tu máquina.

4. **Sin telemetría, sin tracking, sin analytics**: Zero datos enviados a ningún lado.

---

## Arquitectura general

```
┌────────────────────────────────────────────────────┐
│                   Frontend (este repo)              │
│          Vue 3 + Vite + Tailwind + Tiptap          │
│               SPA local / PWA eventual             │
├────────────────────────────────────────────────────┤
│                   Backend (repo aparte)            │
│              Python (FastAPI) dockerizado           │
│             API REST para gestión de notas         │
├────────────────────────────────────────────────────┤
│                   Storage                          │
│      Local filesystem → S3/NAS (eventual)          │
│         Archivos .md con frontmatter YAML          │
├────────────────────────────────────────────────────┤
│                   AI (eventual)                    │
│              Ollama (modelos locales)               │
│         Asistencia de escritura y búsqueda         │
└────────────────────────────────────────────────────┘
```

### Este repositorio

Contiene exclusivamente el frontend. Es una aplicación web SPA que:

- Se ejecuta localmente en el navegador
- Se comunica con un backend Python vía API REST
- En la etapa POC, funciona sin backend usando IndexedDB como storage local
- Eventualmente puede ser PWA para uso offline/móvil

---

## Stack técnico (frontend)

| Capa | Tecnología |
|------|-----------|
| Bundler | Vite 6+ |
| Framework | Vue 3.5+ (Composition API, `<script setup>`) |
| Router | Vue Router 4 |
| Estado | Pinia (setup stores) |
| Editor | Tiptap (vue-3) |
| Styling | Tailwind CSS 4 (CSS-first, `@tailwindcss/vite`) |
| TypeScript | Strict mode |
| Storage POC | IndexedDB (Dexie.js o abstracción propia) |
| Testing | Vitest + Playwright (cuando se requiera) |

---

## Principios de desarrollo

1. **Privacidad primero**: Ningún dato sale de la máquina del usuario en ninguna etapa
2. **Portabilidad**: Las notas son archivos markdown estándar con frontmatter — legibles
   por cualquier editor, copiables a cualquier destino
3. **Simplicidad**: No sobreingenierar. Resolver el problema actual, no el de dentro de 2 años
4. **Independencia**: Mínimas dependencias externas. No depender de servicios cloud para funcionar
5. **Código limpio**: Mantener los steering, seguir convenciones, código legible para el futuro

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
---

# Mi primera nota

Contenido libre en markdown...
```

Este formato es el contrato entre frontend, backend y storage.
No se transforma al migrar — se copia tal cual.

---

## Estado actual

**Fase: Pre-scaffolding**

El proyecto está en definición. Se han establecido:
- Stack técnico
- Lineamientos visuales (Liquid Glass design system)
- Convenciones de código (Vue, Tailwind, TypeScript)
- Definición de interfaz y navegación
- Modelo de datos
- Fases de implementación

Siguiente paso: scaffolding del proyecto y Fase 1 del POC.

---

## Marca

**Proyecto de**: Bendito Código (agencia de desarrollo de software y UI/UX)
**Tipo**: Proyecto interno, eventualmente open source
**Licencia**: Por definir (probablemente MIT o similar permisiva)
