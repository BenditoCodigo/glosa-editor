import { ref, computed } from 'vue'
import { chatStream, isConfigured } from '@/services/ai'
import type { ChatMessage } from '@/services/ai'

export interface AINoteContext {
  title: string
  folder?: string | null
  tags?: string[]
  updatedAt?: string
  emoji?: string
}

export interface AIQuickAction {
  id: string
  label: string
  icon: string
  description: string
  query: string
}

export const DEFAULT_AI_QUICK_ACTIONS: AIQuickAction[] = [
  {
    id: 'verify',
    label: 'Verificar datos',
    icon: 'fact_check',
    description: 'Evalúa la veracidad, coherencia o precisión de los datos expuestos.',
    query: 'Analiza el siguiente fragmento y evalúa la precisión, coherencia factual y posibles dudas sobre los datos o afirmaciones expuestas. Señala si hay datos dudosos, anacronismos o afirmaciones que requieran verificación o matización.',
  },
  {
    id: 'improve',
    label: 'Sugerencias de mejora',
    icon: 'lightbulb',
    description: 'Ideas constructivas para enriquecer o clarificar el contenido.',
    query: 'Ofrece sugerencias constructivas para enriquecer, clarificar o estructurar mejor este fragmento en el contexto de la nota. No reescribas el texto completo, proporciona observaciones puntuales, ideas complementarias y recomendaciones prácticas.',
  },
  {
    id: 'questions',
    label: 'Preguntas reflexivas',
    icon: 'help_outline',
    description: 'Preguntas críticas para profundizar en el pensamiento.',
    query: 'Formula 2 o 3 preguntas reflexivas y dudas críticas a partir de este fragmento para que el autor pueda profundizar en el tema, explorar nuevas perspectivas o detectar ángulos no considerados.',
  },
  {
    id: 'inconsistencies',
    label: 'Buscar contradicciones',
    icon: 'find_in_page',
    description: 'Detecta vacíos argumentales o inconsistencias lógicas.',
    query: 'Examina si en este fragmento existen contradicciones lógicas, premisas sin justificar, sesgos o vacíos conceptuales que pudieran debilitar la idea principal dentro del contexto de la nota.',
  },
]

export function buildAIBlockPrompt(params: {
  blockContent: string
  userQuery: string
  context: AINoteContext
}): string {
  const { blockContent, userQuery, context } = params
  const tagList = context.tags && context.tags.length > 0 ? context.tags.join(', ') : 'Ninguna'
  const folderName = context.folder ? context.folder : 'Raíz'

  return `[CONTEXTO DE LA NOTA]
- Título: ${context.title || 'Sin título'}
- Ubicación / Carpeta: ${folderName}
- Etiquetas: ${tagList}${context.updatedAt ? `\n- Última modificación: ${context.updatedAt}` : ''}

[BLOQUE DE TEXTO SELECCIONADO]
"""
${blockContent.trim()}
"""

[CONSULTA / OBJETIVO]
${userQuery.trim()}

[INSTRUCCIONES IMPORTANTES]
- Responde en español con tono reflexivo, analítico, conciso y constructivo.
- Enfócate exclusivamente en sugerencias, dudas críticas, preguntas o verificación de información.
- NO reescribas ni sustituyas directamente el texto de la nota. Tu objetivo es ser un asesor que acompaña al autor.`
}

export function useAIBlockAssistant() {
  const isOpen = ref(false)
  const activeBlockIndex = ref<number | null>(null)
  const activeBlockContent = ref('')
  const activeBlockTop = ref<number | null>(null)
  const activeBlockRect = ref<DOMRect | null>(null)
  const noteContext = ref<AINoteContext>({ title: '' })

  const customPrompt = ref('')
  const lastQuery = ref('')
  const response = ref('')
  const isLoading = ref(false)
  const isStreaming = ref(false)
  const error = ref<string | null>(null)
  const selectedActionId = ref<string | null>(null)

  let abortController: AbortController | null = null

  const isReady = computed(() => isConfigured())

  function openAssistant(options: {
    index: number
    content: string
    top?: number | null
    rect?: DOMRect | null
    context: AINoteContext
  }) {
    // If opening for a different block, reset response state
    if (activeBlockIndex.value !== options.index) {
      stopGeneration()
      response.value = ''
      error.value = null
      customPrompt.value = ''
      selectedActionId.value = null
    }

    activeBlockIndex.value = options.index
    activeBlockContent.value = options.content
    activeBlockTop.value = options.top ?? null
    activeBlockRect.value = options.rect ?? null
    noteContext.value = { ...options.context }
    isOpen.value = true
  }

  function closeAssistant() {
    stopGeneration()
    isOpen.value = false
    activeBlockIndex.value = null
  }

  function stopGeneration() {
    if (abortController) {
      abortController.abort()
      abortController = null
    }
    isLoading.value = false
    isStreaming.value = false
  }

  async function ask(queryText: string, actionId?: string) {
    if (!queryText.trim() || !activeBlockContent.value.trim()) return
    if (!isConfigured()) {
      error.value = 'La IA no está configurada o está deshabilitada en Configuración.'
      return
    }

    stopGeneration()
    abortController = new AbortController()
    isLoading.value = true
    isStreaming.value = false
    error.value = null
    response.value = ''
    lastQuery.value = queryText
    selectedActionId.value = actionId ?? null

    const promptMessage = buildAIBlockPrompt({
      blockContent: activeBlockContent.value,
      userQuery: queryText,
      context: noteContext.value,
    })

    const messages: ChatMessage[] = [
      {
        role: 'user',
        content: promptMessage,
      },
    ]

    try {
      const stream = chatStream(messages, { signal: abortController.signal })
      isStreaming.value = true
      isLoading.value = false

      for await (const chunk of stream) {
        response.value += chunk
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        // User cancelled generation, do nothing
        return
      }
      error.value = err instanceof Error ? err.message : 'Ocurrió un error al comunicarse con la IA.'
    } finally {
      isLoading.value = false
      isStreaming.value = false
      abortController = null
    }
  }

  function askQuickAction(action: AIQuickAction) {
    return ask(action.query, action.id)
  }

  function submitCustomPrompt() {
    if (!customPrompt.value.trim()) return
    const text = customPrompt.value
    customPrompt.value = ''
    return ask(text)
  }

  function retry() {
    if (lastQuery.value) {
      return ask(lastQuery.value, selectedActionId.value ?? undefined)
    }
  }

  function clearResponse() {
    response.value = ''
    error.value = null
    selectedActionId.value = null
  }

  return {
    isOpen,
    activeBlockIndex,
    activeBlockContent,
    activeBlockTop,
    activeBlockRect,
    noteContext,
    customPrompt,
    lastQuery,
    response,
    isLoading,
    isStreaming,
    error,
    selectedActionId,
    isReady,
    quickActions: DEFAULT_AI_QUICK_ACTIONS,
    openAssistant,
    closeAssistant,
    stopGeneration,
    ask,
    askQuickAction,
    submitCustomPrompt,
    retry,
    clearResponse,
  }
}
