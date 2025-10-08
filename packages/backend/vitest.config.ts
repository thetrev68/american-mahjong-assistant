import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'src/**/*.ts'
      ],
      exclude: [
        'src/**/*.d.ts',
        'src/server.ts',
        'src/__tests__/**'
      ]
    },
    // Match the same pattern as Jest was using
    include: ['src/**/__tests__/**/*.test.ts']
  },
  resolve: {
    alias: {
      '@shared': '../shared',
      '@backend': '.'
    }
  }
})