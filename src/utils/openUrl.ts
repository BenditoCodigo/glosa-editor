import { openExternalUrl as platformOpenUrl } from '@/services/platform'

/**
 * Opens an external URL in the default system browser (Desktop) or a new tab (Web).
 */
export async function openExternalUrl(url: string): Promise<void> {
  await platformOpenUrl(url)
}
