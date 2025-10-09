/**
 * Legacy compatibility wrapper for room-setup.store.ts
 * This store has been refactored into useRoomStore.ts
 * This file provides backward compatibility for components still using the old API
 *
 * IMPORTANT: This is a compatibility layer that maps old API to new store structure
 */
import { useRoomStore } from './useRoomStore'
import type { CoPilotMode, RoomStatus } from './useRoomStore'

/**
 * DO NOT USE THIS HOOK IN COMPONENTS - it creates new object references on every render
 * Use useRoomStore directly with selectors instead:
 *
 * const mode = useRoomStore((s) => s.setup.mode)
 * const actions = useRoomStore((s) => s.actions)
 */
// This store is deprecated - components should use useRoomStore directly
// Keeping for backward compatibility only
export const useRoomSetupStore = () => {
  // Select ONLY primitives to avoid new object references
  const mode = useRoomStore((state) => state.setup.mode)
  const step = useRoomStore((state) => state.setup.step)
  const coPilotModeSelected = useRoomStore((state) => state.setup.coPilotModeSelected)
  const roomCreationStatus = useRoomStore((state) => state.roomCreationStatus)
  const error = useRoomStore((state) => state.error)

  return {
    coPilotMode: mode,
    currentStep: step,
    coPilotModeSelected,
    roomCreationStatus,
    error,

    // Actions use getState to avoid subscribing
    setCoPilotMode: (m: CoPilotMode) => useRoomStore.getState().actions.setMode(m),
    updateCoPilotMode: (m: CoPilotMode) => useRoomStore.getState().actions.setMode(m),
    setRoomCreationStatus: (status: RoomStatus) => useRoomStore.getState().actions.setRoomCreationStatus(status),
    clearError: () => useRoomStore.getState().actions.clearError(),
    resetToStart: () => useRoomStore.getState().actions.clearAll(),
    resetCoPilotModeSelection: () => {
      useRoomStore.setState((state) => ({
        setup: {
          ...state.setup,
          coPilotModeSelected: false,
          mode: 'solo' as CoPilotMode
        }
      }))
    },
    nextStep: () => console.log('nextStep - deprecated'),
    prevStep: () => console.log('prevStep - deprecated'),
    getRoomSetupProgress: () => ({ currentStep: 'ready' as const })
  }
}

function mapRoomSetupState() {
  const state = useRoomStore.getState()
  return {
    coPilotMode: state.setup.mode,
    currentStep: state.setup.step,
    coPilotModeSelected: state.setup.coPilotModeSelected,
    roomCreationStatus: state.roomCreationStatus,
    error: state.error,
    setCoPilotMode: (mode: CoPilotMode) => state.actions.setMode(mode),
    updateCoPilotMode: (mode: CoPilotMode) => state.actions.setMode(mode),
    setRoomCreationStatus: (status: RoomStatus) => state.actions.setRoomCreationStatus(status),
    clearError: () => state.actions.clearError(),
    resetToStart: () => state.actions.clearAll(),
    resetCoPilotModeSelection: () => {
      useRoomStore.setState((s) => ({
        setup: { ...s.setup, coPilotModeSelected: false, mode: 'solo' as CoPilotMode }
      }))
    },
    nextStep: () => console.log('nextStep - deprecated'),
    prevStep: () => console.log('prevStep - deprecated'),
    getRoomSetupProgress: () => ({ currentStep: 'ready' as const })
  }
}

// For non-hook usage
useRoomSetupStore.getState = mapRoomSetupState
