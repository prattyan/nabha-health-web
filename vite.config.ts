import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-ui': ['framer-motion', 'lucide-react', 'react-calendar'],
          'vendor-services': ['firebase/app', 'firebase/messaging', 'socket.io-client', 'idb'],
        },
      },
    },
  },
});
