// useDisclosureState Hook - Manages progressive disclosure levels and transitions
// Provides smooth state management with urgency adaptation and keyboard navigation

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import type {
  DisclosureLevel,
  DisclosureState,
  DisclosureConfig,
  UrgencyLevel,
  UseDisclosureState
} from '../types/strategy-advisor.types'
import {
  getTransitionConfig
} from '../utils/disclosure-transitions'

// Default configuration for disclosure behavior
const DEFAULT_CONFIG: DisclosureConfig = {
  defaultLevel: 'glance',
  enableAutoCollapse: true,
  autoCollapseDelay: 15000, // 15 seconds of inactivity
  animationDuration: 300,
  respectsUrgency: true,
  keyboardNavigation: true,
  enableLongPressAdvanced: true
}

// Urgency-based allowed levels mapping
const URGENCY_LEVEL_RESTRICTIONS: Record<UrgencyLevel, DisclosureLevel[]> = {
  critical: ['glance'], // Force glance mode only
  high: ['glance', 'details'], // Allow up to details
  medium: ['glance', 'details', 'advanced'], // All levels available
  low: ['glance', 'details', 'advanced'] // All levels available
}

/**
 * Hook for managing progressive disclosure state with urgency adaptation
 * Handles level transitions, auto-collapse, and keyboard navigation
 */
