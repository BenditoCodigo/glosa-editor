import { defineConfig } from '@capawesome/capacitor-electron/config';

export default defineConfig({
  window: {
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#0f172a',
  },
  csp: {
    policy:
      "default-src 'self' capacitor-electron: data: blob: 'unsafe-inline' 'unsafe-eval'; connect-src * 'self' http://localhost:* http://127.0.0.1:* https: ws: wss: data: blob:; img-src * 'self' data: blob: https:; font-src * 'self' data: https:;",
    devPolicy:
      "default-src 'self' 'unsafe-inline' 'unsafe-eval' http: https: ws: wss: data: blob:; connect-src * 'self' http://localhost:* http://127.0.0.1:* https: ws: wss: data: blob:; img-src * 'self' data: blob: https:; font-src * 'self' data: https:;",
  },
});
