import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    watch: false,
    environment: 'node',
    reporters: 'default',
    pool: 'threads',
    isolate: false,
    testTimeout: 10000,
  },
})
