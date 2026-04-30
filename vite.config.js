var _a;
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
    plugins: [react()],
    // VITE_BASE_URL is injected by CI as /<repo-name>/ for GitHub Pages.
    // Falls back to './' for local dev and Docker.
    base: (_a = process.env.VITE_BASE_URL) !== null && _a !== void 0 ? _a : './',
    server: {
        host: true,
        port: 5173,
    },
});
