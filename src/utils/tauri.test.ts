import { describe, it, expect, afterEach } from 'vitest'
import { isTauri } from './tauri'

describe('isTauri', () => {
  afterEach(() => {
    // Clean up the injected property
    if ('__TAURI_INTERNALS__' in window) {
      delete (window as Record<string, unknown>).__TAURI_INTERNALS__
    }
  })

  it('returns false when __TAURI_INTERNALS__ is not present', () => {
    expect(isTauri()).toBe(false)
  })

  it('returns true when __TAURI_INTERNALS__ is present', () => {
    ;(window as Record<string, unknown>).__TAURI_INTERNALS__ = {}
    expect(isTauri()).toBe(true)
  })
})