export const useDisclosureState = (
  initialConfig: Partial<DisclosureConfig> = {}
): UseDisclosureState => {
  const config = useMemo(() => ({
    ...DEFAULT_CONFIG,
    ...initialConfig
  }), [initialConfig])

  // Core disclosure state
  const [disclosureState, setDisclosureState] = useState<DisclosureState>({
    currentLevel: config.defaultLevel,
    previousLevel: null,
    isTransitioning: false,
    transitionStartTime: 0,
    allowedLevels: ['glance', 'details', 'advanced'],
    autoCollapseTimeout: undefined
  })

  // Refs for managing timers and state
  const autoCollapseTimer = useRef<NodeJS.Timeout>()
  const transitionTimer = useRef<NodeJS.Timeout>()
  const userInteractionRef = useRef<boolean>(false)
  const configRef = useRef(config)

  // Update config ref when config changes
  useEffect(() => {
    configRef.current = config
  }, [config])

  // Clear timers on unmount
  useEffect(() => {
    return () => {
      if (autoCollapseTimer.current) {
        clearTimeout(autoCollapseTimer.current)
      }
      if (transitionTimer.current) {
        clearTimeout(transitionTimer.current)
      }
    }
  }, [])

  // Cancel auto-collapse timer
  const cancelAutoCollapse = useCallback(() => {
    if (autoCollapseTimer.current) {
      clearTimeout(autoCollapseTimer.current)
      autoCollapseTimer.current = undefined
    }

    setDisclosureState(prevState => ({
      ...prevState,
      autoCollapseTimeout: undefined
    }))
  }, [])

  // Set disclosure level with transition management
  const setLevel = useCallback((level: DisclosureLevel) => {
    setDisclosureState(prevState => {
      // Check if level is allowed
      if (!prevState.allowedLevels.includes(level)) {
        console.warn(`Disclosure level '${level}' not allowed in current context`)
        return prevState
      }

      // Skip if already at target level and not transitioning
      if (prevState.currentLevel === level && !prevState.isTransitioning) {
        return prevState
      }

      // Clear any existing transition timer
      if (transitionTimer.current) {
        clearTimeout(transitionTimer.current)
      }

      const transitionConfig = getTransitionConfig(
        prevState.currentLevel,
        level
      )

      // Start transition
      const newState: DisclosureState = {
        ...prevState,
        previousLevel: prevState.currentLevel,
        currentLevel: level,
        isTransitioning: true,
        transitionStartTime: Date.now()
      }

      // Set timer to end transition
      transitionTimer.current = setTimeout(() => {
        setDisclosureState(currentState => ({
          ...currentState,
          isTransitioning: false
        }))
      }, transitionConfig.duration)

      return newState
    })

    // Mark as user interaction
    userInteractionRef.current = true

    // Restart auto-collapse timer if expanding
    if (level !== 'glance') {
      // Use configRef to access current timer management
      if (!configRef.current.enableAutoCollapse) return

      // Clear existing timer
      if (autoCollapseTimer.current) {
        clearTimeout(autoCollapseTimer.current)
        autoCollapseTimer.current = undefined
      }

      autoCollapseTimer.current = setTimeout(() => {
        // Only auto-collapse if user hasn't interacted recently
        if (!userInteractionRef.current) {
          setLevel('glance')
        }
      }, configRef.current.autoCollapseDelay)

      setDisclosureState(prevState => ({
        ...prevState,
        autoCollapseTimeout: Date.now() + configRef.current.autoCollapseDelay
      }))
    } else {
      cancelAutoCollapse()
    }
  }, [cancelAutoCollapse])

  // Expand to details level
  const expandToDetails = useCallback(() => {
    setLevel('details')
  }, [setLevel])

  // Expand to advanced level
  const expandToAdvanced = useCallback(() => {
    setLevel('advanced')
  }, [setLevel])

  // Collapse to glance level
  const collapseToGlance = useCallback(() => {
    setLevel('glance')
  }, [setLevel])

  // Toggle between levels intelligently
  const toggleLevel = useCallback(() => {
    const { currentLevel, allowedLevels } = disclosureState

    switch (currentLevel) {
      case 'glance':
        // Expand to details if available, otherwise advanced
        if (allowedLevels.includes('details')) {
          expandToDetails()
        } else if (allowedLevels.includes('advanced')) {
          expandToAdvanced()
        }
        break

      case 'details':
        // Toggle between glance and advanced based on context
        if (userInteractionRef.current && allowedLevels.includes('advanced')) {
          expandToAdvanced()
        } else {
          collapseToGlance()
        }
        break

      case 'advanced':
        // Always collapse from advanced
        if (allowedLevels.includes('details')) {
          setLevel('details')
        } else {
          collapseToGlance()
        }
        break

      default:
        collapseToGlance()
    }

    // Reset user interaction flag after toggle
    setTimeout(() => {
      userInteractionRef.current = false
    }, 1000)
  }, [disclosureState, expandToDetails, expandToAdvanced, collapseToGlance, setLevel])

  // Start auto-collapse timer
  const startAutoCollapse = useCallback(() => {
    if (!configRef.current.enableAutoCollapse) return

    // Clear existing timer
    cancelAutoCollapse()

    autoCollapseTimer.current = setTimeout(() => {
      // Only auto-collapse if user hasn't interacted recently
      if (!userInteractionRef.current) {
        setLevel('glance')
      }
    }, configRef.current.autoCollapseDelay)

    setDisclosureState(prevState => ({
      ...prevState,
      autoCollapseTimeout: Date.now() + configRef.current.autoCollapseDelay
    }))
  }, [cancelAutoCollapse, setLevel])

  // Adapt disclosure levels based on urgency
  const adaptToUrgency = useCallback((urgencyLevel: UrgencyLevel) => {
    if (!configRef.current.respectsUrgency) return

    const allowedLevels = URGENCY_LEVEL_RESTRICTIONS[urgencyLevel] || ['glance', 'details', 'advanced']

    setDisclosureState(prevState => {
      const newState = {
        ...prevState,
        allowedLevels
      }

      // Force level change if current level is not allowed
      if (!allowedLevels.includes(prevState.currentLevel)) {
        // Find the highest allowed level
        const highestAllowed = allowedLevels.includes('advanced') ? 'advanced' :
                              allowedLevels.includes('details') ? 'details' : 'glance'

        return {
          ...newState,
          previousLevel: prevState.currentLevel,
          currentLevel: highestAllowed,
          isTransitioning: true,
          transitionStartTime: Date.now()
        }
      }

      return newState
    })
  }, [])

  // Get allowed levels for current urgency
  const getAllowedLevels = useCallback((urgencyLevel: UrgencyLevel): DisclosureLevel[] => {
    return URGENCY_LEVEL_RESTRICTIONS[urgencyLevel] || ['glance', 'details', 'advanced']
  }, [])

  // Keyboard navigation handler
  const onKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (!configRef.current.keyboardNavigation) return

    const { key, ctrlKey, metaKey } = event

    // Modifier key (Ctrl/Cmd) + Arrow keys for level navigation
    const hasModifier = ctrlKey || metaKey

    if (hasModifier) {
      switch (key) {
        case 'ArrowUp':
        case 'ArrowRight':
          event.preventDefault()
          // Expand to next level
          if (disclosureState.currentLevel === 'glance' && disclosureState.allowedLevels.includes('details')) {
            expandToDetails()
          } else if (disclosureState.currentLevel === 'details' && disclosureState.allowedLevels.includes('advanced')) {
            expandToAdvanced()
          }
          break

        case 'ArrowDown':
        case 'ArrowLeft':
          event.preventDefault()
          // Collapse to previous level
          if (disclosureState.currentLevel === 'advanced') {
            if (disclosureState.allowedLevels.includes('details')) {
              setLevel('details')
            } else {
              collapseToGlance()
            }
          } else if (disclosureState.currentLevel === 'details') {
            collapseToGlance()
          }
          break
      }
    } else {
      // Standard keys without modifiers
      switch (key) {
        case 'Enter':
        case ' ': // Space key
          event.preventDefault()
          toggleLevel()
          break

        case 'Escape':
          event.preventDefault()
          collapseToGlance()
          break
      }
    }

    // Mark as user interaction
    userInteractionRef.current = true

    // Restart auto-collapse on interaction
    if (disclosureState.currentLevel !== 'glance') {
      startAutoCollapse()
    }
  }, [disclosureState, expandToDetails, expandToAdvanced, setLevel, collapseToGlance, toggleLevel, startAutoCollapse])

  // Update configuration
  const updateConfig = useCallback((newConfig: Partial<DisclosureConfig>) => {
    // Update the config through the parent component or state management
    // This is a placeholder - actual implementation depends on how config is managed
    console.log('Config update requested:', newConfig)

    // For immediate effects, update local behavior
    if (newConfig.enableAutoCollapse === false) {
      cancelAutoCollapse()
    } else if (newConfig.enableAutoCollapse === true && disclosureState.currentLevel !== 'glance') {
      startAutoCollapse()
    }
  }, [disclosureState.currentLevel, cancelAutoCollapse, startAutoCollapse])

  // Return hook interface
  return {
    // Current state
    state: disclosureState,
    config,

    // Level control
    setLevel,
    expandToDetails,
    expandToAdvanced,
    collapseToGlance,
    toggleLevel,

    // Auto-behaviors
    startAutoCollapse,
    cancelAutoCollapse,

    // Urgency integration
    adaptToUrgency,
    getAllowedLevels,

    // Keyboard navigation
    onKeyDown,

    // Configuration
    updateConfig
  }
}

