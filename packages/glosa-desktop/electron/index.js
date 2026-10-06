const { dialog, shell, BrowserWindow } = require('electron');
const fs = require('fs/promises');
const path = require('path');
const chokidar = require('chokidar');

class GlosaDesktopPlugin {
  constructor(context) {
    this.context = context;
    this.watchers = new Map();
    this.nextWatchId = 1;
  }

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

  async readTextFile(options) {
    const data = await fs.readFile(options.path, 'utf8');
    return { data };
  }

  async writeTextFile(options) {
    await fs.mkdir(path.dirname(options.path), { recursive: true });
    await fs.writeFile(options.path, options.data, 'utf8');
    return {};
  }

  async readDir(options) {
    const dirents = await fs.readdir(options.path, { withFileTypes: true });
    const entries = dirents.map((d) => ({
      name: d.name,
      isDirectory: d.isDirectory(),
      isFile: d.isFile(),
    }));
    return { entries };
  }

  async mkdir(options) {
    await fs.mkdir(options.path, { recursive: options?.recursive ?? true });
    return {};
  }

  async remove(options) {
    await fs.rm(options.path, { recursive: options?.recursive ?? true, force: true });
    return {};
  }

  async exists(options) {
    try {
      await fs.access(options.path);
      return { exists: true };
    } catch {
      return { exists: false };
    }
  }

  async stat(options) {
    const stats = await fs.stat(options.path);
    return {
      isDirectory: stats.isDirectory(),
      isFile: stats.isFile(),
      mtime: stats.mtimeMs,
      size: stats.size,
    };
  }

  async startWatch(options) {
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

  async stopWatch(options) {
    const watcher = this.watchers.get(options.watchId);
    if (watcher) {
      await watcher.close();
      this.watchers.delete(options.watchId);
    }
    return {};
  }

  async openUrl(options) {
    if (options?.url) {
      await shell.openExternal(options.url);
    }
    return {};
  }
}

GlosaDesktopPlugin.__capacitorElectronPlugin = {
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
};

module.exports = {
  GlosaDesktop: GlosaDesktopPlugin,
};
