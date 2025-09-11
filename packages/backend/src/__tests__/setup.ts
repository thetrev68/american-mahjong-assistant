// Vitest setup file for backend tests
// Global test configuration and mocks

import { vi } from 'vitest'

// Mock socket.io for testing
vi.mock('socket.io', () => ({
  Server: vi.fn().mockImplementation(() => ({
    on: vi.fn(),
    emit: vi.fn(),
    to: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    sockets: {
      adapter: {
        rooms: new Map()
      }
    }
  }))
}))

// Global test timeout is handled by vitest.config.ts