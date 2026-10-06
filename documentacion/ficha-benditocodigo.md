---
title: "Glosa: Tu Cuaderno Digital Privado, Portable y Libre"
description: "Una plataforma personal de notas local-first en markdown que garantiza control absoluto, privacidad total y portabilidad de tus ideas."
publishDate: 2026-07-12
pilar: "B"
technologies: ["Vue 3.5", "Capacitor", "Capawesome Electron", "Tiptap", "Tailwind CSS 4", "TypeScript", "IndexedDB"]
liveUrl: "https://glosa.benditocodigo.com"
featuredImage: "/images/projects/glosa-thumbnail.png"
previewVideo: "/videos/projects/glosa-preview.mp4"
featured: true
---

# Glosa

Glosa es una plataforma personal y libre para escribir y organizar notas en formato markdown. Ha sido diseñada específicamente para personas que valoran la privacidad de sus ideas y quieren tener el control total sobre su información. El proyecto se ejecuta de forma autónoma sin depender de servidores centralizados de terceros, funcionando de manera local-first en el navegador web o como una aplicación nativa de escritorio y tablet. 

Su nombre proviene de las **glosas**, que eran las anotaciones marginales que los eruditos escribían en los textos antiguos. Siguiendo este concepto, Glosa busca ser el lienzo ideal para documentar, anotar, estructurar y enriquecer el conocimiento individual.

## El Propósito Comunitario

En la actualidad, la inmensa mayoría de las herramientas comerciales de notas y productividad (como Notion, Evernote u Obsidian con servicios de sincronización) obligan a los usuarios a almacenar sus datos personales en servidores en la nube de corporaciones privadas. Esto plantea graves problemas:
*   **Pérdida de control e independencia:** Las empresas pueden cambiar sus términos de servicio, subir los precios de sus suscripciones o cerrar la plataforma por completo, lo que pone en riesgo el acceso inmediato a ya años de anotaciones personales.
*   **Uso indebido de la información:** Muchas plataformas recopilan telemetría, analíticas del comportamiento de uso o, peor aún, utilizan los datos de las notas privadas de los usuarios para entrenar modelos de Inteligencia Artificial comerciales sin un consentimiento libre e informado.
*   **Traducciones deficientes o incompletas:** El software de calidad suele desarrollarse primero en inglés, marginando a la comunidad hispanohablante con localizaciones incompletas o interfaces confusas.

Glosa nace para mitigar estas problemáticas de forma directa, rigiéndose bajo principios fundamentales:
1.  **Privacidad absoluta por diseño:** Glosa no recopila ningún tipo de dato, telemetría o analítica de comportamiento. Funciona completamente offline y no requiere de una cuenta ni de registros en internet. Tus notas son tan privadas como un cuaderno de papel.
2.  **Portabilidad y perdurabilidad de los datos:** Las notas se guardan en el formato estándar Markdown (`.md`) con metadatos estructurados en la cabecera YAML (frontmatter). Esto garantiza que el usuario sea el único dueño de su información; si Glosa dejara de existir, las notas se pueden leer, editar y transferir a cualquier otro editor o sistema operativo mediante herramientas tan básicas como un bloc de notas.
3.  **Accesibilidad lingüística:** Toda la interfaz de usuario, manuales de uso y documentación técnica están creados en español neutro, fomentando el desarrollo de software de alta calidad por y para la comunidad hispanohablante y el ecosistema de código abierto en Latinoamérica.

## Vista Previa

### 1. Galería de Interfaces (Carrusel Interactivo)

<div class="project-carousel-interactive">
  <div class="carousel-slides">
    <div class="carousel-slide" data-caption="VISTA EXPLORADOR (ESTILO DRIVE)">
      <img src="/images/projects/glosa-explorador.png" alt="Pantalla de Explorador de Notas y Carpetas" />
    </div>
    <div class="carousel-slide" data-caption="VISTA EDITOR ENRIQUECIDO (ESTILO NOTION)">
      <img src="/images/projects/glosa-editor.png" alt="Pantalla del Editor Tiptap y barra de herramientas markdown" />
    </div>
    <div class="carousel-slide" data-caption="CONFIGURACIÓN DE IA LOCAL (OLLAMA)">
      <img src="/images/projects/glosa-configuracion.png" alt="Pantalla de configuración y conexión con Ollama" />
    </div>
  </div>
</div>

### 2. Grabación de Pantalla (Demo Interactiva)

<video src="/videos/projects/glosa-preview.mp4" autoplay loop muted playsinline class="w-full rounded-xl border border-surface-container-highest my-6 shadow-md"></video>

## Cómo Funciona / Características

A nivel técnico y funcional, Glosa destaca por las siguientes características detalladas:

*   **Arquitectura Frontend-First:** Toda la lógica de negocio y presentación se ejecuta de manera local en el cliente. No requiere un backend propio para operar, lo que simplifica su despliegue y elimina latencias de red.
*   **Patrón Adapter para Almacenamiento Híbrido:** Mediante una interfaz genérica `StorageAdapter`, la aplicación interactúa con dos adaptadores de datos intercambiables y transparentes para la capa de estado (Pinia):
    *   *IndexedDB Adapter:* Almacenamiento rápido por defecto en el navegador web usando la biblioteca Dexie.js como wrapper. No requiere configuraciones iniciales y es ideal para probar la herramienta de inmediato.
    *   *Filesystem Adapter:* Disponible en la versión nativa de escritorio. Permite al usuario vincular un directorio real del disco duro. El adaptador escanea de forma recursiva la carpeta buscando archivos `.md` y subdirectorios, cargándolos en una caché en memoria para una lectura ultrarrápida. Los cambios se escriben directamente en el disco en tiempo real, y un file watcher sincroniza la interfaz si los archivos se editan externamente.
