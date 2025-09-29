// useStrategyMode Hook - Strategy mode management with persistence
// Handles mode switching, customization, and intelligent recommendations

import { useState, useCallback, useEffect, useMemo } from 'react'
import type {
  StrategyMode,
  StrategyModeState,
  StrategyModeConfig,
  StrategyModeDefinitions,
  StrategyModePreferences,
  UseStrategyMode,
  GameContext,
  UrgencyLevel
} from '../types/strategy-advisor.types'
import {
  strategyModeService,
  STRATEGY_MODE_DEFINITIONS,
  STRATEGY_MODE_DESCRIPTIONS
} from '../services/strategy-mode.service'

// Local storage key for persistence
const PREFERENCES_STORAGE_KEY = 'strategy-advisor-mode-preferences'

// Default preferences
const DEFAULT_PREFERENCES: StrategyModePreferences = {
  preferredMode: 'flexible',
  customConfigs: {},
  disclosurePreferences: {
    defaultLevel: 'glance',
    rememberLevel: true,
    autoCollapse: true
  },
  lastUsed: Date.now()
}

// Default strategy mode state
const DEFAULT_STATE: StrategyModeState = {
  currentMode: 'flexible',
  isCustomizing: false,
  customConfig: undefined,
  modeHistory: ['flexible'],
  lastChanged: Date.now()
}

/**
 * Hook for managing strategy modes with persistence and intelligent recommendations
 * Handles mode switching, customization, and preference management
 */
export const useStrategyMode = (
  initialMode?: StrategyMode
): UseStrategyMode => {
  // Load preferences from localStorage on initialization
  const [preferences, setPreferences] = useState<StrategyModePreferences>(() => {
    try {
      const stored = localStorage.getItem(PREFERENCES_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as StrategyModePreferences
        return {
          ...DEFAULT_PREFERENCES,
          ...parsed,
          disclosurePreferences: {
            ...DEFAULT_PREFERENCES.disclosurePreferences,
            ...parsed.disclosurePreferences
          }
        }
      }
    } catch (error) {
      console.warn('Failed to load strategy mode preferences:', error)
    }
    return DEFAULT_PREFERENCES
  })

  // Strategy mode state
  const [state, setState] = useState<StrategyModeState>(() => ({
    ...DEFAULT_STATE,
    currentMode: initialMode || preferences.preferredMode
  }))

  // Current configuration (either predefined or custom)
  const currentConfig = useMemo((): StrategyModeConfig => {
    if (state.isCustomizing && state.customConfig) {
      const baseConfig = STRATEGY_MODE_DEFINITIONS[state.currentMode]
      return { ...baseConfig, ...state.customConfig }
    }

    return STRATEGY_MODE_DEFINITIONS[state.currentMode] || STRATEGY_MODE_DEFINITIONS.flexible
  }, [state.currentMode, state.isCustomizing, state.customConfig])

  // Set strategy mode
  const setMode = useCallback((mode: StrategyMode) => {
    setState(prevState => {
      // Add to history if it's a different mode
      const newHistory = mode !== prevState.currentMode
        ? [mode, ...prevState.modeHistory.filter(m => m !== mode)].slice(0, 10) // Keep last 10 modes
        : prevState.modeHistory

      return {
        ...prevState,
        currentMode: mode,
        isCustomizing: false, // Reset customization when switching modes
        customConfig: undefined,
        modeHistory: newHistory,
        lastChanged: Date.now()
      }
    })

    // Update preferences with new preferred mode
    setPreferences(prev => ({
      ...prev,
      preferredMode: mode,
      lastUsed: Date.now()
    }))
  }, [])

  // Set custom mode configuration
  const setCustomMode = useCallback((config: Partial<StrategyModeConfig>) => {
    setState(prevState => ({
      ...prevState,
      isCustomizing: true,
      customConfig: config,
      lastChanged: Date.now()
    }))

    // Save custom config to preferences
    setPreferences(prev => ({
      ...prev,
      customConfigs: {
        ...prev.customConfigs,
        [state.currentMode]: config
      },
      lastUsed: Date.now()
    }))
  }, [state.currentMode])

  // Reset to default mode configuration
  const resetToDefault = useCallback(() => {
    setState(prevState => ({
      ...prevState,
      isCustomizing: false,
      customConfig: undefined,
      lastChanged: Date.now()
    }))

    // Remove custom config from preferences
    setPreferences(prev => {
      const newCustomConfigs = { ...prev.customConfigs }
      delete newCustomConfigs[state.currentMode]

      return {
        ...prev,
        customConfigs: newCustomConfigs,
        lastUsed: Date.now()
      }
    })
  }, [state.currentMode])

  // Get mode configuration
  const getModeConfig = useCallback((mode: StrategyMode): StrategyModeConfig => {
    // Check for custom config first
    const customConfig = preferences.customConfigs[mode]
    const baseConfig = STRATEGY_MODE_DEFINITIONS[mode] || STRATEGY_MODE_DEFINITIONS.flexible

    return customConfig ? { ...baseConfig, ...customConfig } : baseConfig
  }, [preferences.customConfigs])

  // Get all mode definitions
  const getAllModes = useCallback((): StrategyModeDefinitions => {
    return STRATEGY_MODE_DEFINITIONS
  }, [])

  // Save preferences to localStorage
  const savePreferences = useCallback(() => {
    try {
      localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(preferences))
    } catch (error) {
      console.warn('Failed to save strategy mode preferences:', error)
    }
  }, [preferences])

  // Load preferences from localStorage
  const loadPreferences = useCallback(() => {
    try {
      const stored = localStorage.getItem(PREFERENCES_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as StrategyModePreferences
        setPreferences({
          ...DEFAULT_PREFERENCES,
          ...parsed,
          disclosurePreferences: {
            ...DEFAULT_PREFERENCES.disclosurePreferences,
            ...parsed.disclosurePreferences
          }
        })

        // Update current mode if preferences specify a different one
        setState(prevState => ({
          ...prevState,
          currentMode: parsed.preferredMode || prevState.currentMode
        }))
      }
    } catch (error) {
      console.warn('Failed to load strategy mode preferences:', error)
      setPreferences(DEFAULT_PREFERENCES)
    }
  }, [])

  // Suggest optimal mode based on context
  const suggestMode = useCallback((
    gameContext: GameContext,
    urgencyLevel: UrgencyLevel
  ): StrategyMode => {
    // Use service to determine optimal mode
    return strategyModeService.suggestOptimalMode(
      gameContext,
      urgencyLevel,
      {
        hasAnalysis: true,
        isAnalyzing: false,
        recommendedPatterns: [],
        tileRecommendations: [],
        strategicAdvice: [],
        threats: [],
        overallScore: 50,
        lastUpdated: Date.now()
      }
    )
  }, [])

  // Get mode description
  const getModeDescription = useCallback((mode: StrategyMode): string => {
    return STRATEGY_MODE_DESCRIPTIONS[mode] || 'Custom strategy mode'
  }, [])

  // Auto-save preferences when they change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      savePreferences()
    }, 1000) // Debounce saves by 1 second

    return () => clearTimeout(timeoutId)
  }, [preferences, savePreferences])

  // Load preferences on mount
  useEffect(() => {
    loadPreferences()
  }, []) // Only run on mount

  return {
    // Current state
    state,
    currentConfig,

    // Mode switching
    setMode,
    setCustomMode,
    resetToDefault,

    // Mode definitions access
    getModeConfig,
    getAllModes,

    // Persistence
    savePreferences,
    loadPreferences,

    // Analytics/recommendations
    suggestMode,
    getModeDescription
  }
}

