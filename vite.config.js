/* eslint-env node */
/* eslint-disable no-undef */
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    // Base path is environment-driven. For Azure SWA use '/'. For GitHub Pages set VITE_BASE_URL=/shark-fin/
    base: env.VITE_BASE_URL || '/',
  };
});
