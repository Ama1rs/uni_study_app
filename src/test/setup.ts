import '@testing-library/jest-dom'
import { vi, beforeEach } from 'vitest'

// Mock Tauri API
;(globalThis as any).__TAURI__ = {
  invoke: vi.fn(),
  dialog: {
    open: vi.fn(),
    save: vi.fn(),
  },
  fs: {
    readTextFile: vi.fn(),
    writeTextFile: vi.fn(),
  },
}

// Mock window.__TAURI__ if it's accessed directly
Object.defineProperty(window, '__TAURI__', {
  value: (globalThis as any).__TAURI__,
  writable: true,
})

// Reset all mocks before each test
beforeEach(() => {
  vi.clearAllMocks()
})