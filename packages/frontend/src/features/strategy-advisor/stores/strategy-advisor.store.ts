// Strategy Advisor Store - Simplified Zustand store for Strategy Advisor state
// Manages only the generated messages and basic UI state

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { StrategyMessage, GlanceModeConfig } from '../types/strategy-advisor.types'

// Default configuration
const DEFAULT_CONFIG: GlanceModeConfig = {
  showConfidence: true,
  showDetails: true,
  autoRefresh: true,
  refreshInterval: 5000,
  maxMessages: 3,
  prioritizeUrgent: true
}

interface StrategyAdvisorState {
  // State
  messages: StrategyMessage[]
  isActive: boolean
  isLoading: boolean
  error: string | null
  config: GlanceModeConfig
  expandedMessageId: string | null

  // Actions
  setMessages: (messages: StrategyMessage[]) => void
  clearMessages: () => void
  setActive: (active: boolean) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setExpandedMessage: (messageId: string | null) => void
  updateConfig: (config: Partial<GlanceModeConfig>) => void
  removeMessage: (messageId: string) => void
}

export const useStrategyAdvisorStore = create<StrategyAdvisorState>()(
  devtools(
    (set) => ({
      // Initial state
      messages: [],
      isActive: true,
      isLoading: false,
      error: null,
      config: DEFAULT_CONFIG,
      expandedMessageId: null,

      // Actions
      setMessages: (messages) => set({ messages, error: null }),

      clearMessages: () => set({ messages: [], expandedMessageId: null }),

      setActive: (active) => set({ isActive: active }),

      setLoading: (loading) => set({ isLoading: loading }),

      setError: (error) => set({ error, isLoading: false }),

      setExpandedMessage: (messageId) => set({ expandedMessageId: messageId }),

      updateConfig: (configUpdate) =>
        set((state) => ({ config: { ...state.config, ...configUpdate } })),

      removeMessage: (messageId) =>
        set((state) => ({
          messages: state.messages.filter(m => m.id !== messageId),
          expandedMessageId: state.expandedMessageId === messageId ? null : state.expandedMessageId
        }))
    }),
    { name: 'strategy-advisor-store' }
  )
)

// Selectors
export const strategyAdvisorSelectors = {
  messages: (state: StrategyAdvisorState) => state.messages,

  mostUrgentMessage: (state: StrategyAdvisorState) => {
    if (state.messages.length === 0) return null

    const urgencyOrder = { critical: 4, high: 3, medium: 2, low: 1 }
    const sorted = [...state.messages].sort((a, b) => {
      const aUrgency = urgencyOrder[a.urgency] || 0
      const bUrgency = urgencyOrder[b.urgency] || 0
      if (aUrgency !== bUrgency) return bUrgency - aUrgency
      return b.confidence - a.confidence
    })

    return sorted[0]
  },

  actionableMessages: (state: StrategyAdvisorState) =>
    state.messages.filter(m => m.isActionable),

  hasNewInsights: (state: StrategyAdvisorState) => {
    const thirtySecondsAgo = Date.now() - 30000
    return state.messages.some(m => m.timestamp > thirtySecondsAgo)
  }
}
