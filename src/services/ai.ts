import type { AISettings, AIModelParameters } from '@/types/settings'
import { DEFAULT_SYSTEM_PROMPT } from '@/types/settings'
import { useSettingsStore } from '@/stores/settings'

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
  return [{ role: 'system', content: prompt }, ...messages]
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
  if (status === 404) return 'Modelo o endpoint no encontrado. Verifica la URL base y el nombre del modelo.'
  if (status === 429) return 'Demasiadas peticiones. Intenta de nuevo en unos segundos.'
  if (status >= 500) return `Error del servidor (${status}). Verifica que el servicio esté corriendo.`
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
