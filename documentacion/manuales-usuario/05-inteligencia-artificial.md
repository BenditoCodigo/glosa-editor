# Inteligencia Artificial

Este documento explica qué es la integración de inteligencia artificial en Glosa, qué necesitas para usarla y cómo configurarla paso a paso.

---

## ¿Qué es y qué puedes hacer con ella?

Glosa puede conectarse a un servidor de inteligencia artificial que corra en tu propia computadora. Esto significa que puedes pedirle ayuda al modelo para tareas como:

- Mejorar la redacción de tus notas
- Generar resúmenes de textos largos
- Proponer ideas o estructuras para lo que estés escribiendo
- Organizar contenido

Toda la comunicación ocurre entre tu computadora y el servidor local. Tus notas nunca salen de tu máquina.

---

## ¿Qué necesitas?

Para usar esta función necesitas tener un **servidor de IA corriendo en tu computadora**. El más sencillo de instalar y usar es Ollama, un programa gratuito que descarga y ejecuta modelos de lenguaje de forma local.

Resumen de requisitos:

- Una computadora con al menos 8 GB de RAM (16 GB recomendados)
- Ollama instalado y funcionando
- Un modelo descargado (por ejemplo: `llama3.1:8b`)

---

## Instalar y configurar Ollama (paso a paso)

### 1. Descargar Ollama

