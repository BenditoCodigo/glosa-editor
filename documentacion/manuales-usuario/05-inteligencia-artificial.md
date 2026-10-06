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

## Parámetros del modelo y comportamiento esperado

En la configuración encontrarás controles para ajustar cómo responde el modelo junto con un panel interactivo que describe el **comportamiento esperado**:

### Panel de comportamiento esperado

Conforme mueves los deslizadores de **Temperatura** y **Top P**, Glosa te indicará el tipo de respuesta que obtendrás:

- **Determinista y fáctico**: Máxima precisión lógica. Ideal para corrección ortográfica y resúmenes estructurados.
- **Enfocado y conservador**: Respuestas directas y predecibles.
- **Equilibrado**: Balance óptimo entre fidelidad fáctica y fluidez natural para redacción general.
- **Creativo y variado**: Fomenta vocabulario amplio e ideas novedosas. Excelente para lluvia de ideas y ficción.
- **Experimental / Caótico**: Temperatura muy alta. Respuestas divergentes que pueden presentar incoherencias.

### Parámetros individuales

#### Temperatura (Temperature)
Controla qué tan creativo o determinista es el modelo al responder (0.0 a 2.0).

#### Top P (Muestreo por núcleo)
Controla la diversidad del vocabulario evaluando las palabras más probables que acumulan este porcentaje (0.05 a 1.0).

#### Tokens máximos (Max Tokens)
Define la longitud máxima de la respuesta generada (256 a 8192 tokens).

#### Penalización de frecuencia (Frequency Penalty)
Reduce la repetición literal de palabras ya empleadas en la respuesta (-2.0 a 2.0).

#### Penalización de presencia (Presence Penalty)
Incentiva al modelo a introducir nuevos temas y conceptos en lugar de centrarse en los ya expuestos (-2.0 a 2.0).

### Restablecer valores

Si experimentaste con los parámetros y quieres volver a la configuración original, haz clic en **"Restablecer valores por defecto"**.

---

## Asistencia de IA en tus notas

Además de la configuración general, puedes usar la IA directamente mientras escribes:

### 1. Asistente flotante por bloques
Al pasar el cursor sobre cualquier párrafo o bloque en el editor, verás el botón de asistente de IA para solicitar mejoras de redacción, síntesis o continuación del texto.

### 2. Generación automática de descripción breve
En la ventana de **Metadatos e instrucciones de IA** (ícono 📖 en el editor), puedes pulsar **"Generar con IA"** para que el modelo redacte una síntesis precisa de tu nota para mostrar en las tarjetas del explorador y la pantalla de inicio.

### 3. Instrucciones específicas por documento
Puedes darle indicaciones exclusivas a cada nota (por ejemplo, definir un tono periodístico, técnico o humorístico) que tendrán prioridad sobre las instrucciones globales del sistema.

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
