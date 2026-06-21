import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useSettingsStore } from './settings'
import { DEFAULT_AI_MODEL_PARAMETERS, DEFAULT_AI_SETTINGS } from '@/types'

describe('Settings Store - AI Settings', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  it('loads default AI settings when no stored data exists', () => {
    const store = useSettingsStore()
    expect(store.ai).toEqual(DEFAULT_AI_SETTINGS)
  })

  it('merges stored AI settings with defaults on load', () => {
    localStorage.setItem('glosa-settings', JSON.stringify({
      ai: { enabled: true, baseUrl: 'http://localhost:11434/v1' },
    }))
    setActivePinia(createPinia())
    const store = useSettingsStore()

    expect(store.ai.enabled).toBe(true)
    expect(store.ai.baseUrl).toBe('http://localhost:11434/v1')
    expect(store.ai.model).toBe('')
    expect(store.ai.modelParameters).toEqual(DEFAULT_AI_MODEL_PARAMETERS)
  })

  it('merges stored modelParameters with defaults on load', () => {
    localStorage.setItem('glosa-settings', JSON.stringify({
      ai: { modelParameters: { temperature: 1.2 } },
    }))
    setActivePinia(createPinia())
    const store = useSettingsStore()

    expect(store.ai.modelParameters.temperature).toBe(1.2)
    expect(store.ai.modelParameters.topP).toBe(0.9)
    expect(store.ai.modelParameters.maxTokens).toBe(2048)
  })

  it('updateAI updates partial AI settings', () => {
    const store = useSettingsStore()
    store.updateAI({ enabled: true, baseUrl: 'http://localhost:8080/v1' })

    expect(store.ai.enabled).toBe(true)
    expect(store.ai.baseUrl).toBe('http://localhost:8080/v1')
    expect(store.ai.model).toBe('')
  })

  it('updateAIModelParameters updates partial parameters', () => {
    const store = useSettingsStore()
    store.updateAIModelParameters({ temperature: 1.5, maxTokens: 4096 })

    expect(store.ai.modelParameters.temperature).toBe(1.5)
    expect(store.ai.modelParameters.maxTokens).toBe(4096)
    expect(store.ai.modelParameters.topP).toBe(0.9)
  })

  it('resetAIModelParameters restores default values', () => {
    const store = useSettingsStore()
    store.updateAIModelParameters({ temperature: 2.0, topP: 0.5 })
    store.resetAIModelParameters()

    expect(store.ai.modelParameters).toEqual(DEFAULT_AI_MODEL_PARAMETERS)
  })

  it('addAIHeader appends an empty header', () => {
    const store = useSettingsStore()
    store.addAIHeader()

    expect(store.ai.headers).toHaveLength(1)
    expect(store.ai.headers[0]).toEqual({ key: '', value: '' })
  })

  it('updateAIHeader edits a header at the given index', () => {
    const store = useSettingsStore()
    store.addAIHeader()
    store.addAIHeader()
    store.updateAIHeader(0, { key: 'X-Custom', value: 'test-value' })

    expect(store.ai.headers[0]).toEqual({ key: 'X-Custom', value: 'test-value' })
    expect(store.ai.headers[1]).toEqual({ key: '', value: '' })
  })

  it('removeAIHeader removes a header at the given index', () => {
    const store = useSettingsStore()
    store.addAIHeader()
    store.updateAIHeader(0, { key: 'X-First', value: '1' })
    store.addAIHeader()
    store.updateAIHeader(1, { key: 'X-Second', value: '2' })

    store.removeAIHeader(0)

    expect(store.ai.headers).toHaveLength(1)
    expect(store.ai.headers[0]).toEqual({ key: 'X-Second', value: '2' })
  })

  it('persists AI settings changes to localStorage', async () => {
    const store = useSettingsStore()
    store.updateAI({ enabled: true, baseUrl: 'http://localhost:11434/v1', model: 'llama3.1:8b' })

    // Wait for the watcher to flush
    await new Promise(resolve => setTimeout(resolve, 0))

    const stored = JSON.parse(localStorage.getItem('glosa-settings')!)
    expect(stored.ai.enabled).toBe(true)
    expect(stored.ai.baseUrl).toBe('http://localhost:11434/v1')
    expect(stored.ai.model).toBe('llama3.1:8b')
  })
})