Ve a [ollama.com](https://ollama.com) y descarga el instalador para tu sistema operativo. Sigue las instrucciones del instalador como lo harías con cualquier programa.

### 2. Descargar un modelo

Una vez instalado, abre una terminal (o símbolo del sistema en Windows) y escribe:

```
ollama pull llama3.1:8b
```

Esto descargará un modelo de lenguaje a tu computadora. La descarga puede tardar varios minutos dependiendo de tu conexión a internet.

### 3. Verificar que Ollama está corriendo

Ollama se inicia automáticamente después de instalarse. Para confirmar que está activo, abre tu navegador y visita:

```
http://localhost:11434
```

Si ves un mensaje como "Ollama is running", todo está listo.

---

## Configurar en Glosa

Una vez que tu servidor de IA está corriendo, sigue estos pasos en Glosa:

### 1. Ir a Configuración

Haz clic en el ícono de engranaje (⚙) en la barra superior para abrir la pantalla de configuración.

### 2. Buscar la sección "Inteligencia Artificial"

Desplázate hasta encontrar la sección de Inteligencia Artificial.

### 3. Activar la función

Activa el interruptor "Habilitar asistente de IA". Al hacerlo, se mostrarán los campos de configuración.

### 4. Completar los datos de conexión

- **URL Base**: Escribe `http://localhost:11434/v1` (esta es la dirección por defecto de Ollama)
- **Modelo**: Escribe el nombre exacto del modelo que descargaste, por ejemplo `llama3.1:8b`
- **API Key**: Déjalo vacío (Ollama no requiere clave de acceso en uso local)

### 5. Guardar

Los cambios se guardan automáticamente al escribir en cada campo.

---

## Probar la conexión

Después de completar los datos, haz clic en el botón **"Probar conexión"**. Esto enviará una petición de prueba al servidor para verificar que todo funciona.

### Si ves "Conexión exitosa"

Todo está configurado correctamente. El indicador verde confirma que Glosa puede comunicarse con tu servidor de IA.

### Si ves un mensaje de error

Consulta la sección de [Problemas comunes](#problemas-comunes-y-soluciones) más abajo para identificar la causa.

---

## Parámetros del modelo

En la configuración encontrarás controles para ajustar cómo responde el modelo. Aquí explicamos cada uno en lenguaje sencillo:

### Temperatura (Temperature)

Controla qué tan creativo es el modelo al responder.

- **Valor bajo** (por ejemplo 0.2): Las respuestas son más predecibles y conservadoras. Útil cuando necesitas precisión.
- **Valor alto** (por ejemplo 1.5): Las respuestas son más variadas y creativas. Útil para lluvia de ideas.
- **Valor por defecto**: 0.7 (un balance entre creatividad y coherencia).

### Top P (diversidad de palabras)

Controla cuántas opciones de palabras considera el modelo antes de elegir la siguiente.

- **Valor bajo** (por ejemplo 0.5): Elige entre menos opciones, lo que produce texto más enfocado.
- **Valor alto** (por ejemplo 0.95): Considera más opciones, lo que produce texto más diverso.
- **Valor por defecto**: 0.9

### Tokens máximos (Max Tokens)

Define la longitud máxima de la respuesta. Un "token" es aproximadamente una palabra o parte de una palabra.

- **Valor bajo** (por ejemplo 256): Respuestas cortas y directas.
- **Valor alto** (por ejemplo 4096): Respuestas largas y detalladas.
- **Valor por defecto**: 2048 (respuestas de longitud moderada).

### Penalización de frecuencia (Frequency Penalty)

Reduce la repetición de palabras que el modelo ya usó mucho en su respuesta.

- **Valor 0**: Sin penalización, el modelo puede repetir palabras libremente.
- **Valor positivo**: Evita repeticiones.
- **Valor por defecto**: 0

### Penalización de presencia (Presence Penalty)

Anima al modelo a hablar de temas nuevos en lugar de repetir los mismos.

- **Valor 0**: Sin efecto.
- **Valor positivo**: El modelo intentará cubrir más temas diferentes.
- **Valor por defecto**: 0

### Restablecer valores

Si experimentaste con los parámetros y quieres volver a la configuración original, haz clic en **"Restablecer valores por defecto"**. Esto solo afecta los parámetros del modelo, no la URL ni el nombre del modelo.

---

## Instrucciones del sistema

Las instrucciones del sistema le dicen al modelo cómo comportarse. Es como darle indicaciones antes de que empiece a ayudarte.

### ¿Qué son?

Son un texto que se envía al modelo antes de cada consulta. Definen el tono, el idioma y el tipo de asistencia que esperas recibir.

### ¿Por qué personalizarlas?

Porque cada persona escribe de forma diferente. Puedes indicarle al modelo:

- En qué idioma responder
- Qué tono usar (formal, casual, técnico)
- Qué tipo de ayuda prefieres (correcciones, sugerencias, resúmenes)
- Cualquier preferencia específica sobre cómo quieres que te asista

### Ejemplos

**Para escritura creativa:**
```
Eres un asistente de escritura creativa. Sugieres ideas originales, ayudas a desarrollar personajes y ofreces retroalimentación constructiva. Respondes en español.
```

**Para notas de estudio:**
```
Eres un asistente académico. Ayudas a resumir textos, organizar apuntes y explicar conceptos difíciles de forma simple. Respondes en español de forma concisa.
```

**Para organización personal:**
```
Eres un asistente de productividad. Ayudas a organizar ideas, crear listas de tareas y priorizar actividades. Respondes con brevedad y claridad en español.
```

### ¿Dónde modificarlas?

En la sección de Inteligencia Artificial de la configuración, busca el campo de texto "Instrucciones del sistema". Escribe o modifica las instrucciones según tus necesidades. Los cambios se guardan automáticamente.

---

## Problemas comunes y soluciones

| Mensaje de error | Causa probable | Solución |
|-----------------|----------------|----------|
| "No se pudo conectar" | El servidor de IA no está corriendo | Asegúrate de que Ollama esté iniciado. Abre una terminal y ejecuta `ollama serve` si no se inició automáticamente. |
| "Error de autenticación" | La clave de acceso (API Key) es incorrecta | Verifica que la API Key sea la correcta. Si usas Ollama local, deja el campo vacío. |
| "Modelo no encontrado" | El nombre del modelo tiene un error o no está descargado | Revisa que el nombre coincida exactamente con lo que descargaste. Ejecuta `ollama list` en la terminal para ver los modelos disponibles. |
| "Tiempo de espera agotado" | El servidor tarda demasiado en responder o la URL es incorrecta | Verifica que la URL base sea correcta (`http://localhost:11434/v1` para Ollama). Si el servidor es lento, intenta con un modelo más pequeño. |

### Consejos adicionales

- Si cambiaste algo y dejó de funcionar, usa el botón "Probar conexión" para diagnosticar.
- Recuerda que Ollama debe estar corriendo antes de intentar conectar desde Glosa.
- Si descargaste un modelo nuevo, usa su nombre exacto en el campo "Modelo" (por ejemplo: `phi3`, `mistral`, `llama3.1:8b`).

---

## Siguientes pasos

- [Volver al índice](./README.md)
- [Sobre el proyecto](../01-vision.md)
