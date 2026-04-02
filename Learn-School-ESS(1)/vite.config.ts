import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      // In ERPNext this app is served from /assets/... but for local dev we want normal root paths.
      base: mode === 'development' ? '/' : "/assets/learnacademy_ess/ess/",
      server: {
        port: 3000,
        host: '0.0.0.0',
        // IMPORTANT: avoid browser CORS errors in local dev by proxying ERPNext API calls.
        proxy: {
          '/api': {
            target: 'https://learnschool.online',
            changeOrigin: true,
            secure: true,
          },
        },
      },
      
      plugins: [react()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };

    
});
