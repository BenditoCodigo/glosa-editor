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
          fullContent: '# Introducción a la física\n\nLa teoría de la relatividad fue formulada en 1905.\n\nFue un hito histórico.',
        },
      })

      expect(prompt).toContain('Título: Física Moderna')
      expect(prompt).toContain('Ubicación / Carpeta: Ciencia/Física')
      expect(prompt).toContain('Etiquetas: ciencia, historia')
      expect(prompt).toContain('[DOCUMENTO COMPLETO (CONTEXTO GENERAL DE LA NOTA)]')
      expect(prompt).toContain('# Introducción a la física')
      expect(prompt).toContain('[BLOQUE O FRAGMENTO SELECCIONADO (FOCO PRINCIPAL DE LA CONSULTA)]')
      expect(prompt).toContain('La teoría de la relatividad fue formulada en 1905.')
      expect(prompt).toContain('¿Es precisa la fecha y contexto histórico?')
      expect(prompt).toContain('NO reescribas ni sustituyas directamente el texto')
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

    it('uses dynamic getters to capture live edits to block content', async () => {
      const settingsStore = useSettingsStore()
      settingsStore.settings.ai.enabled = true
      settingsStore.settings.ai.baseUrl = 'http://localhost:11434/v1'
      settingsStore.settings.ai.model = 'llama3.1:8b'

      const { ref } = await import('vue')
      const liveText = ref('como estás?')
      const chatStreamSpy = vi.spyOn(aiService, 'chatStream').mockImplementation(async function* () {
        yield 'Respuesta'
      })

      const assistant = useAIBlockAssistant()
      assistant.openAssistant({
        index: 0,
        content: liveText.value,
        context: { title: 'Test' },
        getContent: () => liveText.value,
      })

      expect(assistant.currentBlockContent.value).toBe('como estás?')

      // User changes text in editor while dialog is open
      liveText.value = 'Los tardigrados son felinos'
      expect(assistant.currentBlockContent.value).toBe('Los tardigrados son felinos')

      await assistant.ask('Verificar datos')

      // Check that the prompt sent to chatStream contained the updated text
      expect(chatStreamSpy).toHaveBeenCalled()
      const sentMessages = chatStreamSpy.mock.calls[0]![0]
      expect(sentMessages[0]!.content).toContain('Los tardigrados son felinos')
      expect(sentMessages[0]!.content).not.toContain('como estás?')
    })

    it('injects sources into prompt and passes document-level aiInstructions to chatStream', async () => {
      const settingsStore = useSettingsStore()
      settingsStore.settings.ai.enabled = true
      settingsStore.settings.ai.baseUrl = 'http://localhost:11434/v1'
      settingsStore.settings.ai.model = 'llama3.1:8b'
      settingsStore.settings.ai.systemPrompt = 'Global system prompt'

      const chatStreamSpy = vi.spyOn(aiService, 'chatStream').mockImplementation(async function* () {
        yield 'Respuesta analítica'
      })

      const assistant = useAIBlockAssistant()
      assistant.openAssistant({
        index: 0,
        content: 'Afirmación basada en fuente externa.',
        context: {
          title: 'Investigación Periodística',
          sources: [
            'https://elpais.com/reportaje/1',
            'https://theguardian.com/article/2',
          ],
          aiInstructions: 'Instrucciones específicas de este documento: actúa como fact-checker estricto.',
        },
      })

      await assistant.ask('Verificar datos')

      expect(chatStreamSpy).toHaveBeenCalled()
      const sentMessages = chatStreamSpy.mock.calls[0]![0]
      const options = chatStreamSpy.mock.calls[0]![1]

      // Verify sources are in the prompt
      expect(sentMessages[0]!.content).toContain('[FUENTES Y REFERENCIAS / ANEXOS DEL DOCUMENTO]')
      expect(sentMessages[0]!.content).toContain('https://elpais.com/reportaje/1')
      expect(sentMessages[0]!.content).toContain('https://theguardian.com/article/2')

      // Verify systemPrompt option was passed and contains document-specific instructions
      expect(options?.systemPrompt).toBe('Instrucciones específicas de este documento: actúa como fact-checker estricto.')
    })
  })
})
