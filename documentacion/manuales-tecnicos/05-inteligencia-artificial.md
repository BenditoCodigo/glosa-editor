# Inteligencia Artificial

Este documento explica cómo funciona el servicio de IA en Glosa: su arquitectura, los tipos que utiliza, el flujo de una petición, el formato de request/response, y cómo extenderlo con nuevos casos de uso.

---

## Arquitectura

El servicio de IA es un módulo funcional sin estado (`src/services/ai.ts`). No mantiene conexiones persistentes ni cache — cada invocación lee la configuración del Settings Store en ese momento y ejecuta una petición HTTP independiente.

```
┌─────────────────────────────────────────────────────────┐
│              Settings Store (Pinia)                       │
│            settings.ai: AISettings                       │
│          (persistido en localStorage)                    │
└────────────────────────┬────────────────────────────────┘
                         │ consume configuración
┌────────────────────────▼────────────────────────────────┐
│                   AI Service                             │
│              src/services/ai.ts                          │
│                                                         │
│  isConfigured()  chat()  chatStream()  testConnection() │
└────────────────────────┬────────────────────────────────┘
                         │ HTTP (fetch)
┌────────────────────────▼────────────────────────────────┐
│         Servidor de inferencia (externo)                  │
│   Ollama · llama.cpp · LM Studio · LiteLLM · Proxy      │
│   Endpoint: {baseUrl}/chat/completions                   │
└─────────────────────────────────────────────────────────┘
```

### Principios clave

- **Sin estado**: no guarda nada entre llamadas. Siempre lee del store.
- **Sin acoplamiento**: cualquier componente o composable puede importar las funciones del servicio.
- **Sin dependencias externas**: usa `fetch` nativo del navegador.
- **Configuración centralizada**: toda la config vive en el Settings Store bajo la propiedad `ai`.

---

## Tipos e interfaces

Los tipos se dividen en dos grupos: los de configuración (en `src/types/settings.ts`) y los del servicio (en `src/services/ai.ts`).

### Configuración (`src/types/settings.ts`)

#### `AISettings`

Configuración completa del proveedor de IA.

```typescript
interface AISettings {
  enabled: boolean          // Si la IA está activa
  baseUrl: string           // URL raíz del servidor (ej: http://localhost:11434/v1)
  model: string             // Nombre del modelo (ej: llama3.1:8b)
  apiKey: string            // Credencial opcional
  headers: AICustomHeader[] // Headers HTTP adicionales
  systemPrompt: string      // Instrucciones de sistema
  modelParameters: AIModelParameters
}
```

#### `AIModelParameters`

Parámetros de inferencia que controlan el comportamiento del modelo.

```typescript
interface AIModelParameters {
  temperature: number       // 0 - 2, default 0.7
  topP: number              // 0 - 1, default 0.9
  maxTokens: number         // 256 - 8192, default 2048
  frequencyPenalty: number  // -2 - 2, default 0
  presencePenalty: number   // -2 - 2, default 0
}
```

#### `AICustomHeader`

Par key-value para headers personalizados.

```typescript
interface AICustomHeader {
  key: string
  value: string
}
```

### Servicio (`src/services/ai.ts`)

#### `ChatMessage`

Un mensaje dentro de la conversación.

```typescript
interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}
```

#### `ChatOptions`

Overrides opcionales por petición. Si no se pasan, se usan los valores del store.

```typescript
interface ChatOptions {
  temperature?: number
  topP?: number
  maxTokens?: number
  frequencyPenalty?: number
  presencePenalty?: number
  signal?: AbortSignal       // Para cancelar la petición
}
```

#### `ChatResponse`

Respuesta parseada de una petición no-streaming.

```typescript
interface ChatResponse {
  content: string            // Texto generado por el modelo
  finishReason: string       // 'stop', 'length', etc.
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}
```

#### `AIConnectionResult`

Resultado de la prueba de conexión.

```typescript
interface AIConnectionResult {
  success: boolean
  message: string            // Mensaje legible para el usuario
  models?: string[]          // Modelos disponibles (si el server soporta /models)
  latencyMs?: number         // Tiempo de respuesta en milisegundos
}
```

