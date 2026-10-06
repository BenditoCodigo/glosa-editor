import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useSettingsStore } from '@/stores/settings'
import NoteReferencesModal from './NoteReferencesModal.vue'

const mockPush = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

describe('NoteReferencesModal', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockPush.mockClear()
  })

  it('shows alert message and allows navigating to settings when AI is disabled in settings', async () => {
    const wrapper = mount(NoteReferencesModal, {
      props: {
        open: true,
        description: 'Una breve descripción de prueba.',
        sources: ['https://example.com/source1'],
        aiInstructions: 'Instrucción de prueba para el modelo.',
      },
      global: {
        stubs: {
          Teleport: true,
        },
      },
    })

    expect(wrapper.text()).toContain('Instrucciones específicas de IA')
    expect(wrapper.text()).toContain(
      'Para poder configurar estas secciones debes habilitar y configurar la IA desde la configuración.',
    )
    const settingsBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('Ir a configuración'))
    expect(settingsBtn).toBeDefined()
    await settingsBtn?.trigger('click')
    expect(mockPush).toHaveBeenCalledWith('/settings')
    expect(wrapper.emitted('cancel')).toBeTruthy()

    // Instructions textarea and Section 4 should not be shown
    expect(wrapper.findAll('textarea').length).toBe(1)
    expect(wrapper.text()).not.toContain('Configuración avanzada de IA')
  })

  it('renders modal when open is true with provided description, sources, and aiInstructions when AI is enabled', () => {
    const store = useSettingsStore()
    store.settings.ai.enabled = true
    store.settings.ai.baseUrl = 'http://localhost:11434/v1'
    store.settings.ai.model = 'llama3.2'

    const wrapper = mount(NoteReferencesModal, {
      props: {
        open: true,
        description: 'Una breve descripción de prueba.',
        sources: ['https://example.com/source1', 'https://example.com/source2'],
        aiInstructions: 'Instrucción de prueba para el modelo.',
      },
      global: {
        stubs: {
          Teleport: true,
        },
      },
    })

    expect(wrapper.text()).toContain('Metadatos e Instrucciones de IA')
    expect(wrapper.text()).toContain('Descripción breve')
    expect(wrapper.text()).toContain('https://example.com/source1')
    expect(wrapper.text()).toContain('https://example.com/source2')
    expect(wrapper.text()).toContain('Configuración avanzada de IA')

    const textareas = wrapper.findAll('textarea')
    expect(textareas.length).toBe(2)
    const descArea = textareas[0]
    const instrArea = textareas[1]
    expect(descArea).toBeDefined()
    expect(instrArea).toBeDefined()
    expect((descArea!.element as HTMLTextAreaElement).value).toBe(
      'Una breve descripción de prueba.',
    )
    expect((instrArea!.element as HTMLTextAreaElement).value).toBe(
      'Instrucción de prueba para el modelo.',
    )
  })

  it('handles undo and redo for description', async () => {
    const wrapper = mount(NoteReferencesModal, {
      props: {
        open: true,
        description: 'Versión inicial',
        sources: [],
        aiInstructions: '',
      },
      global: {
        stubs: {
          Teleport: true,
        },
      },
    })

    const descTextarea = wrapper.findAll('textarea')[0]
    expect(descTextarea).toBeDefined()

    const undoBtn = wrapper.find('button[aria-label="Deshacer"]')
    const redoBtn = wrapper.find('button[aria-label="Rehacer"]')

    // Initially undo and redo should be disabled
    expect((undoBtn.element as HTMLButtonElement).disabled).toBe(true)
    expect((redoBtn.element as HTMLButtonElement).disabled).toBe(true)

    // Edit description
    await descTextarea!.setValue('Versión modificada')
    expect((undoBtn.element as HTMLButtonElement).disabled).toBe(false)
    expect((redoBtn.element as HTMLButtonElement).disabled).toBe(true)

    // Undo
    await undoBtn.trigger('click')
    expect((descTextarea!.element as HTMLTextAreaElement).value).toBe('Versión inicial')
    expect((undoBtn.element as HTMLButtonElement).disabled).toBe(true)
    expect((redoBtn.element as HTMLButtonElement).disabled).toBe(false)

    // Redo
    await redoBtn.trigger('click')
    expect((descTextarea!.element as HTMLTextAreaElement).value).toBe('Versión modificada')
    expect((undoBtn.element as HTMLButtonElement).disabled).toBe(false)
    expect((redoBtn.element as HTMLButtonElement).disabled).toBe(true)
  })

  it('allows adding and removing sources', async () => {
    const wrapper = mount(NoteReferencesModal, {
      props: {
        open: true,
        sources: ['https://example.com/source1'],
        aiInstructions: '',
      },
      global: {
        stubs: {
          Teleport: true,
        },
      },
    })

    const input = wrapper.find('input[type="url"]')
    await input.setValue('bbc.com/news/123')

    const addButton = wrapper.findAll('button').find((b) => b.text().includes('Agregar'))
    expect(addButton).toBeDefined()
    await addButton?.trigger('click')

    expect(wrapper.text()).toContain('https://bbc.com/news/123')

    // Remove first source
    const deleteButtons = wrapper.findAll('button[aria-label="Eliminar fuente"]')
    expect(deleteButtons.length).toBe(2)
    await deleteButtons[0]?.trigger('click')

    expect(wrapper.text()).not.toContain('https://example.com/source1')
    expect(wrapper.text()).toContain('https://bbc.com/news/123')
  })

  it('emits save with updated description, sources, and aiInstructions', async () => {
    const store = useSettingsStore()
    store.settings.ai.enabled = true
    store.settings.ai.baseUrl = 'http://localhost:11434/v1'
    store.settings.ai.model = 'llama3.2'

    const wrapper = mount(NoteReferencesModal, {
      props: {
        open: true,
        description: 'Mi descripción',
        sources: ['https://example.com/source1'],
        aiInstructions: 'Instrucción inicial',
      },
      global: {
        stubs: {
          Teleport: true,
        },
      },
    })

    const textareas = wrapper.findAll('textarea')
    await textareas[0]?.setValue('Mi descripción actualizada')
    await textareas[1]?.setValue('Nueva instrucción periodística')

    const saveButton = wrapper.findAll('button').find((b) => b.text().includes('Guardar cambios'))
    expect(saveButton).toBeDefined()
    await saveButton?.trigger('click')

    expect(wrapper.emitted('save')).toBeTruthy()
    expect(wrapper.emitted('save')?.[0]?.[0]).toEqual({
      description: 'Mi descripción actualizada',
      sources: ['https://example.com/source1'],
      aiInstructions: 'Nueva instrucción periodística',
    })
  })

  it('allows configuring advanced sampling parameters (temperature and topP)', async () => {
    const store = useSettingsStore()
    store.settings.ai.enabled = true
    store.settings.ai.baseUrl = 'http://localhost:11434/v1'
    store.settings.ai.model = 'llama3.2'

    const wrapper = mount(NoteReferencesModal, {
      props: {
        open: true,
        sources: [],
        aiInstructions: '',
        description: '',
        temperature: 0.2,
        topP: 0.5,
      },
      global: {
        stubs: {
          Teleport: true,
        },
      },
    })

    expect(wrapper.text()).toContain('Configuración avanzada de IA')
    expect(wrapper.text()).toContain('Personalizada')
    expect(wrapper.text()).toContain('Comportamiento determinista y fáctico')

    const saveButton = wrapper.findAll('button').find((b) => b.text().includes('Guardar cambios'))
    expect(saveButton).toBeDefined()
    await saveButton?.trigger('click')

    expect(wrapper.emitted('save')).toBeTruthy()
    expect(wrapper.emitted('save')?.[0]?.[0]).toEqual({
      description: '',
      sources: [],
      aiInstructions: '',
      temperature: 0.2,
      topP: 0.5,
    })
  })

  it('emits cancel on close button click', async () => {
    const wrapper = mount(NoteReferencesModal, {
      props: {
        open: true,
        sources: [],
        aiInstructions: '',
      },
      global: {
        stubs: {
          Teleport: true,
        },
      },
    })

    const cancelButton = wrapper.findAll('button').find((b) => b.text().includes('Cancelar'))
    expect(cancelButton).toBeDefined()
    await cancelButton?.trigger('click')

    expect(wrapper.emitted('cancel')).toBeTruthy()
  })
})
