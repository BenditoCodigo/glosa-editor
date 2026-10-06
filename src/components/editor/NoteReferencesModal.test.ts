import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import NoteReferencesModal from './NoteReferencesModal.vue'

describe('NoteReferencesModal', () => {
  it('renders modal when open is true with provided sources and aiInstructions', () => {
    const wrapper = mount(NoteReferencesModal, {
      props: {
        open: true,
        sources: ['https://example.com/source1', 'https://example.com/source2'],
        aiInstructions: 'Instrucción de prueba para el modelo.',
      },
      global: {
        stubs: {
          Teleport: true,
        },
      },
    })

    expect(wrapper.text()).toContain('Fuentes e Instrucciones de IA')
    expect(wrapper.text()).toContain('https://example.com/source1')
    expect(wrapper.text()).toContain('https://example.com/source2')
    const textarea = wrapper.find('textarea')
    expect((textarea.element as HTMLTextAreaElement).value).toBe(
      'Instrucción de prueba para el modelo.',
    )
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

  it('emits save with updated sources and aiInstructions', async () => {
    const wrapper = mount(NoteReferencesModal, {
      props: {
        open: true,
        sources: ['https://example.com/source1'],
        aiInstructions: 'Instrucción inicial',
      },
      global: {
        stubs: {
          Teleport: true,
        },
      },
    })

    const textarea = wrapper.find('textarea')
    await textarea.setValue('Nueva instrucción periodística')

    const saveButton = wrapper.findAll('button').find((b) => b.text().includes('Guardar cambios'))
    expect(saveButton).toBeDefined()
    await saveButton?.trigger('click')

    expect(wrapper.emitted('save')).toBeTruthy()
    expect(wrapper.emitted('save')?.[0]?.[0]).toEqual({
      sources: ['https://example.com/source1'],
      aiInstructions: 'Nueva instrucción periodística',
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
