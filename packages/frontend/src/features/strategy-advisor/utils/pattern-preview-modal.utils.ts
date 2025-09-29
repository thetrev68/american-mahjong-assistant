// Pattern Preview Modal utilities - Keyboard hook for modal interactions
// Separated for React Fast Refresh compatibility

import React from 'react'

/**
 * Hook for handling keyboard interactions in the Pattern Preview Modal
 * Handles Escape (cancel) and Enter (confirm) key events
 */
export const usePreviewModalKeyboard = (
  isOpen: boolean,
  onConfirm: () => void,
  onCancel: () => void
) => {
  React.useEffect(() => {
    if (!isOpen) return

    const handleKeydown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'Escape':
          event.preventDefault()
          onCancel()
          break
        case 'Enter':
          event.preventDefault()
          onConfirm()
          break
      }
    }

    document.addEventListener('keydown', handleKeydown)
    return () => document.removeEventListener('keydown', handleKeydown)
  }, [isOpen, onConfirm, onCancel])
}