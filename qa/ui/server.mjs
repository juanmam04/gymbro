import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';
const qa = fileURLToPath(new URL('.', import.meta.url));
const repo = fileURLToPath(new URL('../../', import.meta.url));
const mocks = [
  '@/providers/AuthProvider',
  '@/hooks/useSubscription',
  '@/hooks/useFeedRealtime',
  '@/services/meals',
  '@/services/water',
  '@/services/shared-meals',
  '@/services/auth',
  '@/services/partner',
  '@/services/weight',
  'expo-router',
  'expo-image',
  'expo-image-picker',
  '@expo/vector-icons',
  'react-native-safe-area-context',
];
const server = await createServer({
  root: qa,
  server: { host: '127.0.0.1', port: 5178, fs: { allow: [repo, qa] } },
  resolve: {
    alias: [
      ...mocks.map((find) => ({ find, replacement: qa + 'mock.jsx' })),
      { find: 'react-native', replacement: repo + '/node_modules/react-native-web' },
      { find: '@', replacement: repo + '/src' },
    ],
    dedupe: ['react', 'react-dom', '@tanstack/react-query'],
  },
  optimizeDeps: {
    include: ['react', 'react-dom', '@tanstack/react-query'],
    esbuildOptions: { jsx: 'automatic' },
  },
  esbuild: { jsx: 'automatic' },
});
await server.listen();
