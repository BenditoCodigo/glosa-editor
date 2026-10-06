import { isDesktop } from '@/services/platform'

/**
 * Detects whether the app is running inside a Desktop environment (Capacitor Electron).
 * Used to conditionally enable filesystem-based storage features.
 */
export { isDesktop }
