import { dialog, shell, BrowserWindow } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';
import chokidar from 'chokidar';

class GlosaDesktopPlugin {
  constructor(context) {
    this.context = context;
    this.watchers = new Map();
    this.streamControllers = new Map();
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

  async rename(options) {
    await fs.mkdir(path.dirname(options.newPath), { recursive: true });
    await fs.rename(options.oldPath, options.newPath);
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

  async aiFetch(options) {
    const controller = new AbortController();
    const timeout = options.timeoutMs
      ? setTimeout(() => controller.abort(), options.timeoutMs)
      : null;

    try {
      const response = await fetch(options.url, {
        method: options.method || 'GET',
        headers: options.headers,
        body: options.body,
        signal: controller.signal,
      });

      const headers = {};
      response.headers.forEach((val, key) => {
        headers[key] = val;
      });

      const data = await response.text();
      return {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText,
        headers,
        data,
      };
    } catch (err) {
      if (err && (err.name === 'AbortError' || String(err).includes('AbortError'))) {
        throw new DOMException('TimeoutError', 'TimeoutError');
      }
      throw err;
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  }

  async aiStream(options) {
    const streamId = options.streamId;
    const controller = new AbortController();
    this.streamControllers.set(streamId, controller);

    try {
      const response = await fetch(options.url, {
        method: options.method || 'POST',
        headers: options.headers,
        body: options.body,
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.context.notifyListeners('aiStreamChunk', {
          streamId,
          error: errorText,
          status: response.status,
          done: true,
        });
        return { status: response.status, ok: false };
      }

      if (!response.body) {
        this.context.notifyListeners('aiStreamChunk', {
          streamId,
          done: true,
        });
        return { status: response.status, ok: true };
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      (async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const text = decoder.decode(value, { stream: true });
            this.context.notifyListeners('aiStreamChunk', {
              streamId,
              chunk: text,
              done: false,
            });
          }
          this.context.notifyListeners('aiStreamChunk', {
            streamId,
            done: true,
          });
        } catch (streamErr) {
          if (!controller.signal.aborted) {
            this.context.notifyListeners('aiStreamChunk', {
              streamId,
              error: String(streamErr),
              done: true,
            });
          }
        } finally {
          this.streamControllers.delete(streamId);
        }
      })();

      return { status: response.status, ok: true };
    } catch (err) {
      this.streamControllers.delete(streamId);
      throw err;
    }
  }

  async aiStreamCancel(options) {
    const controller = this.streamControllers.get(options.streamId);
    if (controller) {
      controller.abort();
      this.streamControllers.delete(options.streamId);
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
    'rename',
    'exists',
    'stat',
    'startWatch',
    'stopWatch',
    'openUrl',
    'aiFetch',
    'aiStream',
    'aiStreamCancel',
  ],
};

export const GlosaDesktop = GlosaDesktopPlugin;
