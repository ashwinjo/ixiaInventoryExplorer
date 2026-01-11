import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Docker-specific Vite config
// Backend URL can be configured via VITE_BACKEND_URL environment variable
// Default: http://backend:3001 (for docker-compose with service name 'backend')
// For standalone: http://host.docker.internal:3001 (Mac/Windows) or host IP (Linux)
const BACKEND_URL = process.env.VITE_BACKEND_URL || 'http://backend:3001'
const FRONTEND_PORT = parseInt(process.env.PORT || '5174', 10)

console.log('[Vite Config] Backend URL:', BACKEND_URL)
console.log('[Vite Config] Frontend Port:', FRONTEND_PORT)

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@/lib': path.resolve(__dirname, './src/lib'),
    },
  },
  server: {
    host: '0.0.0.0', // Allow external connections (required for Docker)
    port: FRONTEND_PORT,
    strictPort: true, // Fail if port is already in use
    proxy: {
      '/api': {
        target: BACKEND_URL,
        changeOrigin: true,
        secure: false,
        ws: true,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, res) => {
            console.log('Proxy error:', err);
            if (res && res.writeHead) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Proxy error', message: err.message }));
            }
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Proxying:', req.method, req.url, '->', BACKEND_URL);
          });
        },
      },
      '/adk': {
        target: BACKEND_URL,
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, res) => {
            console.log('ADK Proxy error:', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Proxying ADK:', req.method, req.url, '->', BACKEND_URL);
          });
        },
      },
    },
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
})

