// Strategy Advisor Store - Zustand store for Strategy Advisor UI and presentation state
// Completely separate from intelligence data - only manages UI/presentation concerns

import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { devtools } from 'zustand/middleware'
import type {
  UrgencyLevel,
  GuidanceCategory,
  StrategyMessage,
  GlanceModeConfig,
  StrategyAdvisorState,
  DisclosureLevel,
  StrategyMode,
  DisclosureState,
  StrategyModeState,
  DisclosureConfig,
  StrategyModeConfig
} from '../types/strategy-advisor.types'

// Type extension for window to avoid any usage
declare global {
  interface Window {
    __strategyAdvisorAutoCollapseTimer?: NodeJS.Timeout
  }
}

// Module-level timer tracking for cleanup
let transitionTimerId: ReturnType<typeof setTimeout> | undefined

// Default configuration for Glance Mode
const DEFAULT_CONFIG: GlanceModeConfig = {
  showConfidence: true,
  showDetails: false,
  autoRefresh: true,
  refreshInterval: 5000, // 5 seconds
  maxMessages: 3,
  prioritizeUrgent: true
}

// Default disclosure configuration
const DEFAULT_DISCLOSURE_CONFIG: DisclosureConfig = {
  defaultLevel: 'glance',
  enableAutoCollapse: true,
  autoCollapseDelay: 15000,
  animationDuration: 300,
  respectsUrgency: true,
  keyboardNavigation: true,
  enableLongPressAdvanced: true
}

// Default disclosure state
const DEFAULT_DISCLOSURE_STATE: DisclosureState = {
  currentLevel: 'glance',
  previousLevel: null,
  isTransitioning: false,
  transitionStartTime: 0,
  allowedLevels: ['glance', 'details', 'advanced'],
  autoCollapseTimeout: undefined
}

// Default strategy mode state
const DEFAULT_STRATEGY_MODE_STATE: StrategyModeState = {
  currentMode: 'flexible',
  isCustomizing: false,
  customConfig: undefined,
  modeHistory: ['flexible'],
  lastChanged: 0
}

// Extended state interface with disclosure and strategy mode state
interface ExtendedStrategyAdvisorState extends StrategyAdvisorState {
  // Progressive disclosure state
  disclosureState: DisclosureState
  disclosureConfig: DisclosureConfig

  // Strategy mode state
  strategyModeState: StrategyModeState

  // Disclosure actions
  setDisclosureLevel: (level: DisclosureLevel) => void
  setDisclosureTransitioning: (isTransitioning: boolean) => void
  updateDisclosureConfig: (config: Partial<DisclosureConfig>) => void
  setAllowedDisclosureLevels: (levels: DisclosureLevel[]) => void
  startAutoCollapseTimer: (delay?: number) => void
  clearAutoCollapseTimer: () => void

  // Strategy mode actions
  setStrategyMode: (mode: StrategyMode) => void
  setCustomStrategyConfig: (config: Partial<StrategyModeConfig>) => void
  clearCustomStrategyConfig: () => void
  addModeToHistory: (mode: StrategyMode) => void
}

