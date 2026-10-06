import type { AISettings, AIModelParameters } from '@/types/settings'
import { DEFAULT_SYSTEM_PROMPT } from '@/types/settings'
import { useSettingsStore } from '@/stores/settings'
import { platformFetch, platformStream } from '@/services/platform'

// --- Exported Types ---

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatOptions {
  temperature?: number
  topP?: number
  maxTokens?: number
  frequencyPenalty?: number
  presencePenalty?: number
  systemPrompt?: string
  signal?: AbortSignal
}

export interface ChatResponse {
  content: string
  finishReason: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

export interface AIConnectionResult {
  success: boolean
  message: string
  models?: string[]
  latencyMs?: number
}

// --- Exported Functions ---

export function isConfigured(): boolean {
  const store = useSettingsStore()
  const { ai } = store.settings
  return ai.enabled && ai.baseUrl.trim() !== '' && ai.model.trim() !== ''
}

export async function testConnection(): Promise<AIConnectionResult> {
  const store = useSettingsStore()
  const { ai } = store.settings
  const headers = buildHeaders(ai)
  const startTime = Date.now()

  // Attempt 1: GET /models
  try {
    const modelsUrl = `${normalizeBaseUrl(ai.baseUrl)}/models`
    const response = await platformFetch(modelsUrl, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(10000),
    })
    if (response.ok) {
      const data = await response.json()
      const models = data.data?.map((m: { id: string }) => m.id) ?? []
      return {
        success: true,
        message: `Conexión exitosa. ${models.length} modelo(s) disponible(s).`,
        models,
        latencyMs: Date.now() - startTime,
      }
    }
  } catch {
    // Continue to attempt 2
  }

  // Attempt 2: POST chat/completions with minimal message
  try {
    const chatUrl = `${normalizeBaseUrl(ai.baseUrl)}/chat/completions`
    const response = await platformFetch(chatUrl, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: ai.model,
        messages: [{ role: 'user', content: 'Hola' }],
        max_tokens: 5,
        stream: false,
      }),
      signal: AbortSignal.timeout(10000),
    })

    if (response.ok) {
      return {
        success: true,
        message: 'Conexión exitosa. El modelo responde correctamente.',
        latencyMs: Date.now() - startTime,
      }
    }

    const errorBody = await response.text()
    return {
      success: false,
      message: parseErrorMessage(response.status, errorBody),
    }
  } catch (error) {
    return {
      success: false,
      message: parseNetworkError(error),
    }
  }
}

export async function chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse> {
  assertConfigured()

  const store = useSettingsStore()
  const { ai } = store.settings
  const headers = buildHeaders(ai)
  const params = mergeParameters(ai.modelParameters, options)

  const effectivePrompt = options?.systemPrompt?.trim() ? options.systemPrompt : ai.systemPrompt
  const fullMessages = prependSystemPrompt(effectivePrompt, messages)

  const response = await platformFetch(`${normalizeBaseUrl(ai.baseUrl)}/chat/completions`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: ai.model,
      messages: fullMessages,
      temperature: params.temperature,
      top_p: params.topP,
      max_tokens: params.maxTokens,
      frequency_penalty: params.frequencyPenalty,
      presence_penalty: params.presencePenalty,
      stream: false,
    }),
    signal: options?.signal,
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(parseErrorMessage(response.status, errorBody))
  }

  const data = await response.json()
  return {
    content: data.choices[0]?.message?.content ?? '',
    finishReason: data.choices[0]?.finish_reason ?? 'unknown',
    usage: data.usage
      ? {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
        }
      : undefined,
  }
}

export async function* chatStream(
  messages: ChatMessage[],
  options?: ChatOptions,
): AsyncGenerator<string> {
  assertConfigured()

  const store = useSettingsStore()
  const { ai } = store.settings
  const headers = buildHeaders(ai)
  const params = mergeParameters(ai.modelParameters, options)
  const effectivePrompt = options?.systemPrompt?.trim() ? options.systemPrompt : ai.systemPrompt
  const fullMessages = prependSystemPrompt(effectivePrompt, messages)

  yield* platformStream(`${normalizeBaseUrl(ai.baseUrl)}/chat/completions`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: ai.model,
      messages: fullMessages,
      temperature: params.temperature,
      top_p: params.topP,
      max_tokens: params.maxTokens,
      frequency_penalty: params.frequencyPenalty,
      presence_penalty: params.presencePenalty,
      stream: true,
    }),
    signal: options?.signal,
  })
}

// --- Internal Helper Functions ---

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, '')
}

function buildHeaders(ai: AISettings): Record<string, string> {
  const headers: Record<string, string> = {}
  if (ai.apiKey) {
    headers['Authorization'] = `Bearer ${ai.apiKey}`
  }
  for (const { key, value } of ai.headers) {
    if (key.trim()) {
      headers[key.trim()] = value
    }
  }
  return headers
}

function prependSystemPrompt(systemPrompt: string, messages: ChatMessage[]): ChatMessage[] {
  const prompt = systemPrompt.trim() || DEFAULT_SYSTEM_PROMPT
  const nonSystemMessages = messages.filter((m) => m.role !== 'system')
  return [{ role: 'system', content: prompt }, ...nonSystemMessages]
}

function mergeParameters(defaults: AIModelParameters, overrides?: ChatOptions): AIModelParameters {
  return {
    temperature: overrides?.temperature ?? defaults.temperature,
    topP: overrides?.topP ?? defaults.topP,
    maxTokens: overrides?.maxTokens ?? defaults.maxTokens,
    frequencyPenalty: overrides?.frequencyPenalty ?? defaults.frequencyPenalty,
    presencePenalty: overrides?.presencePenalty ?? defaults.presencePenalty,
  }
}

function assertConfigured(): void {
  if (!isConfigured()) {
    throw new Error('La IA no está configurada. Ve a Configuración para establecer la conexión.')
  }
}

function parseErrorMessage(status: number, body: string): string {
  if (status === 401 || status === 403) return 'Error de autenticación. Verifica tu API Key.'
  if (status === 404)
    return 'Modelo o endpoint no encontrado. Verifica la URL base y el nombre del modelo.'
  if (status === 429) return 'Demasiadas peticiones. Intenta de nuevo en unos segundos.'
  if (status >= 500)
    return `Error del servidor (${status}). Verifica que el servicio esté corriendo.`
  try {
    const parsed = JSON.parse(body)
    return parsed.error?.message ?? `Error ${status}: ${body.slice(0, 200)}`
  } catch {
    return `Error ${status}: ${body.slice(0, 200)}`
  }
}

function parseNetworkError(error: unknown): string {
  if (error instanceof DOMException && error.name === 'TimeoutError') {
    return 'Tiempo de espera agotado (10s). Verifica que el servidor esté corriendo y accesible.'
  }
  if (error instanceof TypeError && String(error.message).includes('fetch')) {
    return 'No se pudo conectar. Verifica que la URL sea correcta y el servidor esté activo.'
  }
  return `Error de conexión: ${String(error)}`
}

// Export helpers for testing purposes
export const _internal = {
  normalizeBaseUrl,
  buildHeaders,
  prependSystemPrompt,
  mergeParameters,
  assertConfigured,
  parseErrorMessage,
  parseNetworkError,
}
