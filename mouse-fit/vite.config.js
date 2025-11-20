// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3000' // forward /api/* to your Node server
    }
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      input: {
        main: 'index.html',
        measure: 'htmls/measure.html',
        grip: 'htmls/grip.html',
        ai: 'htmls/ai.html',
        mouseDb: 'htmls/mouse-db.html',
        report: 'htmls/report.html',
      },
    },
  },
})
