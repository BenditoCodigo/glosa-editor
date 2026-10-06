import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import AIBlockDialog from './AIBlockDialog.vue'
import { useAIBlockAssistant } from '@/composables/useAIBlockAssistant'

describe('AIBlockDialog.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.restoreAllMocks()
    document.body.innerHTML = ''
  })

  it('does not render dialog when assistant.isOpen is false', () => {
    const assistant = useAIBlockAssistant()
    mount(AIBlockDialog, {
      props: { assistant },
    })

    expect(document.body.querySelector('.ai-block-dialog')).toBeNull()
  })

  it('renders dialog and quick action chips when assistant is open', () => {
    const assistant = useAIBlockAssistant()
    assistant.openAssistant({
      index: 0,
      content: 'Este es un párrafo de ejemplo para verificar.',
      top: 100,
      context: { title: 'Mi Nota', tags: ['ideas'] },
    })

    mount(AIBlockDialog, {
      props: { assistant },
    })

    const dialog = document.body.querySelector('.ai-block-dialog')
    expect(dialog).not.toBeNull()
    expect(document.body.textContent).toContain('Asistente de Bloque')
    expect(document.body.textContent).toContain('Verificar datos')
    expect(document.body.textContent).toContain('Sugerencias de mejora')
    expect(document.body.textContent).toContain('Preguntas reflexivas')
    expect(document.body.textContent).toContain('Buscar contradicciones')
  })

  it('triggers quick action when chip is clicked', async () => {
    const assistant = useAIBlockAssistant()
    const askQuickActionSpy = vi.spyOn(assistant, 'askQuickAction')

    assistant.openAssistant({
      index: 0,
      content: 'Contenido a analizar',
      top: 100,
      context: { title: 'Mi Nota' },
    })

    mount(AIBlockDialog, {
      props: { assistant },
    })

    const buttons = Array.from(document.body.querySelectorAll('button'))
    const verifyBtn = buttons.find(b => b.textContent?.includes('Verificar datos'))
    expect(verifyBtn).toBeDefined()
    verifyBtn?.click()

    expect(askQuickActionSpy).toHaveBeenCalled()
  })

  it('displays generated response text when available and allows copying', async () => {
    const assistant = useAIBlockAssistant()
    assistant.openAssistant({
      index: 0,
      content: 'Texto',
      top: 100,
      context: { title: 'Test' },
    })
    assistant.response.value = 'Esta es la respuesta generada por la IA.'

    mount(AIBlockDialog, {
      props: { assistant },
    })

    expect(document.body.textContent).toContain('Esta es la respuesta generada por la IA.')
    expect(document.body.textContent).toContain('Copiar')
    expect(document.body.textContent).toContain('Nueva consulta')
  })
})
