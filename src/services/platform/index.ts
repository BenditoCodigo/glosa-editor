import { Capacitor } from '@capacitor/core'
import { GlosaDesktop } from '@glosa/desktop-plugin'
import type { DirEntry, StatResult, FsChangeEvent } from '@glosa/desktop-plugin'

export type { DirEntry, StatResult, FsChangeEvent }

/**
 * Detects whether the app is running in a desktop environment (Capacitor Electron or Tauri).
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

  // Check Tauri
  if ('__TAURI_INTERNALS__' in window) {
    return true
  }

  return false
}

/**
 * Backward compatibility alias for isDesktop.
 */
export function isTauri(): boolean {
  return isDesktop()
}

/**
 * Opens a native directory selection dialog.
 */
export async function pickDirectory(): Promise<string | null> {
  if (!isDesktop()) return null

  // Try Capacitor GlosaDesktop plugin first
  try {
    const res = await GlosaDesktop.pickDirectory()
    if (res && res.path) {
      return res.path
    }
    if (res && res.path === null) {
      return null
    }
  } catch (e) {
    console.warn('[Platform] GlosaDesktop.pickDirectory failed, trying fallbacks', e)
  }

  // Fallback: Tauri dialog if available
  if ('__TAURI_INTERNALS__' in window) {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog')
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Seleccionar carpeta para notas',
      })
      return typeof selected === 'string' ? selected : null
    } catch {
      // Ignored
    }
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
    if ('__TAURI_INTERNALS__' in window) {
      const { readTextFile: tauriRead } = await import('@tauri-apps/plugin-fs')
      return await tauriRead(path)
    }
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
    if ('__TAURI_INTERNALS__' in window) {
      const { writeTextFile: tauriWrite } = await import('@tauri-apps/plugin-fs')
      await tauriWrite(path, data)
      return
    }
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
    if ('__TAURI_INTERNALS__' in window) {
      const { readDir: tauriReadDir } = await import('@tauri-apps/plugin-fs')
      const entries = await tauriReadDir(path)
      return entries.map((e) => ({
        name: e.name,
        isDirectory: e.isDirectory,
        isFile: e.isFile,
      }))
    }
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
    if ('__TAURI_INTERNALS__' in window) {
      const { mkdir: tauriMkdir } = await import('@tauri-apps/plugin-fs')
      await tauriMkdir(path, { recursive: options?.recursive ?? true })
      return
    }
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
    if ('__TAURI_INTERNALS__' in window) {
      const { remove: tauriRemove } = await import('@tauri-apps/plugin-fs')
      await tauriRemove(path, { recursive: options?.recursive ?? true })
      return
    }
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
    if ('__TAURI_INTERNALS__' in window) {
      const { rename: tauriRename } = await import('@tauri-apps/plugin-fs')
      await tauriRename(oldPath, newPath)
      return
    }
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
    if ('__TAURI_INTERNALS__' in window) {
      const { exists: tauriExists } = await import('@tauri-apps/plugin-fs')
      return await tauriExists(path)
    }
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
    if ('__TAURI_INTERNALS__' in window) {
      const { stat: tauriStat } = await import('@tauri-apps/plugin-fs')
      const s = await tauriStat(path)
      return {
        isDirectory: s.isDirectory,
        isFile: s.isFile,
        mtime: s.mtime ? new Date(s.mtime).getTime() : undefined,
        size: s.size,
      }
    }
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
    if ('__TAURI_INTERNALS__' in window) {
      const { watch: tauriWatch } = await import('@tauri-apps/plugin-fs')
      const unwatch = await tauriWatch(
        path,
        (event) => {
          callback({
            watchId: 'tauri',
            type: typeof event.type === 'string' ? event.type : JSON.stringify(event.type),
            path: Array.isArray(event.paths) ? event.paths[0] || path : path,
          })
        },
        { recursive: true },
      )
      return unwatch
    }
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
      // Continue to Tauri fallback
    }

    if ('__TAURI_INTERNALS__' in window) {
      try {
        const { openUrl } = await import('@tauri-apps/plugin-opener')
        await openUrl(url)
        return
      } catch {
        // Ignored
      }
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
