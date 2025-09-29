// Pull-to-Refresh Wrapper - Container component for main game view gesture handling
// Provides smooth pull-to-refresh functionality with visual feedback and haptics

import React, { useMemo } from 'react'
import type { PullToRefreshWrapperProps } from '../types/strategy-advisor.types'
import { usePullToRefresh } from '../hooks/usePullToRefresh'

/**
 * Wrapper component that adds pull-to-refresh functionality to its children
 * Optimized for mobile gameplay with smooth animations and haptic feedback
 */
export const PullToRefreshWrapper: React.FC<PullToRefreshWrapperProps> = ({
  children,
  onRefresh,
  config = {},
  className = '',
  disabled = false
}) => {
  // Pull-to-refresh hook
  const {
    state,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    getVisualState
  } = usePullToRefresh({
    onRefresh,
    config,
    disabled
  })

  // Visual state for feedback
  const visualState = getVisualState()

  // Transform for pull distance
  const pullTransform = useMemo(() => {
    if (!state.isPulling && !state.isRefreshing) {
      return 'translateY(0px)'
    }

    // Smooth transform based on pull distance
    const translateY = state.isRefreshing ? 80 : state.pullDistance
    return `translateY(${translateY}px)`
  }, [state.isPulling, state.isRefreshing, state.pullDistance])

  // Opacity for visual feedback
  const pullOpacity = useMemo(() => {
    if (state.isRefreshing) return 1
    if (!state.isPulling) return 0
    return Math.min(state.pullProgress, 1)
  }, [state.isPulling, state.isRefreshing, state.pullProgress])

  // Container styles
  const containerStyle = useMemo(() => ({
    transform: pullTransform,
    transition: state.isPulling ? 'none' : 'transform 0.3s ease-out'
  }), [pullTransform, state.isPulling])

  // Feedback indicator styles
  const feedbackStyle = useMemo(() => ({
    opacity: pullOpacity,
    transform: `translateY(${state.isRefreshing ? '0px' : '-100%'})`,
    transition: state.isPulling ? 'opacity 0.1s ease-out' : 'all 0.3s ease-out'
  }), [pullOpacity, state.isRefreshing, state.isPulling])

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
    >
      {/* Pull-to-refresh indicator */}
      <div
        className="absolute top-0 left-0 right-0 z-10 flex items-center justify-center bg-gradient-to-b from-blue-50 to-transparent"
        style={{
          height: '80px',
          ...feedbackStyle
        }}
      >
        <div className="flex items-center space-x-3 px-4 py-2 bg-white rounded-full shadow-md">
          {/* Icon with rotation animation */}
          <div
            className={`text-2xl ${
              state.isRefreshing
                ? 'animate-spin'
                : state.isReady
                ? 'animate-bounce'
                : ''
            }`}
          >
            {visualState.icon}
          </div>

          {/* Message */}
          <span className="text-sm font-medium text-gray-700">
            {visualState.message}
          </span>

          {/* Progress indicator */}
          {(state.isPulling || state.isRefreshing) && (
            <div className="w-8 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-150 ${
                  state.isReady
                    ? 'bg-green-500'
                    : state.isRefreshing
                    ? 'bg-blue-500 animate-pulse'
                    : 'bg-blue-400'
                }`}
                style={{
                  width: `${state.isRefreshing ? 100 : visualState.progress * 100}%`
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Main content with transform */}
      <div style={containerStyle}>
        {children}
      </div>

      {/* Overlay for better visual feedback during refresh */}
      {state.isRefreshing && (
        <div className="absolute inset-0 bg-black bg-opacity-5 pointer-events-none z-5" />
      )}
    </div>
  )
}

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

// Hook for responsive pull-to-refresh configuration
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