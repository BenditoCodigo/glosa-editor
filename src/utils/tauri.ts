import { isDesktop } from '@/services/platform'

/**
 * Detects whether the app is running inside a Desktop environment (Capacitor Electron or Tauri).
 * Used to conditionally enable filesystem-based storage features.
 */
export function isTauri(): boolean {
  return isDesktop()
}
