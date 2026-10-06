import { ref, computed } from 'vue'
import { chatStream, isConfigured } from '@/services/ai'
import type { ChatMessage } from '@/services/ai'

export interface AINoteContext {
  title: string
  folder?: string | null
  tags?: string[]
  updatedAt?: string
  emoji?: string
  fullContent?: string
  sources?: string[]
  aiInstructions?: string
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
    query:
      'Analiza el siguiente fragmento y evalúa la precisión, coherencia factual y posibles dudas sobre los datos o afirmaciones expuestas. Señala si hay datos dudosos, anacronismos o afirmaciones que requieran verificación o matización.',
  },
  {
    id: 'improve',
    label: 'Sugerencias de mejora',
    icon: 'lightbulb',
    description: 'Ideas constructivas para enriquecer o clarificar el contenido.',
    query:
      'Ofrece sugerencias constructivas para enriquecer, clarificar o estructurar mejor este fragmento en el contexto de la nota. No reescribas el texto completo, proporciona observaciones puntuales, ideas complementarias y recomendaciones prácticas.',
  },
  {
    id: 'questions',
    label: 'Preguntas reflexivas',
    icon: 'help_outline',
    description: 'Preguntas críticas para profundizar en el pensamiento.',
    query:
      'Formula 2 o 3 preguntas reflexivas y dudas críticas a partir de este fragmento para que el autor pueda profundizar en el tema, explorar nuevas perspectivas o detectar ángulos no considerados.',
  },
  {
    id: 'inconsistencies',
    label: 'Buscar contradicciones',
    icon: 'find_in_page',
    description: 'Detecta vacíos argumentales o inconsistencias lógicas.',
    query:
      'Examina si en este fragmento existen contradicciones lógicas, premisas sin justificar, sesgos o vacíos conceptuales que pudieran debilitar la idea principal dentro del contexto de la nota.',
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
  const sourcesSection =
    context.sources && context.sources.length > 0
      ? `\n\n[FUENTES Y REFERENCIAS / ANEXOS DEL DOCUMENTO]\n${context.sources.map((s) => `- ${s}`).join('\n')}`
      : ''
  const fullDocSection = context.fullContent?.trim()
    ? `\n\n[DOCUMENTO COMPLETO (CONTEXTO GENERAL DE LA NOTA)]\n"""\n${context.fullContent.trim()}\n"""`
    : ''

  return `[INFORMACIÓN DE LA NOTA]
- Título: ${context.title || 'Sin título'}
- Ubicación / Carpeta: ${folderName}
- Etiquetas: ${tagList}${context.updatedAt ? `\n- Última modificación: ${context.updatedAt}` : ''}${sourcesSection}${fullDocSection}

[BLOQUE O FRAGMENTO SELECCIONADO]
"""
${blockContent.trim()}
"""

[CONSULTA DEL USUARIO]
${userQuery.trim()}

[INSTRUCCIONES IMPORTANTES]
- Responde de forma directa, útil, precisa y natural a la [CONSULTA DEL USUARIO], tomando en cuenta el [BLOQUE O FRAGMENTO SELECCIONADO] y el contexto de la nota.
- Si el usuario hace una pregunta puntual, saludo o petición libre, respóndele directamente lo que solicita sin forzar análisis o críticas no pedidas.
- Si la consulta solicita análisis, dudas o verificación, aporta observaciones constructivas y fundamentadas.
- Responde en español con formato markdown limpio y conciso.`
}

export function useAIBlockAssistant() {
  const isOpen = ref(false)
  const activeBlockIndex = ref<number | null>(null)
  const activeBlockContent = ref('')
  const activeBlockTop = ref<number | null>(null)
  const activeBlockRect = ref<DOMRect | null>(null)
  const noteContext = ref<AINoteContext>({ title: '' })

  const contentGetter = ref<(() => string) | null>(null)
  const contextGetter = ref<(() => AINoteContext) | null>(null)

  function getCurrentBlockContent(): string {
    if (contentGetter.value) {
      try {
        const dynamicContent = contentGetter.value()
        if (dynamicContent !== undefined && dynamicContent !== null) {
          return dynamicContent
        }
      } catch {
        // Fall back to static ref
      }
    }
    return activeBlockContent.value
  }

  function getCurrentContext(): AINoteContext {
    if (contextGetter.value) {
      try {
        const dynamicContext = contextGetter.value()
        if (dynamicContext) {
          return dynamicContext
        }
      } catch {
        // Fall back to static ref
      }
    }
    return noteContext.value
  }

  const currentBlockContent = computed(() => getCurrentBlockContent())
  const currentContext = computed(() => getCurrentContext())

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
    content?: string
    top?: number | null
    rect?: DOMRect | null
    context: AINoteContext
    getContent?: () => string
    getContext?: () => AINoteContext
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
    activeBlockContent.value = options.content ?? ''
    activeBlockTop.value = options.top ?? null
    activeBlockRect.value = options.rect ?? null
    noteContext.value = { ...options.context }
    contentGetter.value = options.getContent ?? null
    contextGetter.value = options.getContext ?? null
    isOpen.value = true
  }

  function closeAssistant() {
    stopGeneration()
    isOpen.value = false
    activeBlockIndex.value = null
    contentGetter.value = null
    contextGetter.value = null
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
    const liveBlockContent = currentBlockContent.value
    const liveContext = currentContext.value

    if (!queryText.trim() || !liveBlockContent.trim()) {
      if (!liveBlockContent.trim()) {
        error.value = 'El bloque de texto está vacío.'
      }
      return
    }
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
      blockContent: liveBlockContent,
      userQuery: queryText,
      context: liveContext,
    })

    const messages: ChatMessage[] = [
      {
        role: 'user',
        content: promptMessage,
      },
    ]

    try {
      const stream = chatStream(messages, {
        signal: abortController.signal,
        systemPrompt: liveContext.aiInstructions?.trim() || undefined,
      })
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
      error.value =
        err instanceof Error ? err.message : 'Ocurrió un error al comunicarse con la IA.'
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
    currentBlockContent,
    activeBlockTop,
    activeBlockRect,
    noteContext,
    currentContext,
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
