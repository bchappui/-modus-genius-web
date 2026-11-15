import { renameSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from "@tailwindcss/vite";

// Build of the stand-alone waitlist site (src/waitlist-main.jsx) into
// dist-waitlist/, ready to upload as-is to the web host (Hostinger's
// public_html). The page is renamed index.html so it opens at the domain root.
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'waitlist-as-index',
      closeBundle() {
        renameSync('dist-waitlist/waitlist.html', 'dist-waitlist/index.html');
      },
    },
  ],
  build: {
    outDir: 'dist-waitlist',
    emptyOutDir: true,
    rollupOptions: { input: 'waitlist.html' },
  },
})