export const useStrategyAdvisorStore = create<ExtendedStrategyAdvisorState>()(
  devtools(
    subscribeWithSelector(
      (set, get) => ({
        // Initial State
        currentMessages: [],
        isActive: false,
        lastUpdated: null,
        config: DEFAULT_CONFIG,
        expandedMessageId: null,
        isLoading: false,
        error: null,

        // Progressive disclosure state
        disclosureState: DEFAULT_DISCLOSURE_STATE,
        disclosureConfig: DEFAULT_DISCLOSURE_CONFIG,

        // Strategy mode state - initialize lastChanged at store creation time
        strategyModeState: {
          ...DEFAULT_STRATEGY_MODE_STATE,
          lastChanged: Date.now()
        },

        // Core Actions
        addMessage: (message: StrategyMessage) => {
          set((state) => {
            const updatedMessages = [...state.currentMessages, message]

            // Apply max messages limit if configured
            const { maxMessages } = state.config
            const finalMessages = maxMessages > 0
              ? updatedMessages.slice(-maxMessages)
              : updatedMessages

            return {
              currentMessages: finalMessages,
              lastUpdated: Date.now(),
              error: null
            }
          })
        },

        removeMessage: (messageId: string) => {
          set((state) => ({
            currentMessages: state.currentMessages.filter(msg => msg.id !== messageId),
            expandedMessageId: state.expandedMessageId === messageId ? null : state.expandedMessageId,
            lastUpdated: Date.now()
          }))
        },

        clearMessages: () => {
          set({
            currentMessages: [],
            expandedMessageId: null,
            lastUpdated: Date.now(),
            error: null
          })
        },

        setExpandedMessage: (messageId: string | null) => {
          set({ expandedMessageId: messageId })
        },

        updateConfig: (configUpdate: Partial<GlanceModeConfig>) => {
          set((state) => ({
            config: { ...state.config, ...configUpdate }
          }))
        },

        setLoading: (loading: boolean) => {
          set({ isLoading: loading })
        },

        setError: (error: string | null) => {
          set({ error, isLoading: false })
        },

        setActive: (active: boolean) => {
          set((state) => ({
            isActive: active,
            // Clear messages when deactivating
            currentMessages: active ? state.currentMessages : [],
            expandedMessageId: active ? state.expandedMessageId : null,
            error: active ? state.error : null
          }))
        },

        // Getters
        getMessagesByUrgency: (urgency: UrgencyLevel) => {
          const { currentMessages } = get()
          return currentMessages.filter(msg => msg.urgency === urgency)
        },

        getMessagesByCategory: (category: GuidanceCategory) => {
          const { currentMessages } = get()
          return currentMessages.filter(msg => msg.category === category)
        },

        getMostUrgentMessage: () => {
          const { currentMessages, config } = get()

          if (currentMessages.length === 0) return null

          // Sort by urgency priority if configured
          if (config.prioritizeUrgent) {
            const urgencyOrder: Record<UrgencyLevel, number> = {
              'critical': 4,
              'high': 3,
              'medium': 2,
              'low': 1
            }

            const sorted = [...currentMessages].sort((a, b) => {
              const aUrgency = urgencyOrder[a.urgency] || 0
              const bUrgency = urgencyOrder[b.urgency] || 0

              if (aUrgency !== bUrgency) {
                return bUrgency - aUrgency // Higher urgency first
              }

              // If same urgency, sort by confidence (higher first)
              return b.confidence - a.confidence
            })

            return sorted[0]
          }

          // Return most recent if not prioritizing by urgency
          return currentMessages[currentMessages.length - 1]
        },

        getActionableMessages: () => {
          const { currentMessages } = get()
          return currentMessages.filter(msg => msg.isActionable)
        },

        // Disclosure Actions
        setDisclosureLevel: (level: DisclosureLevel) => {
          // Clear any pending transition timer
          if (transitionTimerId) {
            clearTimeout(transitionTimerId)
          }

          set((state) => ({
            disclosureState: {
              ...state.disclosureState,
              previousLevel: state.disclosureState.currentLevel,
              currentLevel: level,
              isTransitioning: true,
              transitionStartTime: Date.now()
            }
          }))

          // Clear transition state after animation duration
          transitionTimerId = setTimeout(() => {
            set((state) => ({
              disclosureState: {
                ...state.disclosureState,
                isTransitioning: false
              }
            }))
            transitionTimerId = undefined
          }, get().disclosureConfig.animationDuration)
        },

        setDisclosureTransitioning: (isTransitioning: boolean) => {
          set((state) => ({
            disclosureState: {
              ...state.disclosureState,
              isTransitioning
            }
          }))
        },

        updateDisclosureConfig: (config: Partial<DisclosureConfig>) => {
          set((state) => ({
            disclosureConfig: {
              ...state.disclosureConfig,
              ...config
            }
          }))
        },

        setAllowedDisclosureLevels: (levels: DisclosureLevel[]) => {
          set((state) => {
            const newState = {
              disclosureState: {
                ...state.disclosureState,
                allowedLevels: levels
              }
            }

            // If current level is not allowed, fall back to highest allowed level
            if (!levels.includes(state.disclosureState.currentLevel)) {
              const fallbackLevel = levels.includes('advanced') ? 'advanced' :
                                   levels.includes('details') ? 'details' : 'glance'

              newState.disclosureState = {
                ...newState.disclosureState,
                previousLevel: state.disclosureState.currentLevel,
                currentLevel: fallbackLevel,
                isTransitioning: true,
                transitionStartTime: Date.now()
              }
            }

            return newState
          })
        },

        startAutoCollapseTimer: (delay?: number) => {
          const { disclosureConfig } = get()
          const collapseDelay = delay || disclosureConfig.autoCollapseDelay

          // Clear existing timer
          get().clearAutoCollapseTimer()

          const timerId = setTimeout(() => {
            // Check current level at execution time (not when timer was set)
            // This is intentional - only collapse if still expanded when timer fires
            const currentState = get()
            if (currentState.disclosureState.currentLevel !== 'glance') {
              currentState.setDisclosureLevel('glance')
            }
          }, collapseDelay)

          set((state) => ({
            disclosureState: {
              ...state.disclosureState,
              autoCollapseTimeout: Date.now() + collapseDelay
            }
          }))

          // Store timer ID for cleanup (in a real app, you'd use a ref or different approach)
          window.__strategyAdvisorAutoCollapseTimer = timerId
        },

        clearAutoCollapseTimer: () => {
          const timerId = window.__strategyAdvisorAutoCollapseTimer
          if (timerId) {
            clearTimeout(timerId)
            window.__strategyAdvisorAutoCollapseTimer = undefined
          }

          set((state) => ({
            disclosureState: {
              ...state.disclosureState,
              autoCollapseTimeout: undefined
            }
          }))
        },

        // Strategy Mode Actions
        setStrategyMode: (mode: StrategyMode) => {
          set((state) => {
            // Add to history if it's a different mode
            const newHistory = mode !== state.strategyModeState.currentMode
              ? [mode, ...state.strategyModeState.modeHistory.filter(m => m !== mode)].slice(0, 10)
              : state.strategyModeState.modeHistory

            return {
              strategyModeState: {
                ...state.strategyModeState,
                currentMode: mode,
                modeHistory: newHistory,
                lastChanged: Date.now(),
                // Reset customization when switching modes
                isCustomizing: false,
                customConfig: undefined
              }
            }
          })
        },

        setCustomStrategyConfig: (config: Partial<StrategyModeConfig>) => {
          set((state) => ({
            strategyModeState: {
              ...state.strategyModeState,
              isCustomizing: true,
              customConfig: config,
              lastChanged: Date.now()
            }
          }))
        },

        clearCustomStrategyConfig: () => {
          set((state) => ({
            strategyModeState: {
              ...state.strategyModeState,
              isCustomizing: false,
              customConfig: undefined,
              lastChanged: Date.now()
            }
          }))
        },

        addModeToHistory: (mode: StrategyMode) => {
          set((state) => ({
            strategyModeState: {
              ...state.strategyModeState,
              modeHistory: [mode, ...state.strategyModeState.modeHistory.filter(m => m !== mode)].slice(0, 10)
            }
          }))
        }
      })
    ),
    {
      name: 'strategy-advisor-store',
      partialize: (state: ExtendedStrategyAdvisorState) => ({
        // Persist configuration and disclosure preferences
        config: state.config,
        isActive: state.isActive,
        disclosureConfig: state.disclosureConfig,
        strategyModeState: {
          currentMode: state.strategyModeState.currentMode,
          customConfig: state.strategyModeState.customConfig,
          modeHistory: state.strategyModeState.modeHistory.slice(0, 5) // Only persist last 5
        }
      })
    }
  )
)

