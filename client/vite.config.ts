import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    host: true, // Allow external access
    allowedHosts: true, // Allow all hosts including ngrok and Cloudflare Tunnels
    cors: true, // Enable CORS for external access
    hmr: {
      clientPort: 443, // Use HTTPS port for ngrok
    },
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:4000',
        changeOrigin: true,
        secure: false,
      },
      '/socket.io': {
        target: 'http://127.0.0.1:4000',
        ws: true,
        changeOrigin: true,
        secure: false,
      },
    },
  },
  // Vitest config (npm run test)
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
})
