import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// @taladb/node and @taladb/react-native are never reached in a browser
// (detectPlatform() returns 'browser'). Stub them so Vite's import
// analysis doesn't fail trying to resolve native/RN modules.
const stubNonWebPlatforms: Plugin = {
  name: 'stub-non-web-platforms',
  enforce: 'pre',
  resolveId(id) {
    if (id === '@taladb/node' || id === '@taladb/react-native') {
      return '\0virtual:empty'
    }
  },
  load(id) {
    if (id === '\0virtual:empty') return 'export default {}'
  },
}

export default defineConfig({
  plugins: [react(), stubNonWebPlatforms],
  optimizeDeps: {
    exclude: ['taladb', '@taladb/web', '@huggingface/transformers'],
  },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'credentialless',
    },
  },
})