// Utility hook for simple mode switching without full state management
export const useSimpleStrategyMode = (
  initialMode: StrategyMode = 'flexible'
) => {
  const [currentMode, setCurrentMode] = useState<StrategyMode>(initialMode)
  const [modeHistory, setModeHistory] = useState<StrategyMode[]>([initialMode])

  const setMode = useCallback((mode: StrategyMode) => {
    if (mode === currentMode) return

    setCurrentMode(mode)
    setModeHistory(prev => [mode, ...prev.filter(m => m !== mode)].slice(0, 5))
  }, [currentMode])

  const getCurrentConfig = useCallback((): StrategyModeConfig => {
    return STRATEGY_MODE_DEFINITIONS[currentMode] || STRATEGY_MODE_DEFINITIONS.flexible
  }, [currentMode])

  const cycleModes = useCallback(() => {
    const modes: StrategyMode[] = ['flexible', 'quickWin', 'highScore', 'defensive']
    const currentIndex = modes.indexOf(currentMode)
    const nextIndex = (currentIndex + 1) % modes.length
    setMode(modes[nextIndex])
  }, [currentMode, setMode])

  return {
    currentMode,
    modeHistory,
    currentConfig: getCurrentConfig(),
    setMode,
    cycleModes,
    isFlexible: currentMode === 'flexible',
    isQuickWin: currentMode === 'quickWin',
    isHighScore: currentMode === 'highScore',
    isDefensive: currentMode === 'defensive'
  }
}

