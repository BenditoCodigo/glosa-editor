import { describe, it, expect } from 'vitest'
import { isDesktop } from './desktop'

describe('isDesktop', () => {
  it('returns a boolean status for desktop environment', () => {
    expect(typeof isDesktop()).toBe('boolean')
  })
})