// Selectors for optimized component subscriptions
export const strategyAdvisorSelectors = {
  // Get current messages
  messages: (state: ExtendedStrategyAdvisorState) => state.currentMessages,

  // Get most urgent message
  mostUrgentMessage: (state: ExtendedStrategyAdvisorState) => state.getMostUrgentMessage(),

  // Get actionable messages
  actionableMessages: (state: ExtendedStrategyAdvisorState) => state.getActionableMessages(),

  // Get UI state
  uiState: (state: ExtendedStrategyAdvisorState) => ({
    isActive: state.isActive,
    isLoading: state.isLoading,
    error: state.error,
    expandedMessageId: state.expandedMessageId,
    lastUpdated: state.lastUpdated
  }),

  // Get configuration
  config: (state: ExtendedStrategyAdvisorState) => state.config,

  // Get critical/high urgency messages only
  urgentMessages: (state: ExtendedStrategyAdvisorState) =>
    state.currentMessages.filter(msg => msg.urgency === 'critical' || msg.urgency === 'high'),

  // Check if there are new insights (messages from last 30 seconds)
  hasNewInsights: (state: ExtendedStrategyAdvisorState) => {
    const thirtySecondsAgo = Date.now() - (30 * 1000)
    return state.currentMessages.some(msg => msg.timestamp > thirtySecondsAgo)
  },

  // Disclosure state selectors
  disclosureState: (state: ExtendedStrategyAdvisorState) => state.disclosureState,
  disclosureConfig: (state: ExtendedStrategyAdvisorState) => state.disclosureConfig,
  currentDisclosureLevel: (state: ExtendedStrategyAdvisorState) => state.disclosureState.currentLevel,
  isDisclosureTransitioning: (state: ExtendedStrategyAdvisorState) => state.disclosureState.isTransitioning,
  allowedDisclosureLevels: (state: ExtendedStrategyAdvisorState) => state.disclosureState.allowedLevels,

  // Strategy mode selectors
  strategyModeState: (state: ExtendedStrategyAdvisorState) => state.strategyModeState,
  currentStrategyMode: (state: ExtendedStrategyAdvisorState) => state.strategyModeState.currentMode,
  isStrategyModeCustomizing: (state: ExtendedStrategyAdvisorState) => state.strategyModeState.isCustomizing,
  strategyModeHistory: (state: ExtendedStrategyAdvisorState) => state.strategyModeState.modeHistory,

  // Combined state selectors
  progressiveDisclosureState: (state: ExtendedStrategyAdvisorState) => ({
    disclosureLevel: state.disclosureState.currentLevel,
    strategyMode: state.strategyModeState.currentMode,
    isTransitioning: state.disclosureState.isTransitioning,
    allowedLevels: state.disclosureState.allowedLevels,
    autoCollapseActive: state.disclosureState.autoCollapseTimeout !== undefined
  }),

  // Feature availability based on disclosure level
  isAdvancedFeaturesAvailable: (state: ExtendedStrategyAdvisorState) =>
    state.disclosureState.allowedLevels.includes('advanced') &&
    (state.disclosureState.currentLevel === 'advanced' || state.disclosureState.currentLevel === 'details'),

  isDetailedAnalysisAvailable: (state: ExtendedStrategyAdvisorState) =>
    state.disclosureState.allowedLevels.includes('details') &&
    state.disclosureState.currentLevel !== 'glance'
}