// Utility hook for simple disclosure toggle (without full state management)
export const useSimpleDisclosure = (
  initialLevel: DisclosureLevel = 'glance'
) => {
  const [currentLevel, setCurrentLevel] = useState<DisclosureLevel>(initialLevel)
  const [isTransitioning, setIsTransitioning] = useState(false)

  const setLevel = useCallback((level: DisclosureLevel) => {
    if (level === currentLevel) return

    setIsTransitioning(true)
    setCurrentLevel(level)

    // Simple transition timing
    setTimeout(() => {
      setIsTransitioning(false)
    }, 300)
  }, [currentLevel])

  const toggleLevel = useCallback(() => {
    switch (currentLevel) {
      case 'glance':
        setLevel('details')
        break
      case 'details':
        setLevel('advanced')
        break
      case 'advanced':
        setLevel('glance')
        break
    }
  }, [currentLevel, setLevel])

  return {
    currentLevel,
    isTransitioning,
    setLevel,
    toggleLevel,
    isGlance: currentLevel === 'glance',
    isDetails: currentLevel === 'details',
    isAdvanced: currentLevel === 'advanced'
  }
}

// Export utility functions for external use
export const disclosureStateUtils = {
  getNextLevel: (currentLevel: DisclosureLevel, allowedLevels: DisclosureLevel[]): DisclosureLevel | null => {
    const levelOrder: DisclosureLevel[] = ['glance', 'details', 'advanced']
    const currentIndex = levelOrder.indexOf(currentLevel)

    for (let i = currentIndex + 1; i < levelOrder.length; i++) {
      if (allowedLevels.includes(levelOrder[i])) {
        return levelOrder[i]
      }
    }

    return null
  },

  getPreviousLevel: (currentLevel: DisclosureLevel, allowedLevels: DisclosureLevel[]): DisclosureLevel | null => {
    const levelOrder: DisclosureLevel[] = ['glance', 'details', 'advanced']
    const currentIndex = levelOrder.indexOf(currentLevel)

    for (let i = currentIndex - 1; i >= 0; i--) {
      if (allowedLevels.includes(levelOrder[i])) {
        return levelOrder[i]
      }
    }

    return null
  },

  isLevelAllowed: (level: DisclosureLevel, urgencyLevel: UrgencyLevel): boolean => {
    const allowedLevels = URGENCY_LEVEL_RESTRICTIONS[urgencyLevel] || ['glance', 'details', 'advanced']
    return allowedLevels.includes(level)
  }
}