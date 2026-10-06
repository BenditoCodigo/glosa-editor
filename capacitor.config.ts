import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.benditocodigo.glosa',
  appName: 'Glosa',
  webDir: 'dist',
  server: {
    cleartext: true,
    allowNavigation: [
      'localhost',
      '127.0.0.1',
      '*',
    ],
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;
