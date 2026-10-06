# Entorno de desarrollo

Este documento explica cómo configurar tu máquina para trabajar en el proyecto. Al final tendrás la aplicación corriendo en modo desarrollo con recarga en caliente.

---

## Requisitos previos

- **Node.js** 22 o superior
- **npm** 10 o superior
- Un editor de código (recomendado: VS Code / Cursor / Antigravity con soporte para Vue y TypeScript)

---

## Instalación

```bash
# Clonar el repositorio
git clone <url-del-repositorio>
cd libreta-abierta/frontend

# Instalar dependencias de Node.js
npm install
```

---

## Comandos principales

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo web (puerto 5173, con IndexedDB) |
| `npm run build` | Compilación de producción del frontend web |
| `npm run type-check` | Verificación estática de tipos TypeScript (`vue-tsc`) |
| `npm run test` | Ejecutar pruebas unitarias automatizadas (`vitest`) |
| `npm run lint` | Verificar formato y calidad de código (`oxlint` + `eslint`) |
| `npm run cap:sync` | Sincronizar assets web con la plataforma Capacitor Electron |
| `npm run cap:dev` | Compilar y lanzar la aplicación de escritorio en modo desarrollo |
| `npm run build:dmg` | Compilar y empaquetar el instalador `.dmg` para macOS |

---

## Desarrollo web (IndexedDB)

Para trabajar en la interfaz de usuario en el navegador:

```bash
npm run dev
```

Abre `http://localhost:5173` en tu navegador. Los cambios en el código se reflejan automáticamente mediante Hot Module Replacement (HMR).

En este modo, el almacenamiento usa IndexedDB de forma local y los endpoints de IA deben permitir CORS si se invocan desde el navegador.

---

## Desarrollo de escritorio (Capacitor Electron)

Para probar la app nativa con acceso completo al sistema de archivos del disco y streaming directo de modelos de IA locales (Ollama):

```bash
npm run cap:dev
```

Este comando:
1. Compila el frontend estático con Vite.
2. Sincroniza los assets hacia la plataforma Electron (`npm run cap:sync`).
3. Compila `electron/main.ts` y lanza la ventana nativa de la aplicación.

---

## Generar instalador macOS (.dmg)

```bash
npm run build:dmg
```

El instalador empaquetado `.dmg` se genera dentro del directorio `electron/dist/` (por ejemplo, `electron/dist/Glosa-0.0.0-arm64.dmg`).

---

## Estructura de archivos relevante

```
├── src/                        # Código fuente de la interfaz (Vue 3 + Pinia + Tiptap)
├── electron/                   # Configuración y punto de entrada de Electron (Capawesome)
│   ├── capacitor.electron.config.ts
│   ├── electron-builder.config.js
│   └── main.ts
├── packages/glosa-desktop/     # Plugin nativo de escritorio (@glosa/desktop-plugin)
├── documentacion/              # Documentación técnica y de usuario
├── capacitor.config.ts         # Configuración central de Capacitor
├── package.json                # Dependencias y scripts de npm
├── vite.config.ts              # Configuración de Vite
└── tsconfig.json               # Configuración de TypeScript
```

---

## Problemas comunes

### Problemas de conexión con Ollama en local (`http://localhost:11434`)

En la app de escritorio, las peticiones de IA utilizan `platformFetch` / `platformStream` a través del proceso principal de Node.js en `@glosa/desktop-plugin`, evitando restricciones de protocolo SSL o CORS de Chromium. Asegúrate de tener Ollama corriendo localmente (`ollama serve` u `ollama run <modelo>`).

### Iconos de la interfaz no visibles sin conexión

Los iconos de Material Symbols se distribuyen localmente mediante el paquete `material-symbols` e importados en `src/main.ts`, por lo que no requieren conexión a internet para renderizarse.

---

## Siguientes pasos

- [Estructura del código](./03-estructura-codigo.md)
- [Almacenamiento](./04-almacenamiento.md)
- [Volver al índice](./README.md)
