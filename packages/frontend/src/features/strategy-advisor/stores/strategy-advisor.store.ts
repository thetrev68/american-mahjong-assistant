// Strategy Advisor Store - Zustand store for Strategy Advisor UI and presentation state
// Completely separate from intelligence data - only manages UI/presentation concerns

import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { devtools } from 'zustand/middleware'
import type { StrategyAdvisorTypes } from '../types/strategy-advisor.types'

// Default configuration for Glance Mode
const DEFAULT_CONFIG: StrategyAdvisorTypes.GlanceModeConfig = {
  showConfidence: true,
  showDetails: false,
  autoRefresh: true,
  refreshInterval: 5000, // 5 seconds
  maxMessages: 3,
  prioritizeUrgent: true
}

export const useStrategyAdvisorStore = create<StrategyAdvisorTypes.StrategyAdvisorState>()(
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

        // Core Actions
        addMessage: (message: StrategyAdvisorTypes.StrategyMessage) => {
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

        updateConfig: (configUpdate: Partial<StrategyAdvisorTypes.GlanceModeConfig>) => {
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
        getMessagesByUrgency: (urgency: StrategyAdvisorTypes.UrgencyLevel) => {
          const { currentMessages } = get()
          return currentMessages.filter(msg => msg.urgency === urgency)
        },

        getMessagesByCategory: (category: StrategyAdvisorTypes.GuidanceCategory) => {
          const { currentMessages } = get()
          return currentMessages.filter(msg => msg.category === category)
        },

        getMostUrgentMessage: () => {
          const { currentMessages, config } = get()

          if (currentMessages.length === 0) return null

          // Sort by urgency priority if configured
          if (config.prioritizeUrgent) {
            const urgencyOrder: Record<StrategyAdvisorTypes.UrgencyLevel, number> = {
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
        }
      })
    ),
    {
      name: 'strategy-advisor-store',
      partialize: (state) => ({
        // Persist only configuration, not transient state
        config: state.config,
        isActive: state.isActive
      })
    }
  )
)

// Selectors for optimized component subscriptions
export const strategyAdvisorSelectors = {
  // Get current messages
  messages: (state: StrategyAdvisorTypes.StrategyAdvisorState) => state.currentMessages,

  // Get most urgent message
  mostUrgentMessage: (state: StrategyAdvisorTypes.StrategyAdvisorState) => state.getMostUrgentMessage(),

  // Get actionable messages
  actionableMessages: (state: StrategyAdvisorTypes.StrategyAdvisorState) => state.getActionableMessages(),

  // Get UI state
  uiState: (state: StrategyAdvisorTypes.StrategyAdvisorState) => ({
    isActive: state.isActive,
    isLoading: state.isLoading,
    error: state.error,
    expandedMessageId: state.expandedMessageId,
    lastUpdated: state.lastUpdated
  }),

  // Get configuration
  config: (state: StrategyAdvisorTypes.StrategyAdvisorState) => state.config,

  // Get critical/high urgency messages only
  urgentMessages: (state: StrategyAdvisorTypes.StrategyAdvisorState) =>
    state.currentMessages.filter(msg => msg.urgency === 'critical' || msg.urgency === 'high'),

  // Check if there are new insights (messages from last 30 seconds)
  hasNewInsights: (state: StrategyAdvisorTypes.StrategyAdvisorState) => {
    const thirtySecondsAgo = Date.now() - (30 * 1000)
    return state.currentMessages.some(msg => msg.timestamp > thirtySecondsAgo)
  }
}

// Action creators for common operations
export const strategyAdvisorActions = {
  // Bulk replace all messages (for complete refresh)
  replaceAllMessages: (messages: StrategyAdvisorTypes.StrategyMessage[]) => {
    const { clearMessages, addMessage, config } = useStrategyAdvisorStore.getState()

    clearMessages()

    // Apply max messages limit
    const finalMessages = config.maxMessages > 0
      ? messages.slice(-config.maxMessages)
      : messages

    finalMessages.forEach(message => addMessage(message))
  },

  // Smart message update (remove duplicates, add new ones)
  smartUpdateMessages: (newMessages: StrategyAdvisorTypes.StrategyMessage[]) => {
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
  dismissCategory: (category: StrategyAdvisorTypes.GuidanceCategory) => {
    const { currentMessages, removeMessage } = useStrategyAdvisorStore.getState()

    currentMessages
      .filter(msg => msg.category === category)
      .forEach(msg => removeMessage(msg.id))
  }
}