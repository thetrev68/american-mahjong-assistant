import React, { useState } from 'react'
import { useShare } from '../hooks/useShare'
import { Button } from './Button'

interface ShareButtonProps {
  roomCode: string
  disabled?: boolean
  className?: string
}

export const ShareButton: React.FC<ShareButtonProps> = ({
  roomCode,
  disabled = false,
  className = ''
}) => {
  const { share, copyToClipboard, isSharing, canShare, error, clearError } = useShare()
  const [showSuccess, setShowSuccess] = useState(false)
  
  const handleShare = async () => {
    try {
      clearError()
      
      const currentUrl = window.location.origin
      const joinUrl = `${currentUrl}/room-setup?join=${roomCode}`
      const shareText = `Join my American Mahjong game! Room Code: ${roomCode}`
      
      if (canShare) {
        await share({
          title: 'Join American Mahjong Game',
          text: shareText,
          url: joinUrl
        })
      } else {
        // Fallback: copy full message to clipboard
        const fullMessage = `${shareText}\n\nClick to join: ${joinUrl}`
        await copyToClipboard(fullMessage)
        setShowSuccess(true)
        setTimeout(() => setShowSuccess(false), 3000)
      }
    } catch {
      // Error already handled by useShare hook
    }
  }
  
  return (
    <div className={`relative ${className}`}>
      <Button
        onClick={handleShare}
        disabled={disabled || isSharing}
        variant="secondary"
        size="sm"
        className="flex items-center space-x-2"
        aria-label="Share room code with other players"
      >
        {isSharing ? (
          <>
            <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
            <span>Sharing...</span>
          </>
        ) : (
          <>
            <span className="text-lg">📤</span>
            <span>Share</span>
          </>
        )}
      </Button>
      
      {/* Success message for clipboard fallback */}
      {showSuccess && (
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-2 bg-green-100 border border-green-300 rounded-lg text-sm text-green-700 whitespace-nowrap z-10">
          ✅ Copied invite link to clipboard!
        </div>
      )}
      
      {/* Error message */}
      {error && (
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-2 bg-red-100 border border-red-300 rounded-lg text-sm text-red-700 whitespace-nowrap z-10">
          ❌ {error}
        </div>
      )}
    </div>
  )
}