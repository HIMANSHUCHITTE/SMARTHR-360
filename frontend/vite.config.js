import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // expose to all network interfaces (LAN/hotspot access from phone)
    port: 5173,
  },
})
