import { Capacitor } from '@capacitor/core'
import { GlosaDesktop } from '@glosa/desktop-plugin'
import type { DirEntry, StatResult, FsChangeEvent } from '@glosa/desktop-plugin'

export type { DirEntry, StatResult, FsChangeEvent }

/**
 * Detects whether the app is running in a desktop environment (Capacitor Electron).
 */
export function isDesktop(): boolean {
  if (typeof window === 'undefined') return false

  // Check Capacitor platform
  const capPlatform = Capacitor.getPlatform()
  if (capPlatform === 'electron') return true

  // Check Electron user agent / Custom platform bridge
  if (
    typeof navigator !== 'undefined' &&
    navigator.userAgent &&
    navigator.userAgent.includes('Electron')
  ) {
    return true
  }

  // Check custom window objects
  const win = window as unknown as Record<string, unknown>
  if (win.CapacitorCustomPlatform || win.__capacitorElectronBridge) {
    return true
  }

  return false
}

/**
 * Opens a native directory selection dialog.
 */
export async function pickDirectory(): Promise<string | null> {
  if (!isDesktop()) return null

  try {
    const res = await GlosaDesktop.pickDirectory()
    if (res && res.path) {
      return res.path
    }
    if (res && res.path === null) {
      return null
    }
  } catch (e) {
    console.warn('[Platform] GlosaDesktop.pickDirectory failed:', e)
  }

  return null
}

/**
 * Reads a text file.
 */
export async function readTextFile(path: string): Promise<string> {
  try {
    const res = await GlosaDesktop.readTextFile({ path })
    return res.data
  } catch {
    throw new Error(`Cannot read text file at ${path}: desktop bridge not available`)
  }
}

/**
 * Writes a text file.
 */
export async function writeTextFile(path: string, data: string): Promise<void> {
  try {
    await GlosaDesktop.writeTextFile({ path, data })
  } catch {
    throw new Error(`Cannot write text file at ${path}: desktop bridge not available`)
  }
}

/**
 * Reads a directory's entries.
 */
export async function readDir(path: string): Promise<DirEntry[]> {
  try {
    const res = await GlosaDesktop.readDir({ path })
    return res.entries
  } catch {
    throw new Error(`Cannot read directory at ${path}: desktop bridge not available`)
  }
}

/**
 * Creates a directory.
 */
export async function mkdir(path: string, options?: { recursive?: boolean }): Promise<void> {
  try {
    await GlosaDesktop.mkdir({ path, recursive: options?.recursive ?? true })
  } catch {
    throw new Error(`Cannot create directory at ${path}: desktop bridge not available`)
  }
}

/**
 * Removes a file or directory.
 */
export async function remove(path: string, options?: { recursive?: boolean }): Promise<void> {
  try {
    await GlosaDesktop.remove({ path, recursive: options?.recursive ?? true })
  } catch {
    throw new Error(`Cannot remove path at ${path}: desktop bridge not available`)
  }
}

/**
 * Renames or moves a file or directory.
 */
export async function rename(oldPath: string, newPath: string): Promise<void> {
  try {
    await GlosaDesktop.rename({ oldPath, newPath })
  } catch {
    // Fallback: read + write + remove
    const content = await readTextFile(oldPath)
    await writeTextFile(newPath, content)
    await remove(oldPath)
  }
}

/**
 * Checks if a path exists.
 */
export async function exists(path: string): Promise<boolean> {
  try {
    const res = await GlosaDesktop.exists({ path })
    return res.exists
  } catch {
    return false
  }
}

/**
 * Gets file/directory stat information.
 */
export async function stat(path: string): Promise<StatResult> {
  try {
    return await GlosaDesktop.stat({ path })
  } catch {
    throw new Error(`Cannot stat path at ${path}: desktop bridge not available`)
  }
}

/**
 * Watches a directory for changes. Returns an unwatch function.
 */
export async function watchDirectory(
  path: string,
  callback: (event: FsChangeEvent) => void,
): Promise<() => void> {
  try {
    const { watchId } = await GlosaDesktop.startWatch({ path })
    const handle = await GlosaDesktop.addListener('fsChange', (event) => {
      if (event.watchId === watchId) {
        callback(event)
      }
    })

    return async () => {
      await handle.remove()
      await GlosaDesktop.stopWatch({ watchId })
    }
  } catch {
    return () => {}
  }
}

/**
 * Opens an external URL in the default browser.
 */