*   **Editor Rich-Text con Serialización Markdown:** Glosa integra el motor Tiptap (basado en ProseMirror) junto con extensiones específicas para formateo markdown. Esto permite tener una experiencia de escritura fluida y visualmente enriquecida similar a la de Notion (títulos, listas, checkboxes, tablas, bloques de código e imágenes) pero guardando el contenido directamente como texto plano en Markdown estándar.
*   **Navegación Intuitiva de Ficheros (Estilo Google Drive):** Organiza el contenido en carpetas y archivos. Incluye:
    *   *Sidebar Colapsable:* Diseñado bajo un concepto de "interfaz de enfoque" (colapsado por defecto) que muestra un árbol jerárquico de carpetas expandible y una sección de favoritos de acceso rápido.
    *   *Vista Explorador:* Presenta en el área principal las subcarpetas y notas en formato grid o lista, con visualización de metadatos (fecha de modificación, preview del contenido, marcación rápida de favorito).
    *   *Breadcrumbs Navegables:* Una ruta dinámica en la parte inferior del editor/explorador que permite regresar o subir de nivel de forma sencilla.
    *   *Drag & Drop Avanzado:* Permite mover notas y carpetas completas arrastrándolas directamente sobre otras carpetas en la vista principal o en el árbol del sidebar.
*   **Metadata Distribuida:** Para evitar bases de datos centralizadas propensas a desincronizarse, la metadata de las carpetas (nombres personalizados y estados de favoritos) se almacena localmente en cada directorio en una subcarpeta oculta `.glosa/meta.json`. De este modo, la metadata viaja de forma intrínseca con el contenido si el usuario mueve las carpetas en su disco duro.
*   **Multiplataforma con Capacitor y Capawesome Electron:** Glosa se empaqueta como aplicación de escritorio nativa para macOS utilizando Capacitor junto con Capawesome Electron y `electron-builder`. A través del plugin `@glosa/desktop-plugin`, la aplicación interactúa de forma nativa con el sistema de archivos del sistema operativo, el observador de cambios reactivo (`chokidar`) y habilita la comunicación sin restricciones de protocolo con modelos de inteligencia artificial locales.
*   **Inteligencia Artificial Local y Privada:** El servicio de IA (`src/services/ai.ts` y `@glosa/desktop-plugin`) permite integrar asistentes de escritura locales de forma totalmente opcional. La aplicación consume la configuración de proveedores de inferencia local como Ollama, LM Studio o llama.cpp (o cualquier servidor compatible con el formato de API de OpenAI). Mediante puentes nativos y streaming por Server-Sent Events (SSE), posibilita resúmenes automáticos, correcciones de estilo y sugerencias creativas de manera offline, asegurando que el contenido de las notas nunca viaje por internet.
*   **Asistente de Migración:** Al vincular una carpeta del sistema de archivos físico por primera vez en un entorno con notas previas en IndexedDB, la aplicación presenta opciones guiadas para migrar: exportando las notas del navegador como archivos físicos, importando los datos del disco duro como base de trabajo activa, o inicializando un espacio de trabajo limpio.

## Contribución y Código Abierto

Glosa se distribuye bajo la licencia **Código Libre No Comercial**. Esto permite que cualquier persona pueda estudiar, modificar, usar y redistribuir libremente el código para fines no lucrativos. 

Si deseas levantar el entorno de desarrollo localmente para inspeccionar la arquitectura o compilar el instalador por tu cuenta, sigue estos pasos:

### Requisitos Previos
*   **Node.js** v22 o superior
*   **npm** v10 o superior

### Instrucciones de Configuración

1.  **Clonar el repositorio:**
    ```bash
    git clone https://github.com/bendito-codigo/libreta-abierta.git
    cd libreta-abierta/frontend
    ```

2.  **Instalar dependencias de Node.js:**
    ```bash
    npm install
    ```

3.  **Ejecutar el Servidor de Desarrollo Web (Frontend puro con IndexedDB):**
    ```bash
    npm run dev
    ```
    *Abre `http://localhost:5173` en tu navegador. Los cambios de código se aplicarán mediante recarga en caliente (HMR).*

4.  **Ejecutar la Versión de Escritorio Nativa (Capacitor Electron con acceso al sistema de archivos local y streaming de IA):**
    ```bash
    npm run cap:dev
    ```
    *Este comando sincroniza los assets web y lanza la ventana nativa de escritorio.*

5.  **Compilar Instalador de Producción macOS (.dmg):**
    ```bash
    npm run build:dmg
    ```
    *El instalador `.dmg` se generará en la carpeta `electron/dist/`.*

6.  **Otras Tareas de Mantenimiento:**
    *   Ejecutar pruebas unitarias: `npm run test`
    *   Verificar tipos de TypeScript: `npm run type-check`
    *   Verificar estilo y errores de código (Lint): `npm run lint`
