import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { _internal, isConfigured } from './ai'
import { DEFAULT_SYSTEM_PROMPT } from '@/types/settings'
import type { AISettings } from '@/types/settings'

const {
  normalizeBaseUrl,
  buildHeaders,
  prependSystemPrompt,
  mergeParameters,
  assertConfigured,
  parseErrorMessage,
  parseNetworkError,
  buildChatBody,
} = _internal

describe('AI Service - Internal Helpers', () => {
  describe('normalizeBaseUrl', () => {
    it('removes a single trailing slash', () => {
      expect(normalizeBaseUrl('http://localhost:11434/v1/')).toBe('http://localhost:11434/v1')
    })

    it('removes multiple trailing slashes', () => {
      expect(normalizeBaseUrl('http://localhost:11434/v1///')).toBe('http://localhost:11434/v1')
    })

    it('returns unchanged URL without trailing slash', () => {
      expect(normalizeBaseUrl('http://localhost:11434/v1')).toBe('http://localhost:11434/v1')
    })

    it('handles empty string', () => {
      expect(normalizeBaseUrl('')).toBe('')
    })
  })

  describe('buildHeaders', () => {
    it('adds Authorization header when apiKey is present', () => {
      const ai = { apiKey: 'sk-test-123', headers: [] } as unknown as AISettings
      const result = buildHeaders(ai)
      expect(result['Authorization']).toBe('Bearer sk-test-123')
    })

    it('does not add Authorization header when apiKey is empty', () => {
      const ai = { apiKey: '', headers: [] } as unknown as AISettings
      const result = buildHeaders(ai)
      expect(result['Authorization']).toBeUndefined()
    })

    it('includes custom headers', () => {
      const ai = {
        apiKey: '',
        headers: [
          { key: 'X-Custom-Key', value: 'custom-value' },
          { key: 'X-Another', value: 'another-value' },
        ],
      } as unknown as AISettings
      const result = buildHeaders(ai)
      expect(result['X-Custom-Key']).toBe('custom-value')
      expect(result['X-Another']).toBe('another-value')
    })

    it('trims header keys', () => {
      const ai = {
        apiKey: '',
        headers: [{ key: '  X-Trimmed  ', value: 'value' }],
      } as unknown as AISettings
      const result = buildHeaders(ai)
      expect(result['X-Trimmed']).toBe('value')
    })

    it('skips headers with empty keys', () => {
      const ai = {
        apiKey: '',
        headers: [{ key: '   ', value: 'value' }],
      } as unknown as AISettings
      const result = buildHeaders(ai)
      expect(Object.keys(result)).toHaveLength(0)
    })

    it('combines apiKey and custom headers', () => {
      const ai = {
        apiKey: 'my-key',
        headers: [{ key: 'X-Extra', value: 'extra' }],
      } as unknown as AISettings
      const result = buildHeaders(ai)
      expect(result['Authorization']).toBe('Bearer my-key')
      expect(result['X-Extra']).toBe('extra')
    })
  })

  describe('prependSystemPrompt', () => {
    it('prepends custom system prompt to messages', () => {
      const messages = [{ role: 'user' as const, content: 'Hola' }]
      const result = prependSystemPrompt('Eres un poeta.', messages)
      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({ role: 'system', content: 'Eres un poeta.' })
      expect(result[1]).toEqual({ role: 'user', content: 'Hola' })
    })

    it('uses DEFAULT_SYSTEM_PROMPT when system prompt is empty', () => {
      const messages = [{ role: 'user' as const, content: 'Hola' }]
      const result = prependSystemPrompt('', messages)
      expect(result[0]).toEqual({ role: 'system', content: DEFAULT_SYSTEM_PROMPT })
    })

    it('uses DEFAULT_SYSTEM_PROMPT when system prompt is whitespace only', () => {
      const messages = [{ role: 'user' as const, content: 'Hola' }]
      const result = prependSystemPrompt('   ', messages)
      expect(result[0]).toEqual({ role: 'system', content: DEFAULT_SYSTEM_PROMPT })
    })

    it('does not mutate original messages array', () => {
      const messages = [{ role: 'user' as const, content: 'Hola' }]
      prependSystemPrompt('Custom prompt', messages)
      expect(messages).toHaveLength(1)
    })
  })

  describe('mergeParameters', () => {
    const defaults = {
      temperature: 0.7,
      topP: 0.9,
      maxTokens: 2048,
      frequencyPenalty: 0,
      presencePenalty: 0,
    }

    it('returns defaults when no overrides provided', () => {
      const result = mergeParameters(defaults)
      expect(result).toEqual(defaults)
    })

    it('returns defaults when overrides is undefined', () => {
      const result = mergeParameters(defaults, undefined)
      expect(result).toEqual(defaults)
    })

    it('overrides specific values', () => {
      const result = mergeParameters(defaults, { temperature: 1.2, maxTokens: 4096 })
      expect(result.temperature).toBe(1.2)
      expect(result.maxTokens).toBe(4096)
      expect(result.topP).toBe(0.9)
      expect(result.frequencyPenalty).toBe(0)
      expect(result.presencePenalty).toBe(0)
    })

    it('overrides all values', () => {
      const result = mergeParameters(defaults, {
        temperature: 1.5,
        topP: 0.5,
        maxTokens: 1024,
        frequencyPenalty: 0.5,
        presencePenalty: 0.3,
      })
      expect(result).toEqual({
        temperature: 1.5,
        topP: 0.5,
        maxTokens: 1024,
        frequencyPenalty: 0.5,
        presencePenalty: 0.3,
      })
    })
  })

  describe('assertConfigured', () => {
    beforeEach(() => {
      setActivePinia(createPinia())
    })

    it('throws error with configured message when AI is not configured', () => {
      expect(() => assertConfigured()).toThrowError(
        'La IA no está configurada. Ve a Configuración para establecer la conexión.',
      )
    })
  })

  describe('isConfigured', () => {
    beforeEach(() => {
      setActivePinia(createPinia())
    })

    it('returns false when AI is disabled (default settings)', () => {
      expect(isConfigured()).toBe(false)
    })

    it('returns false when enabled but baseUrl is empty', async () => {
      const { useSettingsStore } = await import('@/stores/settings')
      const store = useSettingsStore()
      store.settings.ai.enabled = true
      store.settings.ai.model = 'llama3.1:8b'
      store.settings.ai.baseUrl = ''
      expect(isConfigured()).toBe(false)
    })

    it('returns false when enabled but model is empty', async () => {
      const { useSettingsStore } = await import('@/stores/settings')
      const store = useSettingsStore()
      store.settings.ai.enabled = true
      store.settings.ai.baseUrl = 'http://localhost:11434/v1'
      store.settings.ai.model = ''
      expect(isConfigured()).toBe(false)
    })

    it('returns false when enabled but baseUrl is only whitespace', async () => {
      const { useSettingsStore } = await import('@/stores/settings')
      const store = useSettingsStore()
      store.settings.ai.enabled = true
      store.settings.ai.baseUrl = '   '
      store.settings.ai.model = 'llama3.1:8b'
      expect(isConfigured()).toBe(false)
    })

    it('returns true when enabled with non-empty baseUrl and model', async () => {
      const { useSettingsStore } = await import('@/stores/settings')
      const store = useSettingsStore()
      store.settings.ai.enabled = true
      store.settings.ai.baseUrl = 'http://localhost:11434/v1'
      store.settings.ai.model = 'llama3.1:8b'
      expect(isConfigured()).toBe(true)
    })
  })

  describe('parseErrorMessage', () => {
    it('returns auth error for 401', () => {
      expect(parseErrorMessage(401, '')).toBe('Error de autenticación. Verifica tu API Key.')
    })

    it('returns auth error for 403', () => {
      expect(parseErrorMessage(403, '')).toBe('Error de autenticación. Verifica tu API Key.')
    })

    it('returns not found error for 404', () => {
      expect(parseErrorMessage(404, '')).toBe(
        'Modelo o endpoint no encontrado. Verifica la URL base y el nombre del modelo.',
      )
    })

    it('returns rate limit error for 429', () => {
      expect(parseErrorMessage(429, '')).toBe(
        'Demasiadas peticiones. Intenta de nuevo en unos segundos.',
      )
    })

    it('returns server error for 5xx', () => {
      expect(parseErrorMessage(500, '')).toBe(
        'Error del servidor (500). Verifica que el servicio esté corriendo.',
      )
      expect(parseErrorMessage(503, '')).toBe(
        'Error del servidor (503). Verifica que el servicio esté corriendo.',
      )
    })

    it('parses JSON error.message for other status codes', () => {
      const body = JSON.stringify({ error: { message: 'Custom error details' } })
      expect(parseErrorMessage(400, body)).toBe('Custom error details')
    })

    it('falls back to raw body when JSON is invalid', () => {
      expect(parseErrorMessage(400, 'not json')).toBe('Error 400: not json')
    })

    it('truncates long body to 200 chars', () => {
      const longBody = 'x'.repeat(300)
      const result = parseErrorMessage(400, longBody)
      expect(result).toBe(`Error 400: ${'x'.repeat(200)}`)
    })
  })

  describe('parseNetworkError', () => {
    it('returns timeout message for TimeoutError', () => {
      const error = new DOMException('The operation timed out', 'TimeoutError')
      expect(parseNetworkError(error)).toBe(
        'Tiempo de espera agotado (10s). Verifica que el servidor esté corriendo y accesible.',
      )
    })

    it('returns connection refused message for TypeError with fetch', () => {
      const error = new TypeError('Failed to fetch')
      expect(parseNetworkError(error)).toBe(
        'No se pudo conectar. Verifica que la URL sea correcta y el servidor esté activo.',
      )
    })

    it('returns generic message for unknown errors', () => {
      const error = new Error('Something went wrong')
      expect(parseNetworkError(error)).toBe('Error de conexión: Error: Something went wrong')
    })

    it('handles non-Error values', () => {
      expect(parseNetworkError('string error')).toBe('Error de conexión: string error')
    })
  })

  describe('buildChatBody', () => {
    const messages = [{ role: 'user' as const, content: 'Hola' }]

    it('builds standard payload omitting zero frequency and presence penalties', () => {
      const params = {
        temperature: 0.7,
        topP: 0.9,
        maxTokens: 2048,
        frequencyPenalty: 0,
        presencePenalty: 0,
      }
      const body = buildChatBody('gemini-1.5-pro', messages, params, false)
      expect(body).toEqual({
        model: 'gemini-1.5-pro',
        messages,
        stream: false,
        temperature: 0.7,
        top_p: 0.9,
        max_tokens: 2048,
      })
      expect(body).not.toHaveProperty('frequency_penalty')
      expect(body).not.toHaveProperty('presence_penalty')
    })

    it('includes frequency and presence penalty only when non-zero', () => {
      const params = {
        temperature: 0.5,
        topP: 0.8,
        maxTokens: 1000,
        frequencyPenalty: 0.5,
        presencePenalty: 0.3,
      }
      const body = buildChatBody('llama3.2', messages, params, true)
      expect(body).toEqual({
        model: 'llama3.2',
        messages,
        stream: true,
        temperature: 0.5,
        top_p: 0.8,
        max_tokens: 1000,
        frequency_penalty: 0.5,
        presence_penalty: 0.3,
      })
    })
  })
})
