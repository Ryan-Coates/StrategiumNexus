import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // VITE_BASE_URL is injected by CI as /<repo-name>/ for GitHub Pages.
  // Falls back to './' for local dev and Docker.
  base: process.env.VITE_BASE_URL ?? './',
  server: {
    host: true,
    port: 5173,
  },
})
