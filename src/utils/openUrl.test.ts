import { describe, it, expect, vi, beforeEach } from 'vitest'
import { openExternalUrl } from './openUrl'

describe('openExternalUrl', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('calls window.open in web environment', async () => {
    const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null)
    await openExternalUrl('https://example.com')
    expect(windowOpenSpy).toHaveBeenCalledWith(
      'https://example.com',
      '_blank',
      'noopener,noreferrer',
    )
  })

  it('does nothing if url is empty', async () => {
    const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null)
    await openExternalUrl('')
    expect(windowOpenSpy).not.toHaveBeenCalled()
  })
})
