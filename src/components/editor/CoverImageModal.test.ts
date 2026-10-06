import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import CoverImageModal from './CoverImageModal.vue'

describe('CoverImageModal', () => {
  it('renders modal when open is true', () => {
    const wrapper = mount(CoverImageModal, {
      props: {
        open: true,
        initialValue: 'https://example.com/cover.jpg',
      },
      global: {
        stubs: {
          Teleport: true,
        },
      },
    })

    expect(wrapper.text()).toContain('Imagen de portada')
    expect(wrapper.text()).toContain('Subir archivo')
    expect(wrapper.text()).toContain('Enlace web (URL)')
  })

  it('emits remove event when clicking remove button', async () => {
    const wrapper = mount(CoverImageModal, {
      props: {
        open: true,
        initialValue: 'https://example.com/cover.jpg',
      },
      global: {
        stubs: {
          Teleport: true,
        },
      },
    })

    const removeBtn = wrapper.findAll('button').find((b) => b.text().includes('Eliminar portada'))
    expect(removeBtn).toBeDefined()
    await removeBtn!.trigger('click')

    expect(wrapper.emitted('remove')).toBeTruthy()
  })

  it('emits cancel event when clicking cancel button', async () => {
    const wrapper = mount(CoverImageModal, {
      props: {
        open: true,
      },
      global: {
        stubs: {
          Teleport: true,
        },
      },
    })

    const cancelBtn = wrapper.findAll('button').find((b) => b.text().includes('Cancelar'))
    expect(cancelBtn).toBeDefined()
    await cancelBtn!.trigger('click')

    expect(wrapper.emitted('cancel')).toBeTruthy()
  })
})
