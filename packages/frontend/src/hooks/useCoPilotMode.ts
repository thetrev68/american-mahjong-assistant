import { useCallback } from 'react';
import { useRoomStore, type CoPilotMode } from '../stores';

interface ModeOption {
  value: CoPilotMode;
  label: string;
  description: string;
}

interface UseCoPilotModeReturn {
  // Current state
  mode: CoPilotMode;
  isEveryone: boolean;
  isSolo: boolean;
  hasAIAssistance: boolean;
  othersHaveAI: boolean;

  // Actions
  setMode: (mode: CoPilotMode) => void;
  toggleMode: () => void;

  // Utilities
  getDescription: (mode?: CoPilotMode) => string;
  isValidMode: (mode: string) => boolean;
  availableModes: CoPilotMode[];
  getModeOptions: () => ModeOption[];
}

const VALID_MODES: CoPilotMode[] = ['everyone', 'solo'];

const MODE_LABELS: Record<CoPilotMode, string> = {
  everyone: 'Everyone Gets AI Help',
  solo: 'Solo AI Mode',
};

const MODE_DESCRIPTIONS: Record<CoPilotMode, string> = {
  everyone: 'All players use their devices as intelligent co-pilots during the game',
  solo: 'You play alone with the co-pilot while others use physical tiles only',
};

export const useCoPilotMode = (): UseCoPilotModeReturn => {
  const mode = useRoomStore((state) => state.setup.mode);
  const setModeAction = useRoomStore((state) => state.actions.setMode);

  const setMode = useCallback(
    (newMode: CoPilotMode) => {
      setModeAction(newMode);
    },
    [setModeAction]
  );

  const toggleMode = useCallback(() => {
    const newMode = mode === 'everyone' ? 'solo' : 'everyone';
    setModeAction(newMode);
  }, [mode, setModeAction]);

  const getDescription = useCallback(
    (descMode?: CoPilotMode) => {
      const targetMode = descMode || mode;
      return MODE_DESCRIPTIONS[targetMode];
    },
    [mode]
  );

  const isValidMode = useCallback((m: string): m is CoPilotMode => {
    return VALID_MODES.includes(m as CoPilotMode);
  }, []);

  const getModeOptions = useCallback((): ModeOption[] => {
    return VALID_MODES.map((m) => ({
      value: m,
      label: MODE_LABELS[m],
      description: MODE_DESCRIPTIONS[m],
    }));
  }, []);

  return {
    // Current state
    mode,
    isEveryone: mode === 'everyone',
    isSolo: mode === 'solo',
    hasAIAssistance: true, // Current player always has AI in both modes
    othersHaveAI: mode === 'everyone',

    // Actions
    setMode,
    toggleMode,

    // Utilities
    getDescription,
    isValidMode,
    availableModes: [...VALID_MODES],
    getModeOptions,
  };
};