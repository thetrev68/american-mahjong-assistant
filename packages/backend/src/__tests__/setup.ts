// Jest setup file for backend tests
// Global test configuration and mocks

// Mock socket.io for testing
jest.mock('socket.io', () => ({
  Server: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    emit: jest.fn(),
    to: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    sockets: {
      adapter: {
        rooms: new Map()
      }
    }
  }))
}))

// Global test timeout
jest.setTimeout(10000)