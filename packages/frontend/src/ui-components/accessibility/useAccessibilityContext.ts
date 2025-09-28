/**
 * Accessibility Context Hook
 * Hook for accessing accessibility context
 */

import { useContext } from 'react'
import { AccessibilityContext } from './AccessibilityContext'

export const useAccessibilityContext = () => {
  const context = useContext(AccessibilityContext)
  if (!context) {
    throw new Error('useAccessibilityContext must be used within AccessibilityProvider')
  }
  return context
}