import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://dev318299.service-now.com',
        changeOrigin: true,
      },
      '/oauth_token.do': {
        target: 'https://dev318299.service-now.com',
        changeOrigin: true,
      }
    }
  }
})
