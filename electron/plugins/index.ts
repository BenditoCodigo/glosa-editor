import { defineElectronPlugin, ElectronPlugin } from '@capawesome/capacitor-electron';
import { dialog, shell, BrowserWindow } from 'electron';
import fs from 'fs/promises';
import path from 'path';
import chokidar from 'chokidar';

export class GlosaDesktopPluginImpl extends ElectronPlugin {
  private watchers = new Map<string, ReturnType<typeof chokidar.watch>>();
  private nextWatchId = 1;

  async pickDirectory() {
    const focusedWindow = BrowserWindow.getFocusedWindow();
    const result = await dialog.showOpenDialog(focusedWindow || undefined, {
      properties: ['openDirectory', 'createDirectory'],
      title: 'Seleccionar carpeta para notas',
    });
    if (result.canceled || result.filePaths.length === 0) {
      return { path: null };
    }
    return { path: result.filePaths[0] };
  }

  async readTextFile(options: { path: string }) {
    const data = await fs.readFile(options.path, 'utf8');
    return { data };
  }

  async writeTextFile(options: { path: string; data: string }) {
    await fs.mkdir(path.dirname(options.path), { recursive: true });
    await fs.writeFile(options.path, options.data, 'utf8');
    return {};
  }

  async readDir(options: { path: string }) {
    const dirents = await fs.readdir(options.path, { withFileTypes: true });
    const entries = dirents.map((d) => ({
      name: d.name,
      isDirectory: d.isDirectory(),
      isFile: d.isFile(),
    }));
    return { entries };
  }

  async mkdir(options: { path: string; recursive?: boolean }) {
    await fs.mkdir(options.path, { recursive: options.recursive ?? true });
    return {};
  }

  async remove(options: { path: string; recursive?: boolean }) {
    await fs.rm(options.path, { recursive: options.recursive ?? true, force: true });
    return {};
  }

  async exists(options: { path: string }) {
    try {
      await fs.access(options.path);
      return { exists: true };
    } catch {
      return { exists: false };
    }
  }

  async stat(options: { path: string }) {
    const stats = await fs.stat(options.path);
    return {
      isDirectory: stats.isDirectory(),
      isFile: stats.isFile(),
      mtime: stats.mtimeMs,
      size: stats.size,
    };
  }

  async startWatch(options: { path: string }) {
    const watchId = String(this.nextWatchId++);
    const watcher = chokidar.watch(options.path, {
      ignoreInitial: true,
      persistent: true,
      depth: 10,
    });

    watcher.on('all', (event, filePath) => {
      this.context.notifyListeners('fsChange', {
        watchId,
        type: event,
        path: filePath,
      });
    });

    this.watchers.set(watchId, watcher);
    return { watchId };
  }

  async stopWatch(options: { watchId: string }) {
    const watcher = this.watchers.get(options.watchId);
    if (watcher) {
      await watcher.close();
      this.watchers.delete(options.watchId);
    }
    return {};
  }

  async openUrl(options: { url: string }) {
    if (options.url) {
      await shell.openExternal(options.url);
    }
    return {};
  }
}

export const GlosaDesktop = defineElectronPlugin(
  {
    name: 'GlosaDesktop',
    methods: [
      'pickDirectory',
      'readTextFile',
      'writeTextFile',
      'readDir',
      'mkdir',
      'remove',
      'exists',
      'stat',
      'startWatch',
      'stopWatch',
      'openUrl',
    ],
  },
  GlosaDesktopPluginImpl,
);
