// Haptic Feedback Hook for Mobile Devices

import { useCallback, useState } from 'react'
import { useReducedMotion } from '../utils/reduced-motion'

// Type declarations for haptic APIs
interface TapticEngine {
  impact(options: { style: 'light' | 'medium' | 'heavy' }): Promise<void>
  notification(options: { type: 'success' | 'warning' | 'error' }): Promise<void>
  selection(): Promise<void>
}

interface NavigatorWithVibrate extends Navigator {
  vibrate?: (pattern: number | number[]) => boolean
}

interface WindowWithHaptics extends Window {
  TapticEngine?: TapticEngine
  DeviceMotionEvent?: typeof DeviceMotionEvent
}

declare const window: WindowWithHaptics
declare const navigator: NavigatorWithVibrate

export interface HapticOptions {
  type?: 'light' | 'medium' | 'heavy' | 'selection' | 'notification' | 'impact'
  intensity?: number // 0-1 for custom intensity
  duration?: number // in milliseconds for custom vibration
  pattern?: number[] // for complex vibration patterns
}

export interface UseHapticFeedbackReturn {
  // Core haptic functions
  triggerHaptic: (options?: HapticOptions) => Promise<boolean>
  triggerLight: () => Promise<boolean>
  triggerMedium: () => Promise<boolean>
  triggerHeavy: () => Promise<boolean>
  triggerSelection: () => Promise<boolean>
  triggerNotification: (type?: 'success' | 'warning' | 'error') => Promise<boolean>
  
  // Tile-specific haptic feedback
  tileSelect: () => Promise<boolean>
  tileDeselect: () => Promise<boolean>
  tileFlip: () => Promise<boolean>
  tilePass: () => Promise<boolean>
  tileError: () => Promise<boolean>
  
  // Game-specific haptic feedback
  charlestonPass: () => Promise<boolean>
  jokerFound: () => Promise<boolean>
  patternComplete: () => Promise<boolean>
  gameWin: () => Promise<boolean>
  
  // Utility functions
  isSupported: boolean
  isEnabled: boolean
  setEnabled: (enabled: boolean) => void
}

export function useHapticFeedback(): UseHapticFeedbackReturn {
  const isReducedMotion = useReducedMotion()
  const [isEnabled, setIsEnabled] = useState(true)
  
  // Feature detection for haptic feedback support
  const isSupported = typeof navigator !== 'undefined' && (
    'vibrate' in navigator || 
    'hapticFeedback' in navigator ||
    window.DeviceMotionEvent !== undefined
  )
  
  // Check for iOS haptic feedback support
  const hasIOSHaptics = typeof window.TapticEngine !== 'undefined' ||
    typeof navigator.vibrate === 'function'
  
  // Check for Android haptic feedback support
  const hasAndroidHaptics = 'vibrate' in navigator
  
  const triggerHaptic = useCallback(async (options: HapticOptions = {}): Promise<boolean> => {
    // Don't trigger haptics if reduced motion is preferred or haptics are disabled
    if (isReducedMotion || !isEnabled || !isSupported) {
      return false
    }
    
    const { type = 'light', intensity = 0.5, duration = 10, pattern } = options
    
    try {
      // iOS Haptic Feedback (if available)
      if (hasIOSHaptics && window.TapticEngine) {
        const engine = window.TapticEngine
        switch (type) {
          case 'light':
            await engine.impact({ style: 'light' })
            return true
          case 'medium':
            await engine.impact({ style: 'medium' })
            return true
          case 'heavy':
            await engine.impact({ style: 'heavy' })
            return true
          case 'selection':
            await engine.selection()
            return true
          case 'notification':
            await engine.notification({ type: 'success' })
            return true
          default:
            await engine.impact({ style: 'light' })
            return true
        }
      }
      
      // Web Vibration API (Android and some other devices)
      if (hasAndroidHaptics && navigator.vibrate) {
        if (pattern) {
          navigator.vibrate(pattern)
          return true
        }
        
        // Convert type to vibration pattern
        let vibrationPattern: number[]
        switch (type) {
          case 'light':
            vibrationPattern = [10]
            break
          case 'medium':
            vibrationPattern = [25]
            break
          case 'heavy':
            vibrationPattern = [50]
            break
          case 'selection':
            vibrationPattern = [5]
            break
          case 'notification':
            vibrationPattern = [100, 50, 100]
            break
          case 'impact':
            vibrationPattern = [Math.round(duration * intensity)]
            break
          default:
            vibrationPattern = [10]
        }
        
        navigator.vibrate(vibrationPattern)
        return true
      }
      
      // Fallback: no haptic feedback available
      return false
      
    } catch (error) {
      console.warn('Haptic feedback failed:', error)
      return false
    }
  }, [isReducedMotion, isEnabled, isSupported, hasIOSHaptics, hasAndroidHaptics])
  
  // Convenience methods for common haptic types
  const triggerLight = useCallback(() => triggerHaptic({ type: 'light' }), [triggerHaptic])
  const triggerMedium = useCallback(() => triggerHaptic({ type: 'medium' }), [triggerHaptic])
  const triggerHeavy = useCallback(() => triggerHaptic({ type: 'heavy' }), [triggerHaptic])
  const triggerSelection = useCallback(() => triggerHaptic({ type: 'selection' }), [triggerHaptic])
  
  const triggerNotification = useCallback((notificationType: 'success' | 'warning' | 'error' = 'success') => {
    // For iOS haptics, use the notification type directly
    if (window.TapticEngine) {
      return triggerHaptic({ type: 'notification' })
    }
    
    // For vibration API, use patterns
    switch (notificationType) {
      case 'success':
        return triggerHaptic({ type: 'notification', pattern: [100, 50, 100] })
      case 'warning':
        return triggerHaptic({ type: 'notification', pattern: [50, 50, 50] })
      case 'error':
        return triggerHaptic({ type: 'notification', pattern: [100, 50, 100, 50, 100] })
      default:
        return triggerHaptic({ type: 'notification' })
    }
  }, [triggerHaptic])
  
  // Tile-specific haptic feedback
  const tileSelect = useCallback(() => 
    triggerHaptic({ type: 'selection' })
  , [triggerHaptic])
  
  const tileDeselect = useCallback(() => 
    triggerHaptic({ type: 'light' })
  , [triggerHaptic])
  
  const tileFlip = useCallback(() => 
    triggerHaptic({ type: 'medium' })
  , [triggerHaptic])
  
  const tilePass = useCallback(() => 
    triggerHaptic({ type: 'medium', pattern: [20, 10, 20] })
  , [triggerHaptic])
  
  const tileError = useCallback(() => 
    triggerHaptic({ type: 'heavy', pattern: [100, 50, 100] })
  , [triggerHaptic])
  
  // Game-specific haptic feedback
  const charlestonPass = useCallback(() => 
    triggerHaptic({ type: 'medium', pattern: [30, 20, 30, 20, 30] })
  , [triggerHaptic])
  
  const jokerFound = useCallback(() => 
    triggerHaptic({ type: 'notification', pattern: [50, 25, 50, 25, 100] })
  , [triggerHaptic])
  
  const patternComplete = useCallback(() => 
    triggerHaptic({ type: 'notification', pattern: [100, 50, 150, 50, 200] })
  , [triggerHaptic])
  
  const gameWin = useCallback(() => 
    triggerHaptic({ type: 'notification', pattern: [200, 100, 200, 100, 300] })
  , [triggerHaptic])
  
  const setEnabledCallback = useCallback((enabled: boolean) => {
    setIsEnabled(enabled)
  }, [])
  
  return {
    triggerHaptic,
    triggerLight,
    triggerMedium,
    triggerHeavy,
    triggerSelection,
    triggerNotification,
    tileSelect,
    tileDeselect,
    tileFlip,
    tilePass,
    tileError,
    charlestonPass,
    jokerFound,
    patternComplete,
    gameWin,
    isSupported,
    isEnabled,
    setEnabled: setEnabledCallback
  }
}

