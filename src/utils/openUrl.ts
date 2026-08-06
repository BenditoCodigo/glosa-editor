import { isTauri } from './tauri'

/**
 * Opens an external URL in the default system browser (Tauri) or a new tab (Web).
 */
export async function openExternalUrl(url: string): Promise<void> {
  if (!url) return

  if (isTauri()) {
    try {
      const { openUrl } = await import('@tauri-apps/plugin-opener')
      await openUrl(url)
      return
    } catch (e) {
      console.warn('Failed to open URL via tauri-plugin-opener, falling back to window.open', e)
    }
  }

  window.open(url, '_blank', 'noopener,noreferrer')
}
