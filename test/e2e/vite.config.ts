import {defineConfig} from 'vite';

// eslint-disable-next-line no-restricted-syntax
export default defineConfig({
  server: {
    host: '127.0.0.1',
    port: 5174,
    strictPort: true,
    proxy: {'/api': 'http://127.0.0.1:3100'},
  },
});