// Utility hook for testing haptic feedback in development
export function useHapticTester() {
  const haptics = useHapticFeedback()
  
  const testAllHaptics = useCallback(async () => {
    const tests = [
      { name: 'Light', fn: haptics.triggerLight },
      { name: 'Medium', fn: haptics.triggerMedium },
      { name: 'Heavy', fn: haptics.triggerHeavy },
      { name: 'Selection', fn: haptics.triggerSelection },
      { name: 'Tile Select', fn: haptics.tileSelect },
      { name: 'Tile Flip', fn: haptics.tileFlip },
      { name: 'Joker Found', fn: haptics.jokerFound }
    ]
    
    for (const test of tests) {
      console.log(`Testing haptic: ${test.name}`)
      await test.fn()
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }, [haptics])
  
  return {
    ...haptics,
    testAllHaptics
  }
}

// Context-aware haptic feedback hook
export function useContextualHaptics(context: 'tile' | 'charleston' | 'game' | 'navigation') {
  const haptics = useHapticFeedback()
  
  const contextualFeedback = useCallback((action: string) => {
    switch (context) {
      case 'tile':
        switch (action) {
          case 'select': return haptics.tileSelect()
          case 'deselect': return haptics.tileDeselect()
          case 'flip': return haptics.tileFlip()
          case 'error': return haptics.tileError()
          default: return haptics.triggerLight()
        }
      case 'charleston':
        switch (action) {
          case 'pass': return haptics.charlestonPass()
          case 'keep': return haptics.triggerMedium()
          default: return haptics.triggerLight()
        }
      case 'game':
        switch (action) {
          case 'win': return haptics.gameWin()
          case 'pattern-complete': return haptics.patternComplete()
          case 'joker': return haptics.jokerFound()
          default: return haptics.triggerMedium()
        }
      case 'navigation':
        switch (action) {
          case 'navigate': return haptics.triggerSelection()
          case 'back': return haptics.triggerLight()
          case 'confirm': return haptics.triggerMedium()
          default: return haptics.triggerLight()
        }
      default:
        return haptics.triggerLight()
    }
  }, [context, haptics])
  
  return {
    ...haptics,
    contextualFeedback
  }
}