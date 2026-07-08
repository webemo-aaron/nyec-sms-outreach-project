import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    proxy: {
      '/api/nyec': {
        target: 'http://localhost:52773',
        changeOrigin: true
      }
    }
  }
})
