import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev server proxies /api/* to the Node backend so the frontend can use
// relative URLs (no CORS issues during the presentation).
export default defineConfig({
    plugins: [react()],
    server: {
        port: 5173,
        proxy: {
            '/api': {
                target: 'http://localhost:3000',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api/, '')
            }
        }
    }
});
