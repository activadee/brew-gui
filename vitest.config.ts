import { defineConfig } from 'vitest/config';

export default defineConfig({
  define: {
    __ENABLE_AUTO_UPDATES__: true
  },
  test: {
    environment: 'node',
    include: ['electron/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov']
    }
  }
});
