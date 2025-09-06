import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Ensure correct asset paths when deploying to GitHub Pages under /shark-fin/
  base: '/shark-fin/',
})
