# Entorno de desarrollo

Este documento explica cómo configurar tu máquina para trabajar en el proyecto. Al final tendrás la aplicación corriendo en modo desarrollo con recarga en caliente.

---

## Requisitos previos

### Obligatorios (frontend web)

- **Node.js** 22 o superior
- **npm** 10 o superior
- Un editor de código (recomendado: uno con soporte para Vue y TypeScript)

### Para la app de escritorio (Tauri)

- **Rust** — instalar desde [rustup.rs](https://rustup.rs)
- Dependencias del sistema según tu plataforma (ver [documentación de Tauri](https://tauri.app/start/prerequisites/))

### Para compilar Android

- **Android SDK** con platform 36
- **Android NDK** r28
- **JDK 21** (versiones más recientes no son compatibles con Gradle)

---

## Instalación

```bash
# Clonar el repositorio
git clone <url-del-repositorio>
cd glosa-frontend

# Instalar dependencias de Node.js
npm install
```

---

## Comandos principales

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo web (puerto 5173) |
| `npm run build` | Build de producción |
| `npm run test` | Ejecutar pruebas unitarias |
| `npm run lint` | Verificar estilo de código |
| `npm run tauri:dev` | App de escritorio en modo desarrollo |
| `npm run tauri:build` | Generar instalador de escritorio |

---

## Desarrollo web (sin Tauri)

Para trabajar solo en la interfaz sin funcionalidades nativas:

```bash
npm run dev
```

Abre `http://localhost:5173` en tu navegador. Los cambios en el código se reflejan automáticamente.

En este modo, el almacenamiento usa IndexedDB y las funcionalidades de sistema de archivos no están disponibles.

---

## Desarrollo con Tauri (app nativa)

Para probar la app completa con acceso al sistema de archivos:

```bash
npm run tauri:dev
```

Esto compila el backend de Rust, lanza el servidor de Vite y abre la aplicación en una ventana nativa. La primera compilación de Rust puede tardar varios minutos.

---

## Compilar para Android

```bash
export JAVA_HOME=$(/usr/libexec/java_home -v 21)
export ANDROID_HOME=~/Library/Android/sdk
export NDK_HOME=$ANDROID_HOME/ndk/28.0.13004108

npx tauri android build --debug
```

El APK se genera en `src-tauri/gen/android/app/build/outputs/apk/universal/debug/`.

---

## Estructura de archivos relevante

```
├── src/                    # Código fuente del frontend (Vue)
├── src-tauri/              # Código fuente del shell nativo (Rust)
├── colaboracion/           # Documentación del proyecto
├── package.json            # Dependencias y scripts de npm
├── vite.config.ts          # Configuración de Vite
├── tsconfig.json           # Configuración de TypeScript
└── .kiro/steering/         # Reglas de desarrollo para el agente IA
```

---

## Problemas comunes

### El comando `tauri:dev` falla al compilar Rust

Asegúrate de tener Rust actualizado: `rustup update`

### Android build falla con "Unsupported class file major version"

Necesitas JDK 21 específicamente. Verifica con: `/usr/libexec/java_home -V`

### Errores de permisos al acceder a carpetas vinculadas

El archivo `src-tauri/tauri.conf.json` debe tener `"requireLiteralLeadingDot": false` en la sección `plugins.fs` para permitir acceso a carpetas ocultas como `.glosa`.

---

## Siguientes pasos

- [Estructura del código](./03-estructura-codigo.md)
- [Almacenamiento](./04-almacenamiento.md)
- [Volver al índice](./README.md)
