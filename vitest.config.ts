import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/*.test.ts'],
    exclude: [],
    coverage: {
      include: ['src/**/*.ts'],
      exclude: ['src/db/**/*.ts']
    },
    setupFiles: ['__mocks__/setup/handlers.ts'],
  },
});