import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Mirrors the Vercel serverless function route: /api/proxy/* → ServiceNow
      '/api/proxy': {
        target: 'https://dev318299.service-now.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/proxy/, ''),
      },
      // Attachment upload proxy (separate endpoint to handle multipart)
      '/api/proxy-attachment': {
        target: 'https://dev318299.service-now.com',
        changeOrigin: true,
        rewrite: () => '/api/now/attachment/file',
      },
    }
  }
})
