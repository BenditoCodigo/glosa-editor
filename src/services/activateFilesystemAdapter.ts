import { FilesystemAdapter } from './adapters/filesystem'
import { setAdapter } from './storage'

/**
 * Instantiates a FilesystemAdapter for the given folder path,
 * initializes it (scans directory, loads metadata), and sets it
 * as the active adapter in the storage facade.
 *
 * Throws if initialization fails (folder inaccessible, etc.).
 */
export async function activateFilesystemAdapter(folderPath: string): Promise<FilesystemAdapter> {
  const adapter = new FilesystemAdapter(folderPath)
  await adapter.initialize()
  setAdapter(adapter)
  return adapter
}