// Action creators for common operations
export const strategyAdvisorActions = {
  // Bulk replace all messages (for complete refresh)
  replaceAllMessages: (messages: StrategyMessage[]) => {
    const { clearMessages, addMessage, config } = useStrategyAdvisorStore.getState()

    clearMessages()

    // Apply max messages limit
    const finalMessages = config.maxMessages > 0
      ? messages.slice(-config.maxMessages)
      : messages

    finalMessages.forEach(message => addMessage(message))
  },

  // Smart message update (remove duplicates, add new ones)
  smartUpdateMessages: (newMessages: StrategyMessage[]) => {
    const { currentMessages, removeMessage, addMessage } = useStrategyAdvisorStore.getState()

    // Remove messages that are no longer relevant (same category but different content)
    newMessages.forEach(newMsg => {
      const existingMsg = currentMessages.find(msg =>
        msg.category === newMsg.category && msg.id !== newMsg.id
      )
      if (existingMsg) {
        removeMessage(existingMsg.id)
      }
    })

    // Add new messages that don't already exist
    newMessages.forEach(newMsg => {
      const exists = currentMessages.some(msg => msg.id === newMsg.id)
      if (!exists) {
        addMessage(newMsg)
      }
    })
  },

  // Dismiss messages by category
  dismissCategory: (category: GuidanceCategory) => {
    const { currentMessages, removeMessage } = useStrategyAdvisorStore.getState()

    currentMessages
      .filter(msg => msg.category === category)
      .forEach(msg => removeMessage(msg.id))
  }
}