import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      input: {
        panel: 'index.html',
        background: 'src/background/index.ts',
      },
      output: {
        entryFileNames: (chunk) =>
          chunk.name === 'background' ? 'assets/background.js' : 'assets/[name].js',
      },
    },
  },
})
