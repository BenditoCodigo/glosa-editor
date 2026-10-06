export interface OptimizeImageOptions {
  maxWidth?: number
  maxHeight?: number
  quality?: number
  mimeType?: 'image/webp' | 'image/jpeg' | 'image/png'
}

/**
 * Optimizes and resizes an image File or Blob in the browser,
 * returning a compressed Data URL (WebP/JPEG).
 */
export async function optimizeImageFile(
  file: File | Blob,
  options: OptimizeImageOptions = {},
): Promise<string> {
  const {
    maxWidth = 1920,
    maxHeight = 1080,
    quality = 0.85,
    mimeType = 'image/webp',
  } = options

  // If it's an SVG, preserve vector format as Data URL directly
  if (file.type === 'image/svg+xml') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(new Error('Error al leer el archivo SVG'))
      reader.readAsDataURL(file)
    })
  }

  // Load the image
  const objectUrl = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve(image)
      image.onerror = () => reject(new Error('El archivo seleccionado no es una imagen válida'))
      image.src = objectUrl
    })

    let width = img.naturalWidth || img.width
    let height = img.naturalHeight || img.height

    if (width === 0 || height === 0) {
      throw new Error('Dimensiones de imagen inválidas')
    }

    // Scale down proportionally if necessary
    if (width > maxWidth || height > maxHeight) {
      const ratio = Math.min(maxWidth / width, maxHeight / height)
      width = Math.round(width * ratio)
      height = Math.round(height * ratio)
    }

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('No se pudo inicializar el contexto de dibujo Canvas')
    }

    // Draw image to canvas
    ctx.drawImage(img, 0, 0, width, height)

    // Export as Data URL
    let dataUrl = canvas.toDataURL(mimeType, quality)
    // Fallback if browser doesn't support WebP export
    if (mimeType === 'image/webp' && !dataUrl.startsWith('data:image/webp')) {
      dataUrl = canvas.toDataURL('image/jpeg', quality)
    }

    return dataUrl
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}
