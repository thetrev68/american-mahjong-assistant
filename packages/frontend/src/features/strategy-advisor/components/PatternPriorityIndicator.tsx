// Pattern Priority Indicator - Traffic light priority system with urgency awareness
// Provides clear visual priority indication with accessibility and motion considerations

import React, { useMemo } from 'react'
import type {
  PatternPriorityIndicatorProps
} from '../types/strategy-advisor.types'
import { getPriorityEmoji, getPriorityColorScheme } from '../utils/pattern-carousel-utils'

/**
 * Traffic light indicator for pattern priorities
 * Adapts to urgency levels and provides clear visual hierarchy
 */
export const PatternPriorityIndicator: React.FC<PatternPriorityIndicatorProps> = ({
  priority,
  completionPercentage,
  urgencyLevel,
  size = 'md',
  showLabel = true,
  animated = true,
  className = ''
}) => {
  // Size configuration
  const sizeConfig = useMemo(() => {
    switch (size) {
      case 'sm':
        return {
          container: 'w-6 h-6',
          emoji: 'text-xs',
          label: 'text-xs',
          badge: 'text-xs px-1.5 py-0.5'
        }
      case 'lg':
        return {
          container: 'w-12 h-12',
          emoji: 'text-2xl',
          label: 'text-base',
          badge: 'text-sm px-3 py-1'
        }
      case 'md':
      default:
        return {
          container: 'w-8 h-8',
          emoji: 'text-base',
          label: 'text-sm',
          badge: 'text-sm px-2 py-1'
        }
    }
  }, [size])

  // Priority-based styling
  const colorScheme = getPriorityColorScheme(priority)
  const priorityEmoji = getPriorityEmoji(priority)

  // Urgency-aware styling adjustments
  const urgencyAdjustments = useMemo(() => {
    if (urgencyLevel === 'critical') {
      return {
        containerExtra: animated ? 'animate-pulse' : '',
        borderExtra: 'ring-2 ring-red-500 ring-opacity-50',
        textExtra: 'font-bold'
      }
    }

    if (urgencyLevel === 'high' && priority === 'pursue') {
      return {
        containerExtra: animated ? 'animate-bounce' : '',
        borderExtra: 'ring-1 ring-green-400',
        textExtra: 'font-semibold'
      }
    }

    return {
      containerExtra: '',
      borderExtra: '',
      textExtra: ''
    }
  }, [urgencyLevel, priority, animated])

  // Priority label text
  const priorityLabel = useMemo(() => {
    switch (priority) {
      case 'pursue':
        return completionPercentage >= 90 ? 'ALMOST THERE!' : 'PURSUE'
      case 'backup':
        return 'BACKUP'
      case 'risky':
        return urgencyLevel === 'critical' ? 'TOO RISKY' : 'RISKY'
      case 'dead':
        return 'SWITCH AWAY'
      default:
        return 'UNKNOWN'
    }
  }, [priority, completionPercentage, urgencyLevel])

  // Accessibility attributes
  const accessibilityProps = useMemo(() => {
    const completionText = `${Math.round(completionPercentage)}% complete`
    const priorityText = priorityLabel.toLowerCase()

    return {
      'aria-label': `Pattern priority: ${priorityText}, ${completionText}`,
      'role': 'status',
      'aria-live': 'polite' as const
    }
  }, [priorityLabel, completionPercentage])

  // Animation classes
  const animationClasses = useMemo(() => {
    if (!animated) return ''

    const baseTransition = 'transition-all duration-300 ease-in-out'

    return `${baseTransition} ${urgencyAdjustments.containerExtra}`
  }, [animated, urgencyAdjustments.containerExtra])

  return (
    <div className={`
      flex items-center gap-2
      ${className}
    `}>
      {/* Priority Icon */}
      <div className={`
        ${sizeConfig.container}
        ${colorScheme.bg}
        ${colorScheme.border}
        ${urgencyAdjustments.borderExtra}
        border rounded-full
        flex items-center justify-center
        ${animationClasses}
      `}>
        <span
          className={`
            ${sizeConfig.emoji}
            ${urgencyAdjustments.textExtra}
          `}
          aria-hidden="true"
        >
          {priorityEmoji}
        </span>
      </div>

      {/* Priority Label */}
      {showLabel && (
        <div className="flex flex-col">
          <span className={`
            ${sizeConfig.label}
            ${colorScheme.text}
            ${urgencyAdjustments.textExtra}
            font-medium leading-tight
          `}>
            {priorityLabel}
          </span>

          {/* Completion percentage for pursue/backup patterns */}
          {(priority === 'pursue' || priority === 'backup') && (
            <span className={`
              text-xs text-gray-600 leading-tight
            `}>
              {Math.round(completionPercentage)}% ready
            </span>
          )}

          {/* Risk warning for risky patterns */}
          {priority === 'risky' && urgencyLevel === 'critical' && (
            <span className="text-xs text-red-600 font-medium leading-tight">
              High urgency!
            </span>
          )}
        </div>
      )}

      {/* Urgency Badge (only for critical situations) */}
      {urgencyLevel === 'critical' && priority === 'pursue' && (
        <span className={`
          ${sizeConfig.badge}
          bg-red-600 text-white font-bold rounded
          ${animated ? 'animate-pulse' : ''}
        `}>
          NOW!
        </span>
      )}

      {/* Screen reader content */}
      <span className="sr-only" {...accessibilityProps}>
        {priorityLabel} priority pattern, {Math.round(completionPercentage)}% complete
        {urgencyLevel === 'critical' && ', high urgency situation'}
      </span>
    </div>
  )
}

