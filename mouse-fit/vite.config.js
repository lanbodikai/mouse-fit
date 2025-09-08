import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  // 👇 Add this for your dev server only
  server: {
    proxy: {
      // Frontend calls like fetch("/api/chat") will be sent to your Node proxy
      '/api': {
        target: 'http://localhost:8788', // <-- where server/groq-proxy.js listens
        changeOrigin: true,
        // If your Node route doesn't include /api, uncomment this rewrite:
        // rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
