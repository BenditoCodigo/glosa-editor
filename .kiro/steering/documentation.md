# Documentación Colaborativa - Convenciones

Este steering define las reglas para crear y mantener la documentación del proyecto
orientada a colaboradores y público general en proyectos de código libre.

---

## Ubicación

Toda la documentación reside en la carpeta `documentacion/` en la raíz del repositorio.

```
documentacion/
├── README.md                    ← Overview e índice general
├── 01-vision.md                 ← Documentos generales (público general)
├── 02-mision.md
├── manuales-usuario/
│   ├── README.md                ← Overview e índice de manuales de usuario
│   ├── 01-introduccion.md
│   └── 02-primeros-pasos.md
└── manuales-tecnicos/
    ├── README.md                ← Overview e índice de manuales técnicos
    ├── 01-arquitectura.md
    └── 02-entorno-desarrollo.md
```

---

## Estructura obligatoria

### Jerarquía

- Máximo **1 nivel de profundidad** de subcarpetas dentro de `documentacion/`
- Cada carpeta y subcarpeta **debe** tener un `README.md` que funcione como overview e índice de su contenido
- Las subcarpetas por defecto son:
  - `manuales-usuario/` — para público general
  - `manuales-tecnicos/` — para desarrolladores

### Nombrado de archivos

- Todos los documentos son archivos `.md`
- Títulos secuenciales y breves: `01-introduccion.md`, `02-primeros-pasos.md`, `03-navegacion.md`
- El número de secuencia define el orden de lectura
- Usar siempre kebab-case en español sin acentos en el nombre del archivo

---

## Contenido por ubicación

### `colaboracion/` (raíz)

Documentos para que **público general** entienda la visión, misión y objetivos del proyecto.

- ¿Qué es este proyecto?
- ¿Por qué existe?
- ¿Para quién es?
- ¿Hacia dónde va?

**Tono:** Cálido, inspirador, accesible. No se requiere conocimiento técnico para entenderlos.

### `colaboracion/manuales-usuario/`

Explican el uso general de la herramienta para personas con **perfil técnico muy bajo o nulo**.

- Cómo instalar o acceder
- Cómo realizar las tareas principales (paso a paso)
- Cómo resolver problemas comunes
- Capturas de pantalla o descripciones visuales cuando sea posible

**Tono:** Paciente, didáctico, sin jerga técnica. Asume que el lector nunca ha usado herramientas similares.

### `colaboracion/manuales-tecnicos/`

Documentos que permiten a **desarrolladores** entender cómo se construye la herramienta, cómo contribuir y aspectos técnicos.

- Arquitectura del sistema
- Configuración del entorno de desarrollo
- Estructura del código
- Convenciones y estándares
- Guía para contribuir
- Procesos de build, testing y deploy

**Tono:** Preciso, directo, técnico pero accesible para cualquier seniority. Un junior debe poder seguir los pasos sin asistencia.

---

## Reglas de redacción

### Idioma

- **Todo** el contenido en español neutro (sin regionalismos)
- No usar anglicismos cuando exista un equivalente claro en español
- Términos técnicos sin traducción directa (como "deploy", "build") pueden mantenerse

### Estilo

- Amigable y fácil de leer
- Párrafos cortos (máximo 4-5 líneas)
- Listas para enumerar pasos o elementos
- Headings claros que anticipen el contenido de la sección
- Incluir ejemplos concretos siempre que sea posible
- **No mencionar herramientas de referencia** (evitar comparaciones del tipo "como X" o "similar a Y") para prevenir malos entendidos

### Referencias cruzadas

- Los documentos deben tener referencias entre sí cuando sea relevante
- Usar enlaces relativos: `[Ver la guía de navegación](./03-navegacion.md)`
- El README de cada carpeta debe listar y enlazar todos sus documentos
- Si un concepto se explica en otro documento, referenciar en vez de repetir

### Estructura de cada documento

```markdown
# Título del documento

Párrafo introductorio breve que explica qué cubre este documento y para quién es útil.

---

## Sección 1

Contenido...

## Sección 2

Contenido...

---

## Siguientes pasos

- [Documento relacionado](./siguiente.md)
- [Volver al índice](./README.md)
```

---

## README de carpeta (template)

Cada README de carpeta sigue esta estructura:

```markdown
# Título de la sección

Breve descripción de qué contiene esta carpeta y para quién está dirigida.

---

## Contenido

| # | Documento | Descripción |
|---|-----------|-------------|
| 01 | [Introducción](./01-introduccion.md) | Qué es y para qué sirve |
| 02 | [Primeros pasos](./02-primeros-pasos.md) | Cómo empezar a usar |

---

## ¿Por dónde empezar?

Si es tu primera vez aquí, te recomendamos comenzar por [Introducción](./01-introduccion.md).
```

---

## Reglas de mantenimiento

1. Al agregar una funcionalidad nueva, actualizar los manuales correspondientes
2. Al modificar la arquitectura, actualizar los manuales técnicos
3. Los README de índice siempre deben estar sincronizados con los archivos existentes
4. No dejar documentos huérfanos (sin referencia desde ningún índice)
5. Revisar que los enlaces relativos funcionen después de renombrar o mover archivos
