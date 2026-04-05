import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { copyFileSync, mkdirSync, realpathSync } from 'fs'
import { resolve } from 'path'

const taladbWebPkg = realpathSync(resolve(__dirname, 'node_modules/@taladb/web/pkg'))

// Copies taladb_web.js + taladb_web_bg.wasm into dist/pkg/ after each build
// so the dedicated worker's `import('../pkg/taladb_web.js')` resolves correctly.
const copyWasmPlugin: Plugin = {
  name: 'copy-taladb-wasm',
  closeBundle() {
    mkdirSync('dist/pkg', { recursive: true })
    copyFileSync(resolve(taladbWebPkg, 'taladb_web.js'), 'dist/pkg/taladb_web.js')
    copyFileSync(resolve(taladbWebPkg, 'taladb_web_bg.wasm'), 'dist/pkg/taladb_web_bg.wasm')
  },
}

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
  plugins: [
    react(),
    stubNonWebPlatforms,
    copyWasmPlugin,
  ],
  build: {
    chunkSizeWarningLimit: 2000,
  },
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
