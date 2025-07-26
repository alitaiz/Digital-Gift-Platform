import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The production API endpoint for the Cloudflare Worker
const WORKER_API_TARGET = 'https://digital-gifts-api.beetle142.workers.dev';
// The local Node.js server for AI features
const LOCAL_AI_PROXY_TARGET = 'http://localhost:8003';


// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxy AI requests to the local Node.js server
      '/api/rewrite-message': {
        target: LOCAL_AI_PROXY_TARGET,
        changeOrigin: true,
      },
      // Proxy all other /api requests to the Cloudflare worker
      '/api': {
        target: WORKER_API_TARGET,
        changeOrigin: true,
      }
    }
  }
})