// Context integration hook for automatic mode suggestions
export const useAdaptiveStrategyMode = (
  gameContext?: GameContext,
  urgencyLevel?: UrgencyLevel
) => {
  const strategyMode = useStrategyMode()
  const [autoSuggestEnabled, setAutoSuggestEnabled] = useState(true)
  const [lastSuggestion, setLastSuggestion] = useState<{
    mode: StrategyMode
    timestamp: number
    applied: boolean
  } | null>(null)

  // Auto-suggest mode changes based on context
  useEffect(() => {
    if (!autoSuggestEnabled || !gameContext || !urgencyLevel) return

    const suggestedMode = strategyMode.suggestMode(gameContext, urgencyLevel)

    // Only suggest if it's different from current mode and enough time has passed
    const timeSinceLastSuggestion = lastSuggestion
      ? Date.now() - lastSuggestion.timestamp
      : Infinity

    if (
      suggestedMode !== strategyMode.state.currentMode &&
      timeSinceLastSuggestion > 30000 && // 30 seconds between suggestions
      (!lastSuggestion || lastSuggestion.mode !== suggestedMode)
    ) {
      setLastSuggestion({
        mode: suggestedMode,
        timestamp: Date.now(),
        applied: false
      })

      // Could trigger a notification or modal here
      console.log(`Strategy mode suggestion: ${suggestedMode}`)
    }
  }, [gameContext, urgencyLevel, strategyMode, autoSuggestEnabled, lastSuggestion])

  const applySuggestion = useCallback(() => {
    if (lastSuggestion && !lastSuggestion.applied) {
      strategyMode.setMode(lastSuggestion.mode)
      setLastSuggestion(prev => prev ? { ...prev, applied: true } : null)
    }
  }, [lastSuggestion, strategyMode])

  const dismissSuggestion = useCallback(() => {
    setLastSuggestion(null)
  }, [])

  return {
    ...strategyMode,
    autoSuggestEnabled,
    setAutoSuggestEnabled,
    currentSuggestion: lastSuggestion,
    applySuggestion,
    dismissSuggestion,
    hasPendingSuggestion: lastSuggestion !== null && !lastSuggestion.applied
  }
}

// Export utility functions
export const strategyModeUtils = {
  // Get mode comparison data
  compareModes: (modes: StrategyMode[]): Array<{
    mode: StrategyMode
    config: StrategyModeConfig
    description: string
  }> => {
    return modes.map(mode => ({
      mode,
      config: STRATEGY_MODE_DEFINITIONS[mode],
      description: STRATEGY_MODE_DESCRIPTIONS[mode]
    }))
  },

  // Check if mode is suitable for context
  isModeAppropriate: (
    mode: StrategyMode,
    gameContext: GameContext,
    urgencyLevel: UrgencyLevel
  ): boolean => {
    const suggestedMode = strategyModeService.suggestOptimalMode(
      gameContext,
      urgencyLevel,
      {
        hasAnalysis: true,
        isAnalyzing: false,
        recommendedPatterns: [],
        tileRecommendations: [],
        strategicAdvice: [],
        threats: urgencyLevel === 'high' || urgencyLevel === 'critical' ? [{ level: 'high', description: 'High pressure', mitigation: 'Defensive play' }] : [],
        overallScore: 50,
        lastUpdated: Date.now()
      }
    )

    // Allow the suggested mode and one level of difference
    const modeHierarchy: Record<StrategyMode, number> = {
      defensive: 0,
      quickWin: 1,
      flexible: 2,
      highScore: 3
    }

    const targetLevel = modeHierarchy[suggestedMode]
    const currentLevel = modeHierarchy[mode]

    return Math.abs(targetLevel - currentLevel) <= 1
  },

  // Get mode transition recommendations
  getTransitionRecommendation: (
    fromMode: StrategyMode,
    toMode: StrategyMode,
    gameContext: GameContext
  ): {
    recommended: boolean
    reason: string
    difficulty: 'easy' | 'medium' | 'hard'
  } => {
    const transitions: Record<string, { difficulty: 'easy' | 'medium' | 'hard'; reason: string }> = {
      'flexible-quickWin': { difficulty: 'easy', reason: 'Natural escalation for winning opportunity' },
      'flexible-defensive': { difficulty: 'easy', reason: 'Natural response to threats' },
      'flexible-highScore': { difficulty: 'medium', reason: 'Requires pattern complexity assessment' },
      'quickWin-defensive': { difficulty: 'hard', reason: 'Major strategy shift from aggressive to conservative' },
      'highScore-quickWin': { difficulty: 'medium', reason: 'Abandoning complex patterns for speed' },
      'defensive-quickWin': { difficulty: 'hard', reason: 'Major shift from conservative to aggressive play' }
    }

    const key = `${fromMode}-${toMode}`
    const transition = transitions[key]

    if (!transition) {
      return {
        recommended: false,
        reason: 'Uncommon transition',
        difficulty: 'medium'
      }
    }

    // Check if transition makes sense in current context
    const isLateGame = gameContext.gamePhase === 'endgame' || gameContext.wallTilesRemaining < 30
    const recommended = isLateGame
      ? ['quickWin', 'defensive'].includes(toMode) // Late game favors quick or defensive
      : true // Early/mid game allows all transitions

    return {
      recommended,
      reason: transition.reason,
      difficulty: transition.difficulty
    }
  }
}