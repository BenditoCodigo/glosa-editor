import { FilesystemAdapter } from './adapters/filesystem'
import type { WatcherChangeCallback } from './adapters/filesystem'
import { setAdapter } from './storage'

/**
 * Instantiates a FilesystemAdapter for the given folder path,
 * initializes it (scans directory, loads metadata), and sets it
 * as the active adapter in the storage facade.
 *
 * Optionally starts file watching for external change detection.
 *
 * Throws if initialization fails (folder inaccessible, etc.).
 */
export async function activateFilesystemAdapter(folderPath: string): Promise<FilesystemAdapter> {
  const adapter = new FilesystemAdapter(folderPath)
  await adapter.initialize()
  setAdapter(adapter)
  return adapter
}

/**
 * Starts the file watcher on an already-active filesystem adapter.
 * Should be called after stores are loaded so the callback can update them reactively.
 */
export async function startFilesystemWatcher(
  adapter: FilesystemAdapter,
  callback: WatcherChangeCallback,
): Promise<void> {
  await adapter.startWatching(callback)
}

/**
 * Stops the file watcher on the given adapter.
 * Called when switching away from the filesystem adapter.
 */
export function stopFilesystemWatcher(adapter: FilesystemAdapter): void {
  adapter.stopWatching()
}
