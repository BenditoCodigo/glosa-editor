# Manual Técnico: Pipeline de CI/CD (GitHub Actions)

Este documento describe la arquitectura y funcionamiento del pipeline de Integración y Entrega Continua (CI/CD) de Glosa, configurado mediante GitHub Actions.

---

## 1. Objetivo del Pipeline

El flujo automatizado tiene tres propósitos fundamentales:
1. **Garantizar la calidad del código**: Ejecutar linters (Oxlint + ESLint), verificación estática de tipos (Vue TSC) y formato de código antes de cualquier despliegue o integración.
2. **Prevenir regresiones funcionales**: Correr la suite de pruebas unitarias automatizadas (Vitest) en cada cambio.
3. **Generar artefactos ejecutables**: Compilar y empaquetar la aplicación de escritorio para macOS (Capacitor + Electron), generando el instalador `.dmg` y almacenándolo en los artefactos descargables de GitHub Actions.

---

## 2. Disparadores (Triggers)

El pipeline se encuentra definido en [`.github/workflows/ci.yml`](file:///Users/mau/Repos/bendito-codigo/internal/libreta-abierta/frontend/.github/workflows/ci.yml) y se activa ante los siguientes eventos:

- **Push a la rama `main`**: Compila y genera el instalador DMG ante cada cambio integrado a producción.
- **Pull Requests hacia `main`**: Ejecuta las validaciones de calidad, tests y empaquetado para verificar que el PR sea seguro de integrar.
- **`workflow_dispatch`**: Permite la ejecución manual bajo demanda desde la pestaña *Actions* en la interfaz web de GitHub.

Adicionalmente, se incluye una política de concurrencia (`cancel-in-progress: true`) para cancelar automáticamente ejecuciones previas si se envía un nuevo commit a la misma rama, optimizando el uso de recursos y minutos de cómputo.

---

## 3. Estructura de Jobs

```mermaid
flowchart TD
    A[Push / PR a main] --> B[Job: lint-and-typecheck]
    A --> C[Job: unit-tests]
    
    B --> D{¿Pasaron validaciones?}
    C --> D
    
    D -- Sí --> E[Job: build-macos]
    E --> F[Subir Artefacto DMG]
```

### Job 1: `lint-and-typecheck` (Frontend)
- **Entorno**: `ubuntu-latest`
- **Pasos**:
  1. Descarga del código (`actions/checkout@v4`).
  2. Configuración de Node.js 22 con caché de `npm` (`actions/setup-node@v4`).
  3. Instalación de dependencias limpias (`npm ci`).
  4. Ejecución de linters (`npm run lint`): corre Oxlint y ESLint.
  5. Verificación de tipos TypeScript en componentes y composables (`npm run type-check`).

### Job 2: `unit-tests` (Pruebas Unitarias)
- **Entorno**: `ubuntu-latest`
- **Pasos**:
  1. Descarga del código e instalación de dependencias con Node.js 22.
  2. Ejecución de la suite completa de tests (`npm test` con Vitest en modo `run`).

### Job 3: `build-macos` (Generación de Artefacto DMG con Capacitor Electron)
- **Entorno**: `macos-latest` (Apple Silicon)
- **Dependencia**: Solo se ejecuta si los jobs de calidad (`lint-and-typecheck` y `unit-tests`) concluyen satisfactoriamente.
- **Pasos**:
  1. Configuración de Node.js 22.
  2. Instalación de dependencias (`npm ci`).
  3. Ejecución de `npm run build:dmg`:
     - Compila el frontend optimizado con Vite (`npm run build`).
     - Sincroniza los assets web con la plataforma Electron (`npx cap sync @capawesome/capacitor-electron`).
     - Compila la plataforma y empaqueta el instalador `.dmg` mediante `electron-builder`.
  4. Subida del instalador `.dmg` (`electron/dist/*.dmg`) a los artefactos de la ejecución en GitHub mediante `actions/upload-artifact@v4` con retención de 14 días.

---

## 4. Cómo Descargar el Instalador DMG Generado

1. Dirígete a la pestaña **Actions** en el repositorio de GitHub.
2. Selecciona la ejecución del workflow deseada correspondiente a tu commit en `main`.
3. Al pie de la página, en la sección **Artifacts**, encontrarás el archivo **`glosa-macos-dmg`**.
4. Haz clic sobre él para descargar el archivo zip que contiene el `.dmg` listo para instalar.

---

## 5. Mantenimiento y Comandos Locales

Para asegurar que los cambios pasen el pipeline antes de hacer push:

```bash
# 1. Ejecutar linters frontend
npm run lint

# 2. Validar tipos de TypeScript
npm run type-check

# 3. Correr pruebas unitarias
npm test

# 4. Probar build local del instalador DMG
npm run build:dmg
```
