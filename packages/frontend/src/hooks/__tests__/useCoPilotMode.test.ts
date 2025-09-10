// useCoPilotMode Hook Test Suite

import { renderHook, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { useCoPilotMode } from '../useCoPilotMode'
import { useRoomSetupStore } from '../../stores/room-setup.store'

// Mock the room setup store
vi.mock('../../stores/room-setup.store')

const mockRoomSetupStore = {
  coPilotMode: 'everyone',
  setCoPilotMode: vi.fn(),
  getCoPilotModeDescription: vi.fn()
}

describe('useCoPilotMode Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset mock store state
    mockRoomSetupStore.coPilotMode = 'everyone'
    mockRoomSetupStore.setCoPilotMode = vi.fn()
    mockRoomSetupStore.getCoPilotModeDescription = vi.fn()
    // @ts-expect-error - vi namespace not available in test config
    ;(useRoomSetupStore as vi.MockedFunction<typeof useRoomSetupStore>).mockReturnValue(mockRoomSetupStore)
  })

  describe('Hook Initialization', () => {
    it('should return current co-pilot mode', () => {
      const { result } = renderHook(() => useCoPilotMode())

      expect(result.current.mode).toBe('everyone')
    })

    it('should provide mode setter function', () => {
      const { result } = renderHook(() => useCoPilotMode())

      expect(typeof result.current.setMode).toBe('function')
    })

    it('should provide mode description function', () => {
      const { result } = renderHook(() => useCoPilotMode())

      expect(typeof result.current.getDescription).toBe('function')
    })
  })

  describe('Mode Management', () => {
    it('should set co-pilot mode to everyone', () => {
      const { result } = renderHook(() => useCoPilotMode())

      act(() => {
        result.current.setMode('everyone')
      })

      expect(mockRoomSetupStore.setCoPilotMode).toHaveBeenCalledWith('everyone')
    })

    it('should set co-pilot mode to solo', () => {
      const { result } = renderHook(() => useCoPilotMode())

      act(() => {
        result.current.setMode('solo')
      })

      expect(mockRoomSetupStore.setCoPilotMode).toHaveBeenCalledWith('solo')
    })

    it('should toggle between modes', () => {
      mockRoomSetupStore.coPilotMode = 'everyone'
      const { result } = renderHook(() => useCoPilotMode())

      act(() => {
        result.current.toggleMode()
      })

      expect(mockRoomSetupStore.setCoPilotMode).toHaveBeenCalledWith('solo')
    })

    it('should toggle from solo to everyone', () => {
      mockRoomSetupStore.coPilotMode = 'solo'
      const { result } = renderHook(() => useCoPilotMode())

      act(() => {
        result.current.toggleMode()
      })

      expect(mockRoomSetupStore.setCoPilotMode).toHaveBeenCalledWith('everyone')
    })
  })

  describe('Mode Descriptions', () => {
    it('should get description for current mode', () => {
      mockRoomSetupStore.coPilotMode = 'everyone' // Ensure we start with everyone mode
      mockRoomSetupStore.getCoPilotModeDescription.mockReturnValue('Test description')
      const { result } = renderHook(() => useCoPilotMode())

      const description = result.current.getDescription()

      expect(mockRoomSetupStore.getCoPilotModeDescription).toHaveBeenCalledWith('everyone')
      expect(description).toBe('Test description')
    })

    it('should get description for specific mode', () => {
      mockRoomSetupStore.getCoPilotModeDescription.mockReturnValue('Solo description')
      const { result } = renderHook(() => useCoPilotMode())

      const description = result.current.getDescription('solo')

      expect(mockRoomSetupStore.getCoPilotModeDescription).toHaveBeenCalledWith('solo')
      expect(description).toBe('Solo description')
    })
  })

  describe('Mode Validation', () => {
    it('should validate everyone mode as valid', () => {
      const { result } = renderHook(() => useCoPilotMode())

      const isValid = result.current.isValidMode('everyone')

      expect(isValid).toBe(true)
    })

    it('should validate solo mode as valid', () => {
      const { result } = renderHook(() => useCoPilotMode())

      const isValid = result.current.isValidMode('solo')

      expect(isValid).toBe(true)
    })

    it('should validate invalid mode as false', () => {
      const { result } = renderHook(() => useCoPilotMode())

      const isValid = result.current.isValidMode('invalid' as 'everyone' | 'solo')

      expect(isValid).toBe(false)
    })
  })

  describe('Mode Properties', () => {
    it('should check if current mode is everyone', () => {
      mockRoomSetupStore.coPilotMode = 'everyone'
      const { result } = renderHook(() => useCoPilotMode())

      expect(result.current.isEveryone).toBe(true)
      expect(result.current.isSolo).toBe(false)
    })

    it('should check if current mode is solo', () => {
      mockRoomSetupStore.coPilotMode = 'solo'
      const { result } = renderHook(() => useCoPilotMode())

      expect(result.current.isEveryone).toBe(false)
      expect(result.current.isSolo).toBe(true)
    })
  })

  describe('Mode Features', () => {
    it('should indicate if AI assistance is enabled for current player', () => {
      mockRoomSetupStore.coPilotMode = 'everyone'
      const { result } = renderHook(() => useCoPilotMode())

      expect(result.current.hasAIAssistance).toBe(true)
    })

    it('should indicate AI assistance in solo mode', () => {
      mockRoomSetupStore.coPilotMode = 'solo'
      const { result } = renderHook(() => useCoPilotMode())

      expect(result.current.hasAIAssistance).toBe(true)
    })

    it('should check if other players have AI assistance', () => {
      mockRoomSetupStore.coPilotMode = 'everyone'
      const { result } = renderHook(() => useCoPilotMode())

      expect(result.current.othersHaveAI).toBe(true)
    })

    it('should indicate others do not have AI in solo mode', () => {
      mockRoomSetupStore.coPilotMode = 'solo'
      const { result } = renderHook(() => useCoPilotMode())

      expect(result.current.othersHaveAI).toBe(false)
    })
  })

  describe('Mode Configuration', () => {
    it('should provide all available modes', () => {
      const { result } = renderHook(() => useCoPilotMode())

      const modes = result.current.availableModes

      expect(modes).toEqual(['everyone', 'solo'])
    })

    it('should provide mode options with descriptions', () => {
      mockRoomSetupStore.getCoPilotModeDescription
        .mockReturnValueOnce('Everyone description')
        .mockReturnValueOnce('Solo description')

      const { result } = renderHook(() => useCoPilotMode())

      const options = result.current.getModeOptions()

      expect(options).toHaveLength(2)
      expect(options[0]).toEqual({
        value: 'everyone',
        label: 'Everyone Gets AI Help',
        description: 'Everyone description'
      })
      expect(options[1]).toEqual({
        value: 'solo',
        label: 'Solo AI Mode',
        description: 'Solo description'
      })
    })
  })
})