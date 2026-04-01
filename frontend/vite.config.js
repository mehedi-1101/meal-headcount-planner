import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        configure: (proxy) => {
          // SSE connections produce ECONNRESET / EPIPE when the browser
          // closes the tab or the EventSource reconnects
          proxy.on('error', (err, _req, _res) => {
            if (err.code === 'ECONNRESET' || err.code === 'EPIPE') return
            console.error('proxy error', err)
          })

          proxy.on('proxyReq', (proxyReq, req) => {
            // Suppress Vite's own error log for the SSE stream endpoint
            if (req.url?.includes('/events/stream')) {
              proxyReq.socket.on('error', (err) => {
                if (err.code === 'ECONNRESET' || err.code === 'EPIPE') return
                console.error('SSE socket error', err)
              })
            }
          })
        },
      },
    },
  },
})
