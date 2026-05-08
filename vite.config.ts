import { defineConfig } from 'vite'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        entry: 'electron/main.ts',
        vite: {
          build: {
            rollupOptions: {
              external: ['better-sqlite3', 'adm-zip', 'node-machine-id']
            }
          }
        }
      },
      {
        entry: 'electron/preload.ts',
        onstart(options: any) {
          options.reload()
        },
        vite: {
          build: {
            rollupOptions: {
              output: {
                format: 'cjs',
                entryFileNames: '[name].cjs'
              }
            }
          }
        }
      },
    ]),
    renderer(),
  ],
})