/**
 * Compact version for use in tight spaces
 */
export const CompactPatternPriorityIndicator: React.FC<Omit<PatternPriorityIndicatorProps, 'size' | 'showLabel'>> = (props) => {
  return (
    <PatternPriorityIndicator
      {...props}
      size="sm"
      showLabel={false}
    />
  )
}

/**
 * Badge version for inline use
 */
export const PatternPriorityBadge: React.FC<PatternPriorityIndicatorProps> = ({
  priority,
  completionPercentage,
  urgencyLevel,
  size = 'md',
  animated = false,
  className = ''
}) => {
  const colorScheme = getPriorityColorScheme(priority)
  const priorityEmoji = getPriorityEmoji(priority)

  const priorityText = useMemo(() => {
    switch (priority) {
      case 'pursue':
        return completionPercentage >= 90 ? 'ALMOST THERE' : 'PURSUE'
      case 'backup':
        return 'BACKUP'
      case 'risky':
        return 'RISKY'
      case 'dead':
        return 'DEAD'
      default:
        return 'UNKNOWN'
    }
  }, [priority, completionPercentage])

  const sizeClasses = useMemo(() => {
    switch (size) {
      case 'sm':
        return 'text-xs px-2 py-1'
      case 'lg':
        return 'text-base px-4 py-2'
      case 'md':
      default:
        return 'text-sm px-3 py-1.5'
    }
  }, [size])

  return (
    <span className={`
      ${sizeClasses}
      ${colorScheme.bg}
      ${colorScheme.border}
      ${colorScheme.text}
      border rounded-full font-medium
      inline-flex items-center gap-1
      ${animated && urgencyLevel === 'critical' ? 'animate-pulse' : ''}
      ${className}
    `}>
      <span aria-hidden="true">{priorityEmoji}</span>
      {priorityText}
    </span>
  )
}

/**
 * Progress indicator variant showing completion visually
 */
export const PatternPriorityProgress: React.FC<PatternPriorityIndicatorProps> = ({
  priority,
  completionPercentage,
  urgencyLevel,
  size = 'md',
  animated = true,
  className = ''
}) => {
  const colorScheme = getPriorityColorScheme(priority)
  const priorityEmoji = getPriorityEmoji(priority)

  const progressBarHeight = useMemo(() => {
    switch (size) {
      case 'sm': return 'h-1'
      case 'lg': return 'h-3'
      case 'md':
      default: return 'h-2'
    }
  }, [size])

  return (
    <div className={`
      flex items-center gap-3
      ${className}
    `}>
      {/* Priority indicator */}
      <span className={`
        text-lg
        ${urgencyLevel === 'critical' && animated ? 'animate-pulse' : ''}
      `}>
        {priorityEmoji}
      </span>

      {/* Progress bar */}
      <div className="flex-1 min-w-0">
        <div className={`
          w-full ${progressBarHeight} rounded-full
          ${colorScheme.bg}
          overflow-hidden
        `}>
          <div
            className={`
              ${progressBarHeight} rounded-full
              ${colorScheme.button}
              transition-all duration-500 ease-out
              ${animated ? 'animate-pulse' : ''}
            `}
            style={{ width: `${Math.min(100, Math.max(0, completionPercentage))}%` }}
          />
        </div>

        {/* Percentage text */}
        <span className={`
          text-xs ${colorScheme.text} font-medium
        `}>
          {Math.round(completionPercentage)}%
        </span>
      </div>
    </div>
  )
}