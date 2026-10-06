/** @type {import('electron-builder').Configuration} */
module.exports = {
  appId: 'com.benditocodigo.glosa',
  productName: 'Glosa',
  directories: {
    output: 'dist',
    buildResources: 'assets',
  },
  mac: {
    target: ['dmg'],
    icon: 'assets/icon.icns',
    category: 'public.app-category.productivity',
    identity: null,
  },
  dmg: {
    title: '${productName} ${version}',
    contents: [
      {
        x: 130,
        y: 220,
        type: 'file',
      },
      {
        x: 410,
        y: 220,
        type: 'link',
        path: '/Applications',
      },
    ],
  },
  files: [
    'build/**/*',
    'app/**/*',
    'generated/**/*',
    'assets/**/*',
    'package.json',
    { from: 'vendor/node_modules', to: 'node_modules' },
  ],
};