---

## Flujo de una petición

Este es el camino que recorre una llamada desde que un consumidor invoca `chat()` hasta que recibe la respuesta:

```
1. Consumidor llama chat(messages, options?)
          │
2. assertConfigured() verifica que la IA esté habilitada y configurada
          │
3. Lee settings.ai del store (baseUrl, model, apiKey, headers, etc.)
          │
4. buildHeaders() construye los headers HTTP:
   - Authorization: Bearer {apiKey} (si existe)
   - Content-Type: application/json
   - Headers personalizados del usuario
          │
5. mergeParameters() combina los defaults del store con los overrides de options
          │
6. prependSystemPrompt() agrega el system prompt como primer mensaje
          │
7. fetch POST → {baseUrl}/chat/completions con el body completo
          │
8. Si response.ok → parsear JSON → mapear a ChatResponse
   Si error → parseErrorMessage() genera mensaje legible → throw Error
```

### Funciones helper internas

| Función | Responsabilidad |
|---------|----------------|
| `normalizeBaseUrl(url)` | Elimina trailing slashes de la URL |
| `buildHeaders(ai)` | Construye objeto de headers con API key y headers custom |
| `prependSystemPrompt(prompt, messages)` | Inserta el system prompt al inicio del array de mensajes |
| `mergeParameters(defaults, overrides)` | Combina parámetros del store con overrides por petición |
| `assertConfigured()` | Lanza error si la IA no está configurada |
| `parseErrorMessage(status, body)` | Convierte códigos HTTP en mensajes legibles |
| `parseNetworkError(error)` | Convierte errores de red en mensajes legibles |

---

## Formato de request/response (OpenAI-compatible)

El servicio se comunica con cualquier servidor que implemente el formato de la API de OpenAI para chat completions.

### Request (no-streaming)

```http
POST {baseUrl}/chat/completions
Content-Type: application/json
Authorization: Bearer {apiKey}
```

```json
{
  "model": "llama3.1:8b",
  "messages": [
    { "role": "system", "content": "Eres un asistente de escritura..." },
    { "role": "user", "content": "Resume este texto..." }
  ],
  "temperature": 0.7,
  "top_p": 0.9,
  "max_tokens": 2048,
  "frequency_penalty": 0,
  "presence_penalty": 0,
  "stream": false
}
```

### Response (no-streaming)

```json
{
  "id": "chatcmpl-abc123",
  "object": "chat.completion",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Aquí está el resumen..."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 45,
    "completion_tokens": 120,
    "total_tokens": 165
  }
}
```

El servicio extrae `choices[0].message.content`, `choices[0].finish_reason` y `usage` para construir el `ChatResponse`.

---

## Streaming (SSE)

Para respuestas en tiempo real, el servicio usa `chatStream()` que envía la misma petición pero con `"stream": true`.

### Formato de la respuesta SSE

El servidor responde con `Content-Type: text/event-stream`. Cada chunk es una línea con prefijo `data: `:

```
data: {"choices":[{"delta":{"content":"Aquí"}}]}

data: {"choices":[{"delta":{"content":" está"}}]}

data: {"choices":[{"delta":{"content":" el"}}]}

data: {"choices":[{"delta":{"content":" resumen"}}]}

data: [DONE]
```

### Cómo lo procesa el servicio

1. Lee el stream con `response.body.getReader()`
2. Decodifica chunks con `TextDecoder`
3. Acumula en un buffer y separa por `\n`
4. Para cada línea que empieza con `data: `:
   - Si el contenido es `[DONE]` → termina el generador
   - Si no, parsea el JSON y extrae `choices[0].delta.content`
   - Hace `yield` del texto extraído

### Uso del generador asíncrono

```typescript
const stream = chatStream([{ role: 'user', content: '¿Qué opinas?' }])

for await (const chunk of stream) {
  // chunk es un string con el texto parcial
  outputBuffer += chunk
}
```

---

## Cómo extender con nuevos casos de uso

