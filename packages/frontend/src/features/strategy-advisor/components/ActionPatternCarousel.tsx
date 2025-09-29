// Action Pattern Carousel - Mobile-first pattern navigation with swipe gestures
// Replaces technical analysis with action-first traffic light priority system

import React, { useMemo, useCallback, useRef, useEffect } from 'react'
import { Card } from '../../../ui-components/Card'
import { Button } from '../../../ui-components/Button'
import { LoadingSpinner } from '../../../ui-components/LoadingSpinner'
import { PatternPriorityIndicator, PatternPriorityBadge } from './PatternPriorityIndicator'
import { PatternPreviewModal, usePreviewModalKeyboard } from './PatternPreviewModal'
import type {
  ActionPatternCarouselProps,
  ActionPatternData
} from '../types/strategy-advisor.types'
import { useCarouselSwipe } from '../hooks/useCarouselSwipe'
import { usePatternSwitching } from '../hooks/usePatternSwitching'
import { useHapticFeedback } from '../hooks/useHapticFeedback'
import { useUrgencyDetection } from '../hooks/useUrgencyDetection'
import {
  calculateCarouselTransform,
  getVisiblePatternIndices,
  generateCarouselAnnouncement,
  getKeyboardInstructions,
  ANIMATION_CONFIG
} from '../utils/pattern-carousel-utils'

/**
 * Action-first pattern carousel with mobile swipe navigation
 * Focuses on clear actions rather than technical pattern analysis
 */
