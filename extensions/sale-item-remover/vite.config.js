import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'dist',
    lib: {
      entry: './src/Checkout.jsx',
      formats: ['es'],
    },
    rollupOptions: {
      external: [
        'react',
        '@shopify/ui-extensions-react/checkout',
      ],
    },
  },
});
