import { describe, it, expect, vi, beforeEach } from 'vitest'
import { optimizeImageFile } from './imageOptimizer'

describe('optimizeImageFile', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('handles SVG files via FileReader directly', async () => {
    const svgContent = '<svg><rect width="10" height="10"/></svg>'
    const file = new File([svgContent], 'test.svg', { type: 'image/svg+xml' })

    const result = await optimizeImageFile(file)
    expect(result).toContain('data:image/svg+xml;base64,')
  })

  it('optimizes and scales raster image files using canvas', async () => {
    // Mock URL.createObjectURL and URL.revokeObjectURL
    const mockObjectUrl = 'blob:http://localhost/mock-uuid'
    globalThis.URL.createObjectURL = vi.fn().mockReturnValue(mockObjectUrl)
    globalThis.URL.revokeObjectURL = vi.fn()

    // Mock Image
    const originalImage = globalThis.Image
    class MockImage {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      naturalWidth = 3840
      naturalHeight = 2160
      width = 3840
      height = 2160
      private _src = ''

      set src(val: string) {
        this._src = val
        setTimeout(() => {
          if (this.onload) this.onload()
        }, 0)
      }

      get src() {
        return this._src
      }
    }
    // @ts-expect-error Mocking Image for jsdom
    globalThis.Image = MockImage

    // Mock canvas and 2d context
    const mockContext = {
      drawImage: vi.fn(),
    }
    const mockCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn().mockReturnValue(mockContext),
      toDataURL: vi.fn().mockReturnValue('data:image/webp;base64,mockwebpdata'),
    }
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'canvas') {
        return mockCanvas as unknown as HTMLCanvasElement
      }
      return document.createElement(tagName)
    })

    const file = new File(['fake-image-bytes'], 'photo.png', { type: 'image/png' })
    const result = await optimizeImageFile(file, { maxWidth: 1920, maxHeight: 1080 })

    expect(result).toBe('data:image/webp;base64,mockwebpdata')
    expect(mockCanvas.width).toBe(1920)
    expect(mockCanvas.height).toBe(1080)
    expect(mockContext.drawImage).toHaveBeenCalled()

    globalThis.Image = originalImage
  })

  it('rejects if the image fails to load', async () => {
    const mockObjectUrl = 'blob:http://localhost/mock-uuid-error'
    globalThis.URL.createObjectURL = vi.fn().mockReturnValue(mockObjectUrl)
    globalThis.URL.revokeObjectURL = vi.fn()

    const originalImage = globalThis.Image
    class ErrorImage {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      private _src = ''

      set src(val: string) {
        this._src = val
        setTimeout(() => {
          if (this.onerror) this.onerror()
        }, 0)
      }

      get src() {
        return this._src
      }
    }
    // @ts-expect-error Mocking Image for jsdom
    globalThis.Image = ErrorImage

    const file = new File(['invalid'], 'invalid.png', { type: 'image/png' })
    await expect(optimizeImageFile(file)).rejects.toThrow('El archivo seleccionado no es una imagen válida')

    globalThis.Image = originalImage
  })
})
