import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 41018,
    proxy: {
      '/api': {
        target: 'http://localhost:41118',
        changeOrigin: true
      }
    }
  }
})
