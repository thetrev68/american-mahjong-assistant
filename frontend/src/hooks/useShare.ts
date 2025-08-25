import { useState, useCallback } from 'react'

export interface ShareOptions {
  title?: string
  text?: string
  url?: string
}

export interface UseShareReturn {
  share: (options: ShareOptions) => Promise<void>
  copyToClipboard: (text: string) => Promise<void>
  isSharing: boolean
  canShare: boolean
  error: string | null
  clearError: () => void
}

export const useShare = (): UseShareReturn => {
  const [isSharing, setIsSharing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const canShare = typeof navigator !== 'undefined' && 'share' in navigator
  
  const clearError = useCallback(() => {
    setError(null)
  }, [])
  
  const copyToClipboard = useCallback(async (text: string): Promise<void> => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text)
      } else {
        // Fallback for older browsers or non-secure contexts
        const textArea = document.createElement('textarea')
        textArea.value = text
        textArea.style.position = 'fixed'
        textArea.style.left = '-999999px'
        textArea.style.top = '-999999px'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
      }
    } catch (err) {
      setError('Failed to copy to clipboard')
      throw err
    }
  }, [])
  
  const share = useCallback(async (options: ShareOptions): Promise<void> => {
    setIsSharing(true)
    setError(null)
    
    try {
      if (canShare && navigator.share) {
        await navigator.share({
          title: options.title,
          text: options.text,
          url: options.url
        })
      } else {
        // Fallback to clipboard
        const shareText = `${options.text || ''} ${options.url || ''}`.trim()
        await copyToClipboard(shareText)
        // Don't throw error for fallback success
      }
    } catch (err) {
      if (err instanceof Error) {
        // User cancelled sharing or other error
        if (err.name === 'AbortError') {
          // User cancelled, don't show error
          return
        }
        setError(err.message)
      } else {
        setError('Failed to share')
      }
      throw err
    } finally {
      setIsSharing(false)
    }
  }, [canShare, copyToClipboard])
  
  return {
    share,
    copyToClipboard,
    isSharing,
    canShare,
    error,
    clearError
  }
}