export async function openExternalUrl(url: string): Promise<void> {
  if (!url) return

  if (isDesktop()) {
    try {
      await GlosaDesktop.openUrl({ url })
      return
    } catch {
      // Fall through
    }
  }

  if (Capacitor.isNativePlatform()) {
    try {
      const { Browser } = await import('@capacitor/browser')
      await Browser.open({ url })
      return
    } catch {
      // Ignored
    }
  }

  window.open(url, '_blank', 'noopener,noreferrer')
}

export interface PlatformFetchResponse {
  ok: boolean
  status: number
  statusText: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  json: () => Promise<any>
  text: () => Promise<string>
  headers: Headers
}

/**
 * Universal fetch that routes requests through Node.js desktop process when running
 * in Electron to prevent Chromium SSL protocol errors on local endpoints (e.g. Ollama http://localhost:11434).
 */
export async function platformFetch(
  url: string,
  options?: {
    method?: string
    headers?: Record<string, string>
    body?: string
    signal?: AbortSignal
  },
): Promise<PlatformFetchResponse> {
  if (isDesktop()) {
    try {
      const res = await GlosaDesktop.aiFetch({
        url,
        method: options?.method,
        headers: options?.headers,
        body: options?.body,
      })

      return {
        ok: res.ok,
        status: res.status,
        statusText: res.statusText,
        json: async () => JSON.parse(res.data),
        text: async () => res.data,
        headers: new Headers(res.headers),
      }
    } catch (e) {
      // If desktop bridge throws, pass error or fall back to window.fetch
      if (e instanceof DOMException && e.name === 'TimeoutError') {
        throw e
      }
      if (e instanceof Error && e.name === 'TimeoutError') {
        throw new DOMException('TimeoutError', 'TimeoutError')
      }
    }
  }

  const res = await fetch(url, options)
  return res
}

/**
 * Universal streaming chat completion reader that uses desktop stream when in Electron.
 */
export async function* platformStream(
  url: string,
  options?: {
    method?: string
    headers?: Record<string, string>
    body?: string
    signal?: AbortSignal
  },
): AsyncGenerator<string> {
  if (isDesktop()) {
    const streamId = 'stream_' + Math.random().toString(36).slice(2)
    const chunkQueue: string[] = []
    let isDone = false
    let streamError: Error | null = null
    let resolveWait: (() => void) | null = null

    const handle = await GlosaDesktop.addListener('aiStreamChunk', (event) => {
      if (event.streamId !== streamId) return
      if (event.error) {
        streamError = new Error(event.error)
        isDone = true
      }
      if (event.chunk) {
        chunkQueue.push(event.chunk)
      }
      if (event.done) {
        isDone = true
      }
      if (resolveWait) {
        resolveWait()
        resolveWait = null
      }
    })

    const cancel = async () => {
      await handle.remove()
      await GlosaDesktop.aiStreamCancel({ streamId })
    }

    if (options?.signal) {
      options.signal.addEventListener('abort', () => {
        void cancel()
      })
    }

    try {
      const initRes = await GlosaDesktop.aiStream({
        streamId,
        url,
        method: options?.method || 'POST',
        headers: options?.headers,
        body: options?.body,
      })

      if (!initRes.ok) {
        if (!isDone) {
          await new Promise<void>((r) => {
            resolveWait = r
            setTimeout(r, 500)
          })
        }
        if (streamError) throw streamError
        throw new Error(`Stream request failed with status ${initRes.status}`)
      }

      let buffer = ''
      while (!isDone || chunkQueue.length > 0) {
        if (chunkQueue.length === 0 && !isDone) {
          await new Promise<void>((r) => {
            resolveWait = r
          })
        }

        while (chunkQueue.length > 0) {
          const rawChunk = chunkQueue.shift()!
          buffer += rawChunk
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''

          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed || !trimmed.startsWith('data: ')) continue
            const data = trimmed.slice(6)
            if (data === '[DONE]') {
              await cancel()
              return
            }

            try {
              const parsed = JSON.parse(data)
              const content = parsed.choices?.[0]?.delta?.content
              if (content) yield content
            } catch {
              // Malformed line, ignore
            }
          }
        }

        if (streamError) throw streamError
      }

      await cancel()
      return
    } catch (err) {
      await cancel()
      throw err
    }
  }

  // Fallback: standard web fetch stream
  const response = await fetch(url, {
    method: options?.method || 'POST',
    headers: options?.headers,
    body: options?.body,
    signal: options?.signal,
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`Error ${response.status}: ${errorBody}`)
  }

  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || !trimmed.startsWith('data: ')) continue
      const data = trimmed.slice(6)
      if (data === '[DONE]') return

      try {
        const parsed = JSON.parse(data)
        const content = parsed.choices?.[0]?.delta?.content
        if (content) yield content
      } catch {
        // Malformed line, ignore
      }
    }
  }
}
