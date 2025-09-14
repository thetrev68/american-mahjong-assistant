import { useCallback } from 'react'
import { useRoomSetupStore, type CoPilotMode } from '../stores/room-setup.store'

interface ModeOption {
  value: CoPilotMode
  label: string
  description: string
}

interface UseCoPilotModeReturn {
  // Current state
  mode: CoPilotMode
  isEveryone: boolean
  isSolo: boolean
  hasAIAssistance: boolean
  othersHaveAI: boolean

  // Actions
  setMode: (mode: CoPilotMode) => void
  toggleMode: () => void

  // Utilities
  getDescription: (mode?: CoPilotMode) => string
  isValidMode: (mode: string) => boolean
  availableModes: CoPilotMode[]
  getModeOptions: () => ModeOption[]
}

const VALID_MODES: CoPilotMode[] = ['everyone', 'solo']

const MODE_LABELS: Record<CoPilotMode, string> = {
  everyone: 'Everyone Gets AI Help',
  solo: 'Solo AI Mode'
}

export const useCoPilotMode = (): UseCoPilotModeReturn => {
  const { coPilotMode, setCoPilotMode, getCoPilotModeDescription } = useRoomSetupStore()

  const setMode = useCallback((mode: CoPilotMode) => {
    setCoPilotMode(mode)
  }, [setCoPilotMode])

  const toggleMode = useCallback(() => {
    const newMode = coPilotMode === 'everyone' ? 'solo' : 'everyone'
    setCoPilotMode(newMode)
  }, [coPilotMode, setCoPilotMode])

  const getDescription = useCallback((mode?: CoPilotMode) => {
    const targetMode = mode || coPilotMode
    return getCoPilotModeDescription(targetMode)
  }, [coPilotMode, getCoPilotModeDescription])

  const isValidMode = useCallback((mode: string): boolean => {
    return VALID_MODES.includes(mode as CoPilotMode)
  }, [])

  const getModeOptions = useCallback((): ModeOption[] => {
    return VALID_MODES.map(mode => ({
      value: mode,
      label: MODE_LABELS[mode],
      description: getCoPilotModeDescription(mode)
    }))
  }, [getCoPilotModeDescription])

  return {
    // Current state
    mode: coPilotMode,
    isEveryone: coPilotMode === 'everyone',
    isSolo: coPilotMode === 'solo',
    hasAIAssistance: true, // Current player always has AI in both modes
    othersHaveAI: coPilotMode === 'everyone',

    // Actions
    setMode,
    toggleMode,

    // Utilities
    getDescription,
    isValidMode,
    availableModes: [...VALID_MODES],
    getModeOptions
  }
}