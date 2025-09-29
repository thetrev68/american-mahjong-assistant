/**
 * Touch-Optimized Tile Component
 * Enhanced tile component with mobile-first touch interactions
 */

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { AnimatedTile, type AnimatedTileProps } from '../tiles/AnimatedTile'

interface TouchOptimizedTileProps extends AnimatedTileProps {
  // Touch-specific props
  onLongPress?: () => void
  longPressDelay?: number
  vibrationEnabled?: boolean
  doubleTapEnabled?: boolean
  onDoubleTap?: () => void
  
  // Mobile UX enhancements
  touchFeedback?: 'haptic' | 'visual' | 'both' | 'none'
  minTouchTarget?: number // Minimum touch target size in px
  touchPadding?: number // Additional invisible touch area
  
  // Gesture support
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeUp?: () => void
  onSwipeDown?: () => void
  swipeThreshold?: number
}

interface TouchState {
  startX: number
  startY: number
  startTime: number
  moved: boolean
  longPressTriggered: boolean
}

export const TouchOptimizedTile: React.FC<TouchOptimizedTileProps> = ({
  onLongPress,
  longPressDelay = 500,
  vibrationEnabled = true,
  doubleTapEnabled = false,
  onDoubleTap,
  touchFeedback = 'both',
  minTouchTarget = 44, // iOS/Android minimum
  touchPadding: _touchPadding,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  swipeThreshold = 50,
  onClick,
  className = '',
  tile,
  size = 'md',
  ...tileProps
}) => {
  const [isPressed, setIsPressed] = useState(false)
  const [lastTap, setLastTap] = useState<number>(0)
  const touchState = useRef<TouchState | null>(null)
  const longPressTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const tileRef = useRef<HTMLDivElement>(null)

  // Haptic feedback utility
  const triggerHaptic = useCallback((type: 'light' | 'medium' | 'heavy' = 'light') => {
    if (!vibrationEnabled || typeof window === 'undefined') return
    
    // Modern vibration API
    if ('vibrate' in navigator) {
      const patterns = {
        light: [10],
        medium: [25],
        heavy: [50]
      }
      navigator.vibrate(patterns[type])
    }

    // iOS haptic feedback (if available)
    if ('haptic' in window) {
      (window as unknown as { haptic: { impact: (type: string) => void } }).haptic.impact(type)
    }
  }, [vibrationEnabled])

  // Visual feedback for touch
  const showVisualFeedback = useCallback(() => {
    if (touchFeedback === 'visual' || touchFeedback === 'both') {
      setIsPressed(true)
    }
    if (touchFeedback === 'haptic' || touchFeedback === 'both') {
      triggerHaptic('light')
    }
  }, [touchFeedback, triggerHaptic])

  const hideVisualFeedback = useCallback(() => {
    setIsPressed(false)
  }, [])

  // Handle touch start
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault() // Prevent default touch behaviors
    
    const touch = e.touches[0]
    if (!touch) return

    touchState.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      startTime: Date.now(),
      moved: false,
      longPressTriggered: false
    }

    showVisualFeedback()

    // Set up long press timer
    if (onLongPress) {
      longPressTimeout.current = setTimeout(() => {
        if (touchState.current && !touchState.current.moved) {
          touchState.current.longPressTriggered = true
          triggerHaptic('medium')
          onLongPress()
        }
      }, longPressDelay)
    }
  }, [onLongPress, longPressDelay, showVisualFeedback, triggerHaptic])

  // Handle touch move
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0]
    if (!touch || !touchState.current) return

    const deltaX = touch.clientX - touchState.current.startX
    const deltaY = touch.clientY - touchState.current.startY
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

    // Mark as moved if threshold exceeded
    if (distance > 10) {
      touchState.current.moved = true
      hideVisualFeedback()
      
      // Clear long press timer
      if (longPressTimeout.current) {
        if (longPressTimeout.current) clearTimeout(longPressTimeout.current)
        longPressTimeout.current = undefined
      }
    }
  }, [hideVisualFeedback])

  // Handle touch end
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const touch = e.changedTouches[0]
    if (!touch || !touchState.current) return

    const { startX, startY, startTime, moved, longPressTriggered } = touchState.current

    // Clear long press timer
    if (longPressTimeout.current) {
      if (longPressTimeout.current) clearTimeout(longPressTimeout.current)
      longPressTimeout.current = undefined
    }

    hideVisualFeedback()

    // Don't trigger clicks if long press was triggered or if moved too much
    if (longPressTriggered || moved) {
      touchState.current = null
      return
    }

    const deltaX = touch.clientX - startX
    const deltaY = touch.clientY - startY
    const deltaTime = Date.now() - startTime
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

    // Handle swipe gestures
    if (distance > swipeThreshold && deltaTime < 300) {
      const absX = Math.abs(deltaX)
      const absY = Math.abs(deltaY)

      if (absX > absY) {
        // Horizontal swipe
        if (deltaX > 0 && onSwipeRight) {
          triggerHaptic('light')
          onSwipeRight()
          touchState.current = null
          return
        } else if (deltaX < 0 && onSwipeLeft) {
          triggerHaptic('light')
          onSwipeLeft()
          touchState.current = null
          return
        }
      } else {
        // Vertical swipe
        if (deltaY < 0 && onSwipeUp) {
          triggerHaptic('light')
          onSwipeUp()
          touchState.current = null
          return
        } else if (deltaY > 0 && onSwipeDown) {
          triggerHaptic('light')
          onSwipeDown()
          touchState.current = null
          return
        }
      }
    }

    // Handle double tap
    if (doubleTapEnabled && onDoubleTap) {
      const now = Date.now()
      if (now - lastTap < 300) {
        triggerHaptic('medium')
        onDoubleTap()
        setLastTap(0) // Reset to prevent triple tap
        touchState.current = null
        return
      }
      setLastTap(now)
    }

    // Handle regular tap
    if (onClick && distance < 20 && deltaTime < 300) {
      triggerHaptic('light')
      onClick(tile)
    }

    touchState.current = null
  }, [
    onClick, onDoubleTap, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown,
    doubleTapEnabled, swipeThreshold, triggerHaptic, hideVisualFeedback, lastTap, tile
  ])

  // Handle touch cancel
  const handleTouchCancel = useCallback(() => {
    if (longPressTimeout.current) {
      if (longPressTimeout.current) clearTimeout(longPressTimeout.current)
      longPressTimeout.current = undefined
    }
    hideVisualFeedback()
    touchState.current = null
  }, [hideVisualFeedback])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (longPressTimeout.current) {
        if (longPressTimeout.current) clearTimeout(longPressTimeout.current)
      }
    }
  }, [])

  // Calculate proper touch target size
  const touchTargetSize = Math.max(minTouchTarget, 40) // Ensure minimum accessibility size
  const actualTileSize = size === 'sm' ? 32 :
                        size === 'md' ? 48 :
                        size === 'lg' ? 64 : 48

  const needsPadding = touchTargetSize > actualTileSize
  const paddingSize = needsPadding ? (touchTargetSize - actualTileSize) / 2 : 0

  return (
    <div
      ref={tileRef}
      className={`
        relative inline-block touch-none select-none
        ${needsPadding ? 'cursor-pointer' : ''}
      `}
      style={{
        padding: needsPadding ? `${paddingSize}px` : undefined,
        minWidth: touchTargetSize,
        minHeight: touchTargetSize,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
      
      // Accessibility
      role="button"
      tabIndex={0}
      aria-label={`Tile ${tile.suit} ${tile.value}`}
      
      // Prevent context menu on long press
      onContextMenu={(e) => e.preventDefault()}
    >
      <AnimatedTile
        tile={tile}
        size={size}
        {...tileProps}
        className={`
          transition-all duration-150 ease-out
          ${isPressed ? 'scale-95 brightness-110' : 'scale-100'}
          ${className}
        `}
        // Disable AnimatedTile's click handler since we handle it
        onClick={undefined}
      />
      
      {/* Visual touch feedback overlay */}
      {isPressed && touchFeedback !== 'none' && (
        <div className="
          absolute inset-0 bg-white/30 rounded-lg pointer-events-none
          animate-pulse
        " />
      )}
      
      {/* Invisible touch area expansion */}
      {needsPadding && (
        <div className="
          absolute inset-0 
          rounded-lg pointer-events-none
          ring-2 ring-blue-400/0 transition-all duration-200
          focus-within:ring-blue-400/50
        " />
      )}
    </div>
  )
}
