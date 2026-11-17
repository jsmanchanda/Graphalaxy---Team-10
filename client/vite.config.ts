import {defineConfig} from 'vite';
// eslint-disable-next-line no-restricted-syntax
export default defineConfig({
  server: {proxy: {'/api': 'http://localhost:3000'}},
});
