import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import {
  useAIBlockAssistant,
  buildAIBlockPrompt,
  DEFAULT_AI_QUICK_ACTIONS,
} from './useAIBlockAssistant'
import { useSettingsStore } from '@/stores/settings'
import * as aiService from '@/services/ai'

describe('useAIBlockAssistant', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.restoreAllMocks()
  })

  describe('buildAIBlockPrompt', () => {
    it('formats prompt with complete note context and block content', () => {
      const prompt = buildAIBlockPrompt({
        blockContent: 'La teoría de la relatividad fue formulada en 1905.',
        userQuery: '¿Es precisa la fecha y contexto histórico?',
        context: {
          title: 'Física Moderna',
          folder: 'Ciencia/Física',
          tags: ['ciencia', 'historia'],
          updatedAt: '2026-10-05',
        },
      })

      expect(prompt).toContain('Título: Física Moderna')
      expect(prompt).toContain('Ubicación / Carpeta: Ciencia/Física')
      expect(prompt).toContain('Etiquetas: ciencia, historia')
      expect(prompt).toContain('La teoría de la relatividad fue formulada en 1905.')
      expect(prompt).toContain('¿Es precisa la fecha y contexto histórico?')
      expect(prompt).toContain('NO reescribas ni sustituyas directamente el texto de la nota')
    })

    it('handles empty/default context gracefully', () => {
      const prompt = buildAIBlockPrompt({
        blockContent: 'Fragmento de texto de prueba.',
        userQuery: 'Sugerencias',
        context: {
          title: '',
        },
      })

      expect(prompt).toContain('Título: Sin título')
      expect(prompt).toContain('Ubicación / Carpeta: Raíz')
      expect(prompt).toContain('Etiquetas: Ninguna')
      expect(prompt).toContain('Fragmento de texto de prueba.')
    })
  })

  describe('DEFAULT_AI_QUICK_ACTIONS', () => {
    it('includes verification, suggestions, reflective questions and inconsistencies', () => {
      const ids = DEFAULT_AI_QUICK_ACTIONS.map(a => a.id)
      expect(ids).toContain('verify')
      expect(ids).toContain('improve')
      expect(ids).toContain('questions')
      expect(ids).toContain('inconsistencies')
    })
  })

  describe('assistant workflow state', () => {
    it('opens and closes assistant with provided block info', () => {
      const assistant = useAIBlockAssistant()

      assistant.openAssistant({
        index: 2,
        content: 'Bloque de prueba',
        top: 150,
        context: { title: 'Nota 1' },
      })

      expect(assistant.isOpen.value).toBe(true)
      expect(assistant.activeBlockIndex.value).toBe(2)
      expect(assistant.activeBlockContent.value).toBe('Bloque de prueba')
      expect(assistant.activeBlockTop.value).toBe(150)
      expect(assistant.noteContext.value.title).toBe('Nota 1')

      assistant.closeAssistant()
      expect(assistant.isOpen.value).toBe(false)
      expect(assistant.activeBlockIndex.value).toBeNull()
    })

    it('sets error when AI is not configured', async () => {
      const settingsStore = useSettingsStore()
      settingsStore.settings.ai.enabled = false

      const assistant = useAIBlockAssistant()
      assistant.openAssistant({
        index: 0,
        content: 'Texto de prueba',
        context: { title: 'Test' },
      })

      await assistant.ask('Verificar esto')
      expect(assistant.error.value).toContain('La IA no está configurada')
      expect(assistant.isLoading.value).toBe(false)
    })

    it('streams response successfully when AI is configured', async () => {
      const settingsStore = useSettingsStore()
      settingsStore.settings.ai.enabled = true
      settingsStore.settings.ai.baseUrl = 'http://localhost:11434/v1'
      settingsStore.settings.ai.model = 'llama3.1:8b'

      async function* mockStream() {
        yield 'Observación 1: '
        yield 'Todo se ve correcto.'
      }

      vi.spyOn(aiService, 'chatStream').mockImplementation(() => mockStream())

      const assistant = useAIBlockAssistant()
      assistant.openAssistant({
        index: 1,
        content: 'Contenido verificado',
        context: { title: 'Test' },
      })

      await assistant.ask('Verificar datos')
      expect(assistant.response.value).toBe('Observación 1: Todo se ve correcto.')
      expect(assistant.error.value).toBeNull()
      expect(assistant.isLoading.value).toBe(false)
    })
  })
})