export const ActionPatternCarousel: React.FC<ActionPatternCarouselProps> = ({
  patterns,
  currentPatternId,
  onPatternSwitch,
  onPatternPreview,
  urgencyLevel,
  showPreviewModal = true,
  enableHapticFeedback = true,
  className = ''
}) => {
  // Container refs for measurements
  const containerRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  // State for responsive card width
  const [cardWidth, setCardWidth] = React.useState(320)

  // Current pattern index
  const currentIndex = useMemo(() => {
    if (!currentPatternId) return 0
    const index = patterns.findIndex(p => p.id === currentPatternId)
    return index >= 0 ? index : 0
  }, [patterns, currentPatternId])

  // Pattern switching hook
  const {
    switchToPattern,
    openPreview,
    closePreview,
    confirmSwitch,
    previewData,
    isPreviewOpen,
    isLoading: isSwitching,
    canSwitchToPattern
  } = usePatternSwitching({
    availablePatterns: patterns,
    enableHapticFeedback,
    onSwitchComplete: onPatternSwitch,
    onSwitchError: (error) => console.error('Pattern switch failed:', error)
  })

  // Urgency detection for adaptive behavior
  const { uiTreatment } = useUrgencyDetection()

  // Haptic feedback
  const { triggerSelectionFeedback, isSupported: hapticSupported } = useHapticFeedback()

  // Handle pattern change from swipe
  const handlePatternChange = useCallback((index: number, pattern: ActionPatternData) => {
    // Trigger haptic feedback for navigation
    if (enableHapticFeedback && hapticSupported) {
      triggerSelectionFeedback()
    }

    // Announce pattern change for accessibility
    const announcement = generateCarouselAnnouncement(index, patterns.length, pattern)

    // Update screen reader announcement
    const announcer = document.getElementById('carousel-announcer')
    if (announcer) {
      announcer.textContent = announcement
    }
  }, [enableHapticFeedback, hapticSupported, triggerSelectionFeedback, patterns.length])

  // Phase 4: Enhanced carousel swipe hook with long-press support
  const {
    swipeState,
    carouselState,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    onKeyDown,
    goToPattern,
    longPressState,
    isShowingHint,
    isShowingDetails
  } = useCarouselSwipe({
    patterns,
    initialIndex: currentIndex,
    cardWidth,
    enableHapticFeedback,
    enableLongPress: true,
    onPatternChange: handlePatternChange,
    onSwipeStart: () => {
      // Optional: Add visual feedback for swipe start
    },
    onSwipeEnd: () => {
      // Optional: Add visual feedback for swipe end
    },
    onPatternLongPress: (patternId: string) => {
      // Long press detected on pattern
      handlePatternPreview(patternId)
    },
    onPatternDetails: (patternId: string) => {
      // Show detailed pattern information
      handlePatternPreview(patternId)
    }
  })

  // Measure card width for responsive layout
  useEffect(() => {
    const measureCardWidth = () => {
      if (cardRef.current) {
        const width = cardRef.current.offsetWidth
        setCardWidth(width || 320)
      }
    }

    measureCardWidth()

    const resizeObserver = new ResizeObserver(measureCardWidth)
    if (cardRef.current) {
      resizeObserver.observe(cardRef.current)
    }

    return () => resizeObserver.disconnect()
  }, [])

  // Handle pattern selection
  const handlePatternSelect = useCallback(async (patternId: string) => {
    if (patternId === currentPatternId || isSwitching) return

    // Check if pattern can be switched to
    if (!canSwitchToPattern(patternId)) {
      console.warn('Pattern switch not allowed in current state')
      return
    }

    try {
      await switchToPattern(patternId)
    } catch (error) {
      console.error('Pattern switch failed:', error)
    }
  }, [currentPatternId, isSwitching, canSwitchToPattern, switchToPattern])

  // Handle pattern preview
  const handlePatternPreview = useCallback((patternId: string) => {
    if (patternId === currentPatternId) return

    onPatternPreview(patternId)

    if (showPreviewModal) {
      openPreview(patternId)
    }
  }, [currentPatternId, onPatternPreview, showPreviewModal, openPreview])

  // Keyboard modal handlers
  usePreviewModalKeyboard(
    isPreviewOpen,
    confirmSwitch,
    closePreview
  )

  // Calculate transform for smooth animation
  const transform = useMemo(() => {
    const dragOffset = swipeState.isDragging ? swipeState.deltaX : 0
    return calculateCarouselTransform(carouselState.currentIndex, cardWidth, 16, dragOffset)
  }, [swipeState.isDragging, swipeState.deltaX, carouselState.currentIndex, cardWidth])

  // Get visible patterns for performance optimization
  const visibleIndices = useMemo(() => {
    return getVisiblePatternIndices(carouselState.currentIndex, patterns.length, 5)
  }, [carouselState.currentIndex, patterns.length])

  // Empty state
  if (patterns.length === 0) {
    return (
      <Card variant="elevated" className={`p-6 text-center ${className}`}>
        <div className="text-gray-500">
          <div className="text-4xl mb-2">🎯</div>
          <h3 className="text-lg font-semibold mb-2">No Patterns Available</h3>
          <p className="text-sm">
            Pattern recommendations will appear here once your hand is analyzed.
          </p>
        </div>
      </Card>
    )
  }

  // Single pattern state
  if (patterns.length === 1) {
    const pattern = patterns[0]
    return (
      <Card variant="elevated" className={`${className}`}>
        <SinglePatternCard
          pattern={pattern}
          isSelected={pattern.id === currentPatternId}
          urgencyLevel={urgencyLevel}
          onSelect={() => handlePatternSelect(pattern.id)}
          onPreview={() => handlePatternPreview(pattern.id)}
          isSwitching={isSwitching}
          showPreview={showPreviewModal}
        />
      </Card>
    )
  }

  return (
    <div className={`relative ${className}`}>
      {/* Accessibility announcer */}
      <div
        id="carousel-announcer"
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
      />

      {/* Carousel navigation header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-gray-900">
            Pattern Options
          </h3>
          <PatternPriorityBadge
            priority={patterns[carouselState.currentIndex]?.priorityInfo.priority || 'backup'}
            completionPercentage={patterns[carouselState.currentIndex]?.priorityInfo.completionPercentage || 0}
            urgencyLevel={urgencyLevel}
            size="sm"
            animated={uiTreatment.animationIntensity !== 'subtle'}
          />
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>
            {carouselState.currentIndex + 1} / {patterns.length}
          </span>

          {/* Navigation arrows for desktop */}
          <div className="hidden sm:flex gap-1">
            <button
              onClick={() => goToPattern(Math.max(0, carouselState.currentIndex - 1))}
              disabled={!carouselState.canSwipeLeft}
              className="p-1 rounded text-gray-400 hover:text-gray-600 disabled:opacity-50"
              aria-label="Previous pattern"
            >
              ◀
            </button>
            <button
              onClick={() => goToPattern(Math.min(patterns.length - 1, carouselState.currentIndex + 1))}
              disabled={!carouselState.canSwipeRight}
              className="p-1 rounded text-gray-400 hover:text-gray-600 disabled:opacity-50"
              aria-label="Next pattern"
            >
              ▶
            </button>
          </div>
        </div>
      </div>

      {/* Phase 4: Enhanced carousel container with long-press visual feedback */}
      <div
        ref={containerRef}
        className={`relative overflow-hidden ${
          isShowingHint ? 'ring-2 ring-blue-200 ring-opacity-50' : ''
        } ${
          isShowingDetails ? 'ring-2 ring-blue-400' : ''
        }`}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onKeyDown={onKeyDown}
        tabIndex={0}
        role="listbox"
        aria-label="Pattern selection carousel (tap and hold for details)"
        aria-describedby="carousel-instructions"
      >
        {/* Carousel track */}
        <div
          className="flex gap-4 transition-transform duration-300 ease-out"
          style={{
            transform,
            transitionDuration: swipeState.isDragging ? '0ms' : `${ANIMATION_CONFIG.TRANSITION_DURATION}ms`
          }}
        >
          {patterns.map((pattern, index) => (
            <div
              key={pattern.id}
              ref={index === 0 ? cardRef : undefined}
              className="flex-shrink-0 w-80 max-w-[90vw]"
            >
              {visibleIndices.includes(index) ? (
                <PatternCard
                  pattern={pattern}
                  isSelected={pattern.id === currentPatternId}
                  isCurrent={index === carouselState.currentIndex}
                  urgencyLevel={urgencyLevel}
                  onSelect={() => handlePatternSelect(pattern.id)}
                  onPreview={() => handlePatternPreview(pattern.id)}
                  isSwitching={isSwitching && pattern.id === currentPatternId}
                  showPreview={showPreviewModal}
                  canSwitch={canSwitchToPattern(pattern.id)}
                />
              ) : (
                <div className="h-64 bg-gray-100 rounded-lg animate-pulse" />
              )}
            </div>
          ))}
        </div>

        {/* Phase 4: Enhanced swipe indicators with long-press feedback */}
        <div className="flex justify-center mt-4 gap-2">
          {patterns.map((_, index) => (
            <button
              key={index}
              onClick={() => goToPattern(index)}
              className={`w-2 h-2 rounded-full transition-all duration-200 ${
                index === carouselState.currentIndex
                  ? isShowingDetails
                    ? 'bg-blue-600 w-4 h-4'
                    : isShowingHint
                    ? 'bg-blue-500 w-3 h-3'
                    : 'bg-blue-600'
                  : 'bg-gray-300 hover:bg-gray-400'
              }`}
              aria-label={`Go to pattern ${index + 1}`}
            />
          ))}
        </div>

        {/* Phase 4: Long-press progress indicator */}
        {longPressState.isPressed && longPressState.progress > 0 && (
          <div className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white shadow-lg flex items-center justify-center">
            <div className="relative w-6 h-6">
              <svg className="w-6 h-6 transform -rotate-90" viewBox="0 0 24 24">
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="none"
                  className="text-gray-200"
                />
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="none"
                  strokeDasharray={`${longPressState.progress * 63} 63`}
                  className={`transition-all duration-100 ${
                    longPressState.stage === 'hint'
                      ? 'text-blue-400'
                      : longPressState.stage === 'details'
                      ? 'text-blue-600'
                      : 'text-green-500'
                  }`}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className={`w-1 h-1 rounded-full ${
                  longPressState.stage === 'hint'
                    ? 'bg-blue-400'
                    : longPressState.stage === 'details'
                    ? 'bg-blue-600'
                    : 'bg-green-500'
                }`} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Phase 4: Enhanced keyboard instructions with long-press info */}
      <div id="carousel-instructions" className="sr-only">
        {getKeyboardInstructions()}
        Tap and hold on a pattern card for detailed information.
      </div>

      {/* Preview Modal */}
      {showPreviewModal && (
        <PatternPreviewModal
          isOpen={isPreviewOpen}
          onClose={closePreview}
          previewData={previewData}
          onConfirmSwitch={confirmSwitch}
          onCancel={closePreview}
        />
      )}
    </div>
  )
}

// Individual pattern card component
const PatternCard: React.FC<{
  pattern: ActionPatternData
  isSelected: boolean
  isCurrent: boolean
  urgencyLevel: ActionPatternCarouselProps['urgencyLevel']
  onSelect: () => void
  onPreview: () => void
  isSwitching: boolean
  showPreview: boolean
  canSwitch: boolean
}> = ({
  pattern,
  isSelected,
  isCurrent,
  urgencyLevel,
  onSelect,
  onPreview,
  isSwitching,
  showPreview,
  canSwitch
}) => {
  return (
    <Card
      variant="elevated"
      className={`
        h-64 relative transition-all duration-300
        ${isCurrent ? 'scale-105 shadow-lg' : 'scale-95 opacity-80'}
        ${isSelected ? 'ring-2 ring-blue-500' : ''}
        ${!canSwitch ? 'opacity-50' : ''}
      `}
    >
      <div className="p-4 h-full flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <PatternPriorityIndicator
            priority={pattern.priorityInfo.priority}
            completionPercentage={pattern.priorityInfo.completionPercentage}
            urgencyLevel={urgencyLevel}
            size="md"
            animated={isCurrent}
          />
          <div className="text-right">
            <div className="text-xs text-gray-500">Section {pattern.section}</div>
            <div className="text-sm font-medium text-gray-700">#{pattern.line}</div>
          </div>
        </div>

        {/* Pattern name */}
        <h4 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">
          {pattern.name}
        </h4>

        {/* Action message */}
        <p className="text-sm text-gray-700 mb-3 flex-grow">
          {pattern.priorityInfo.actionMessage}
        </p>

        {/* Action needed */}
        <div className="mb-4">
          <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">
            {pattern.actionNeeded}
          </span>
          {pattern.tilesNeeded.length > 0 && (
            <div className="text-xs text-gray-500 mt-1">
              Need: {pattern.tilesNeeded.slice(0, 3).join(', ')}
              {pattern.tilesNeeded.length > 3 && '...'}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <Button
            variant={pattern.priorityInfo.priority === 'pursue' ? 'primary' : 'outline'}
            size="sm"
            onClick={onSelect}
            disabled={!canSwitch || isSwitching}
            className="flex-1"
          >
            {isSwitching ? (
              <>
                <LoadingSpinner size="sm" color="white" />
                Switching...
              </>
            ) : isSelected ? (
              'Current'
            ) : (
              'Switch to this'
            )}
          </Button>

          {showPreview && !isSelected && (
            <Button
              variant="outline"
              size="sm"
              onClick={onPreview}
              disabled={isSwitching}
            >
              Preview
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
}

// Single pattern display component
const SinglePatternCard: React.FC<{
  pattern: ActionPatternData
  isSelected: boolean
  urgencyLevel: ActionPatternCarouselProps['urgencyLevel']
  onSelect: () => void
  onPreview: () => void
  isSwitching: boolean
  showPreview: boolean
}> = ({
  pattern,
  isSelected,
  urgencyLevel,
  onSelect,
  onPreview,
  isSwitching,
  showPreview
}) => {
  return (
    <div className="p-6">
      <div className="flex items-start justify-between mb-4">
        <PatternPriorityIndicator
          priority={pattern.priorityInfo.priority}
          completionPercentage={pattern.priorityInfo.completionPercentage}
          urgencyLevel={urgencyLevel}
          size="lg"
          animated={true}
        />
        <div className="text-right">
          <div className="text-sm text-gray-500">Section {pattern.section}</div>
          <div className="text-lg font-bold text-gray-700">#{pattern.line}</div>
        </div>
      </div>

      <h3 className="text-2xl font-bold text-gray-900 mb-3">
        {pattern.name}
      </h3>

      <p className="text-gray-700 mb-4">
        {pattern.priorityInfo.actionMessage}
      </p>

      <div className="mb-6">
        <span className="text-sm font-medium text-gray-600 uppercase tracking-wide">
          {pattern.actionNeeded}
        </span>
        {pattern.tilesNeeded.length > 0 && (
          <div className="text-sm text-gray-600 mt-1">
            Need: {pattern.tilesNeeded.join(', ')}
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <Button
          variant={pattern.priorityInfo.priority === 'pursue' ? 'primary' : 'outline'}
          size="md"
          onClick={onSelect}
          disabled={isSwitching}
          className="flex-1"
        >
          {isSwitching ? (
            <>
              <LoadingSpinner size="sm" color="white" />
              Switching...
            </>
          ) : isSelected ? (
            'Currently Selected'
          ) : (
            'Select This Pattern'
          )}
        </Button>

        {showPreview && !isSelected && (
          <Button
            variant="outline"
            size="md"
            onClick={onPreview}
            disabled={isSwitching}
          >
            Preview Switch
          </Button>
        )}
      </div>
    </div>
  )
}