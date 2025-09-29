// Pull-to-Refresh utilities - Configuration presets and responsive config hook
// Separated for React Fast Refresh compatibility

import { useMemo } from 'react'

// Preset configurations for different use cases
export const PullToRefreshPresets = {
  // Standard mobile configuration
  mobile: {
    threshold: 80,
    maxDistance: 120,
    enableHaptics: true,
    enableAnimation: true,
    sensitivity: 1.0,
    resistanceAfterThreshold: 0.4
  },

  // Desktop/mouse configuration
  desktop: {
    threshold: 60,
    maxDistance: 100,
    enableHaptics: false,
    enableAnimation: true,
    sensitivity: 0.8,
    resistanceAfterThreshold: 0.6
  },

  // Accessibility-friendly configuration
  accessible: {
    threshold: 100,
    maxDistance: 150,
    enableHaptics: false,
    enableAnimation: false,
    sensitivity: 0.6,
    resistanceAfterThreshold: 0.3
  },

  // Performance-optimized configuration
  performance: {
    threshold: 70,
    maxDistance: 110,
    enableHaptics: true,
    enableAnimation: false,
    sensitivity: 1.2,
    resistanceAfterThreshold: 0.5
  }
} as const

/**
 * Hook for responsive pull-to-refresh configuration
 * Automatically selects appropriate config based on device capabilities
 */
export const useResponsivePullToRefreshConfig = () => {
  return useMemo(() => {
    // Detect device type
    const isMobile = 'ontouchstart' in window
    const hasHaptics = 'vibrate' in navigator || 'hapticEngine' in window
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    // Base configuration
    let baseConfig = isMobile ? PullToRefreshPresets.mobile : PullToRefreshPresets.desktop

    // Accessibility adjustments
    if (prefersReducedMotion) {
      baseConfig = {
        ...baseConfig,
        enableAnimation: false,
        sensitivity: 0.8
      }
    }

    // Haptics availability
    if (!hasHaptics) {
      baseConfig = {
        ...baseConfig,
        enableHaptics: false
      }
    }

    return baseConfig
  }, [])
}