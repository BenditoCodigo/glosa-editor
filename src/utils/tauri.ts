/**
 * Detects whether the app is running inside a Tauri desktop environment.
 * Used to conditionally enable filesystem-based storage features.
 */
export function isTauri(): boolean {
  return '__TAURI_INTERNALS__' in window
}
