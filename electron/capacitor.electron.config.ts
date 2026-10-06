import { defineConfig } from '@capawesome/capacitor-electron/config';

export default defineConfig({
  window: {
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#0f172a',
  },
  hooks: {
    beforeReady(app) {
      app.commandLine.appendSwitch('allow-insecure-localhost', 'true');
      app.commandLine.appendSwitch('ignore-certificate-errors', 'true');
      app.commandLine.appendSwitch(
        'disable-features',
        'AutoupgradeMixedContent,BlockInsecurePrivateNetworkRequests',
      );
    },
  },
  csp: {
    policy: [
      "default-src 'self' capacitor-electron: data: blob: https: 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https:",
      "style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com https:",
      "font-src 'self' data: blob: https://fonts.gstatic.com https:",
      "img-src * 'self' data: blob: https:",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: data:",
      "connect-src * 'self' http://localhost:* http://127.0.0.1:* https: ws: wss: data: blob:",
    ].join('; '),
    devPolicy: [
      "default-src 'self' capacitor-electron: data: blob: http: https: ws: wss: 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https: http:",
      "style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com https: http:",
      "font-src 'self' data: blob: https://fonts.gstatic.com https: http:",
      "img-src * 'self' data: blob: https: http:",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: data: http: https:",
      "connect-src * 'self' http://localhost:* http://127.0.0.1:* https: ws: wss: data: blob: http:",
    ].join('; '),
  },
});