El servicio expone funciones genéricas (`chat` y `chatStream`) que cualquier composable o componente puede consumir para crear funcionalidades específicas.

### Ejemplo: composable para resumir texto

```typescript
// src/composables/useAISummarize.ts
import { ref } from 'vue'
import { chat } from '@/services/ai'
import type { ChatMessage } from '@/services/ai'

export function useAISummarize() {
  const summary = ref('')
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  async function summarize(text: string) {
    isLoading.value = true
    error.value = null

    const messages: ChatMessage[] = [
      { role: 'user', content: `Resume el siguiente texto en 2-3 oraciones:\n\n${text}` }
    ]

    try {
      const response = await chat(messages)
      summary.value = response.content
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido'
    } finally {
      isLoading.value = false
    }
  }

  return { summary, isLoading, error, summarize }
}
```

### Ejemplo: composable con streaming para autocompletar

```typescript
// src/composables/useAIAutocomplete.ts
import { ref } from 'vue'
import { chatStream, isConfigured } from '@/services/ai'
import type { ChatMessage } from '@/services/ai'

export function useAIAutocomplete() {
  const suggestion = ref('')
  const isStreaming = ref(false)

  async function autocomplete(context: string) {
    if (!isConfigured()) return

    isStreaming.value = true
    suggestion.value = ''

    const messages: ChatMessage[] = [
      { role: 'user', content: `Continúa el siguiente texto de forma natural:\n\n${context}` }
    ]

    try {
      const stream = chatStream(messages, { maxTokens: 100, temperature: 0.5 })
      for await (const chunk of stream) {
        suggestion.value += chunk
      }
    } finally {
      isStreaming.value = false
    }
  }

  return { suggestion, isStreaming, autocomplete }
}
```

### Patrón general

1. Crear un composable en `src/composables/` con prefijo `useAI`
2. Importar `chat` o `chatStream` según necesites respuesta completa o incremental
3. Construir el array de `ChatMessage` con el prompt adecuado para el caso de uso
4. Opcionalmente pasar `ChatOptions` para ajustar parámetros por caso de uso
5. Manejar loading, error y resultado con refs reactivas
6. Retornar un objeto con las refs y la función de acción

---

## Casos de uso implementados

### 1. Asistente flotante por bloques (`useAIBlockAssistant`)
Permite invocar a la IA sobre un bloque específico del editor Tiptap, proporcionando contexto completo del documento (título, contenido, etiquetas, fuentes y las instrucciones de IA específicas del archivo).

### 2. Generación de descripción breve (`NoteReferencesModal`)
Genera resúmenes sintéticos (hasta 140 caracteres) de la nota para usar en tarjetas de vista previa, con soporte de historial de deshacer/rehacer (Undo/Redo) en sesión y persistencia en el frontmatter `description`.

### 3. Diagnóstico de comportamiento de muestreo (`SettingsView`)
En la vista de Configuración, la propiedad computada `samplingBehavior` evalúa la combinación de `temperature` y `topP` para clasificar y orientar al usuario sobre el resultado esperado (determinista/fáctico, conservador, equilibrado, creativo o experimental/caótico).

---

## Manejo de errores

El servicio traduce los errores HTTP y de red a mensajes legibles en español.

| Código / Escenario | Mensaje |
|--------------------|---------|
| 401 / 403 | Error de autenticación. Verifica tu API Key. |
| 404 | Modelo o endpoint no encontrado. Verifica la URL base y el nombre del modelo. |
| 429 | Demasiadas peticiones. Intenta de nuevo en unos segundos. |
| 5xx | Error del servidor ({status}). Verifica que el servicio esté corriendo. |
| Timeout (>10s) | Tiempo de espera agotado (10s). Verifica que el servidor esté corriendo y accesible. |
| Red inalcanzable | No se pudo conectar. Verifica que la URL sea correcta y el servidor esté activo. |
| IA no configurada | La IA no está configurada. Ve a Configuración para establecer la conexión. |

---

## Siguientes pasos

- [Arquitectura general](./01-arquitectura.md)
- [Estructura del código](./03-estructura-codigo.md)
- [Volver al índice](./README.md)
