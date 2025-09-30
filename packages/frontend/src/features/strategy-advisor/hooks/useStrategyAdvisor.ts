// useStrategyAdvisor Hook - Simplified Strategy Advisor interface
// Converts intelligence analysis to conversational messages with stable references

import { useEffect, useCallback } from 'react'
import { useIntelligenceStore } from '../../../stores/intelligence-store'
import { useStrategyAdvisorStore, strategyAdvisorSelectors } from '../stores/strategy-advisor.store'
import { generateStrategyMessages } from '../services/message-generator'
import type { StrategyAdvisorHook } from '../types/strategy-advisor.types'

export const useStrategyAdvisor = (): StrategyAdvisorHook => {
  // Get current analysis from intelligence store
  const currentAnalysis = useIntelligenceStore(state => state.currentAnalysis)
  const isAnalyzing = useIntelligenceStore(state => state.isAnalyzing)

  // Get strategy advisor store state
  const messages = useStrategyAdvisorStore(state => state.messages)
  const isActive = useStrategyAdvisorStore(state => state.isActive)
  const isLoading = useStrategyAdvisorStore(state => state.isLoading)
  const error = useStrategyAdvisorStore(state => state.error)
  const config = useStrategyAdvisorStore(state => state.config)
  const expandedMessageId = useStrategyAdvisorStore(state => state.expandedMessageId)

  // Get store actions
  const setMessages = useStrategyAdvisorStore(state => state.setMessages)
  const setLoading = useStrategyAdvisorStore(state => state.setLoading)
  const setActive = useStrategyAdvisorStore(state => state.setActive)
  const setExpandedMessage = useStrategyAdvisorStore(state => state.setExpandedMessage)
  const updateConfig = useStrategyAdvisorStore(state => state.updateConfig)
  const removeMessage = useStrategyAdvisorStore(state => state.removeMessage)
  const clearMessages = useStrategyAdvisorStore(state => state.clearMessages)

  // Generate messages when analysis changes
  useEffect(() => {
    if (!isActive) return

    console.log('🎯 useStrategyAdvisor: Analysis changed, generating messages...')
    console.log('🎯 currentAnalysis:', currentAnalysis)

    if (currentAnalysis) {
      const newMessages = generateStrategyMessages(currentAnalysis)
      console.log('🎯 Generated messages:', newMessages)
      setMessages(newMessages)
    } else if (!isAnalyzing) {
      clearMessages()
    }
  }, [currentAnalysis, isActive, isAnalyzing, setMessages, clearMessages])

  // Sync loading state with intelligence store
  useEffect(() => {
    setLoading(isAnalyzing)
  }, [isAnalyzing, setLoading])

  // Refresh function - just regenerate from current analysis
  const refresh = useCallback(async () => {
    if (!currentAnalysis) return

    setLoading(true)
    try {
      const newMessages = generateStrategyMessages(currentAnalysis)
      setMessages(newMessages)
    } finally {
      setLoading(false)
    }
  }, [currentAnalysis, setMessages, setLoading])

  // Action callbacks with stable references
  const activate = useCallback(() => {
    setActive(true)
  }, [setActive])

  const deactivate = useCallback(() => {
    setActive(false)
  }, [setActive])

  const expandMessage = useCallback((messageId: string) => {
    setExpandedMessage(messageId)
  }, [setExpandedMessage])

  const collapseMessage = useCallback(() => {
    setExpandedMessage(null)
  }, [setExpandedMessage])

  const dismissMessage = useCallback((messageId: string) => {
    removeMessage(messageId)
  }, [removeMessage])

  // Computed values using selectors (subscribe directly to avoid stale closures)
  const mostUrgentMessage = useStrategyAdvisorStore(strategyAdvisorSelectors.mostUrgentMessage)
  const actionableMessages = useStrategyAdvisorStore(strategyAdvisorSelectors.actionableMessages)
  const hasNewInsights = useStrategyAdvisorStore(strategyAdvisorSelectors.hasNewInsights)

  return {
    // State
    messages,
    isActive,
    isLoading,
    error,
    config,
    expandedMessageId,

    // Actions
    refresh,
    activate,
    deactivate,
    expandMessage,
    collapseMessage,
    dismissMessage,
    updateConfig,

    // Computed values
    mostUrgentMessage,
    actionableMessages,
    hasNewInsights
  }
}
