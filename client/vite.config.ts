import path from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const rootEnvDir = path.resolve(__dirname, '..');

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const rootEnv = loadEnv(mode, rootEnvDir, '');
  const localEnv = loadEnv(mode, __dirname, '');
  const apiProxyTarget =
    rootEnv.VITE_API_PROXY_TARGET ||
    localEnv.VITE_API_PROXY_TARGET ||
    (rootEnv.VITE_API_URL || localEnv.VITE_API_URL || '').replace(/\/api\/?$/, '') ||
    `http://127.0.0.1:${rootEnv.PORT || localEnv.PORT || '4000'}`;

  return {
    envDir: rootEnvDir,
    plugins: [react(), tailwindcss()],
    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        '/uploads': {
          target: apiProxyTarget,
          changeOrigin: true,
        },
        '/api': {
          target: apiProxyTarget,
          changeOrigin: true,
        },
        '/socket.io': {
          target: apiProxyTarget,
          ws: true,
          changeOrigin: true,
        },
      },
    },
  };
});
