// StrategyModeSelector - Dropdown selector for strategy modes
// Provides intuitive mode switching with descriptions and visual indicators

import React, { useState, useRef, useCallback, useEffect } from 'react'
import type {
  StrategyModeSelectorProps,
  StrategyMode
} from '../types/strategy-advisor.types'
import { strategyModeService } from '../services/strategy-mode.service'

// Mode display configuration
const MODE_DISPLAY_CONFIG = {
  flexible: {
    label: 'Flexible',
    icon: '🎯',
    color: 'blue',
    shortDesc: 'Balanced approach',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200'
  },
  quickWin: {
    label: 'Quick Win',
    icon: '⚡',
    color: 'orange',
    shortDesc: 'Fast-paced play',
    bgColor: 'bg-orange-50',
    textColor: 'text-orange-700',
    borderColor: 'border-orange-200'
  },
  defensive: {
    label: 'Defensive',
    icon: '🛡️',
    color: 'green',
    shortDesc: 'Conservative play',
    bgColor: 'bg-green-50',
    textColor: 'text-green-700',
    borderColor: 'border-green-200'
  },
  highScore: {
    label: 'High Score',
    icon: '💎',
    color: 'purple',
    shortDesc: 'Point-maximizing',
    bgColor: 'bg-purple-50',
    textColor: 'text-purple-700',
    borderColor: 'border-purple-200'
  }
} as const

/**
 * StrategyModeSelector - Dropdown component for selecting strategy modes
 * Features compact/expanded views, descriptions, and keyboard navigation
 */
export const StrategyModeSelector: React.FC<StrategyModeSelectorProps> = ({
  currentMode,
  availableModes,
  onModeChange,
  showDescriptions = false,
  compact = false,
  disabled = false,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  // Get current mode configuration
  const currentModeConfig = MODE_DISPLAY_CONFIG[currentMode]
  const modeDescriptions = availableModes.reduce((acc, mode) => {
    acc[mode] = strategyModeService.getModeDescription(mode)
    return acc
  }, {} as Record<StrategyMode, string>)

  // Handle mode selection
  const handleModeSelect = useCallback((mode: StrategyMode) => {
    if (disabled || mode === currentMode) return

    onModeChange(mode)
    setIsOpen(false)
    setHighlightedIndex(-1)

    // Haptic feedback if available
    if ('vibrate' in navigator) {
      navigator.vibrate(50)
    }

    // Return focus to trigger
    triggerRef.current?.focus()
  }, [disabled, currentMode, onModeChange])

  // Keyboard navigation
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (disabled) return

    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault()
        if (isOpen && highlightedIndex >= 0) {
          handleModeSelect(availableModes[highlightedIndex])
        } else {
          setIsOpen(!isOpen)
        }
        break

      case 'Escape':
        event.preventDefault()
        setIsOpen(false)
        setHighlightedIndex(-1)
        triggerRef.current?.focus()
        break

      case 'ArrowDown':
        event.preventDefault()
        if (!isOpen) {
          setIsOpen(true)
          setHighlightedIndex(0)
        } else {
          setHighlightedIndex(prev =>
            prev < availableModes.length - 1 ? prev + 1 : 0
          )
        }
        break

      case 'ArrowUp':
        event.preventDefault()
        if (!isOpen) {
          setIsOpen(true)
          setHighlightedIndex(availableModes.length - 1)
        } else {
          setHighlightedIndex(prev =>
            prev > 0 ? prev - 1 : availableModes.length - 1
          )
        }
        break

      case 'Home':
        if (isOpen) {
          event.preventDefault()
          setHighlightedIndex(0)
        }
        break

      case 'End':
        if (isOpen) {
          event.preventDefault()
          setHighlightedIndex(availableModes.length - 1)
        }
        break
    }
  }, [disabled, isOpen, highlightedIndex, availableModes, handleModeSelect])

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setHighlightedIndex(-1)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Scroll highlighted item into view
  useEffect(() => {
    if (isOpen && highlightedIndex >= 0) {
      const dropdown = dropdownRef.current
      const highlightedItem = dropdown?.querySelector(`[data-index="${highlightedIndex}"]`) as HTMLElement

      if (highlightedItem) {
        highlightedItem.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [isOpen, highlightedIndex])

  if (compact) {
    return (
      <div className={`relative ${className}`} ref={dropdownRef}>
        <button
          ref={triggerRef}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          className={`
            inline-flex items-center space-x-1 px-2 py-1 rounded text-xs font-medium
            transition-all duration-200
            ${currentModeConfig.bgColor} ${currentModeConfig.textColor} ${currentModeConfig.borderColor}
            ${disabled
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50'
            }
          `}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-label={`Current strategy mode: ${currentModeConfig.label}`}
        >
          <span>{currentModeConfig.icon}</span>
          <span>{currentModeConfig.label}</span>
          <svg
            className={`w-3 h-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-50">
            <div className="py-1" role="listbox">
              {availableModes.map((mode, index) => {
                const config = MODE_DISPLAY_CONFIG[mode]
                const isHighlighted = highlightedIndex === index
                const isCurrent = mode === currentMode

                return (
                  <button
                    key={mode}
                    data-index={index}
                    onClick={() => handleModeSelect(mode)}
                    className={`
                      w-full text-left px-3 py-2 text-sm flex items-center space-x-2
                      transition-colors duration-150
                      ${isHighlighted ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'}
                      ${isCurrent ? 'font-medium' : ''}
                    `}
                    role="option"
                    aria-selected={isCurrent}
                  >
                    <span>{config.icon}</span>
                    <div className="flex-1">
                      <div>{config.label}</div>
                      {showDescriptions && (
                        <div className="text-xs text-gray-500 truncate">
                          {config.shortDesc}
                        </div>
                      )}
                    </div>
                    {isCurrent && (
                      <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    )
  }

  // Full-size version with descriptions
  return (
    <div className={`space-y-3 ${className}`}>
      <label className="block text-sm font-medium text-gray-700">
        Strategy Mode
      </label>

      <div className="grid grid-cols-1 gap-2">
        {availableModes.map(mode => {
          const config = MODE_DISPLAY_CONFIG[mode]
          const isSelected = mode === currentMode
          const description = modeDescriptions[mode]

          return (
            <button
              key={mode}
              onClick={() => handleModeSelect(mode)}
              disabled={disabled}
              className={`
                p-3 rounded-lg border text-left transition-all duration-200
                ${isSelected
                  ? `${config.bgColor} ${config.textColor} ${config.borderColor} border-2`
                  : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
                }
                ${disabled
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50'
                }
              `}
            >
              <div className="flex items-start space-x-3">
                <span className="text-xl">{config.icon}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{config.label}</h4>
                    {isSelected && (
                      <svg className="w-5 h-5 text-current" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <p className="text-sm mt-1 opacity-90">
                    {config.shortDesc}
                  </p>
                  {showDescriptions && description && (
                    <p className="text-xs mt-2 opacity-75 leading-relaxed">
                      {description}
                    </p>
                  )}
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Mode comparison hint */}
      {availableModes.length > 2 && (
        <div className="text-xs text-gray-500 text-center">
          Switch modes anytime based on game situation
        </div>
      )}
    </div>
  )
}

// Quick mode toggle for frequent switching
export const QuickModeToggle: React.FC<{
  currentMode: StrategyMode
  onModeChange: (mode: StrategyMode) => void
  modes: [StrategyMode, StrategyMode]
  disabled?: boolean
  className?: string
}> = ({ currentMode, onModeChange, modes, disabled = false, className = '' }) => {
  const [mode1, mode2] = modes
  const config1 = MODE_DISPLAY_CONFIG[mode1]
  const config2 = MODE_DISPLAY_CONFIG[mode2]

  const handleToggle = useCallback(() => {
    if (disabled) return

    const nextMode = currentMode === mode1 ? mode2 : mode1
    onModeChange(nextMode)

    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(30)
    }
  }, [disabled, currentMode, mode1, mode2, onModeChange])

  return (
    <button
      onClick={handleToggle}
      disabled={disabled}
      className={`
        relative inline-flex items-center h-8 w-16 rounded-full transition-colors duration-300 ease-in-out
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${currentMode === mode1 ? config1.bgColor : config2.bgColor}
        ${className}
      `}
      aria-label={`Toggle between ${config1.label} and ${config2.label} modes`}
    >
      <span
        className={`
          inline-flex items-center justify-center w-6 h-6 rounded-full text-xs
          transition-transform duration-300 ease-in-out
          ${currentMode === mode1 ? 'translate-x-1' : 'translate-x-9'}
          bg-white shadow-lg
        `}
      >
        {currentMode === mode1 ? config1.icon : config2.icon}
      </span>

      {/* Labels */}
      <span className={`absolute left-1 text-xs font-medium transition-opacity ${currentMode === mode1 ? 'opacity-100' : 'opacity-50'}`}>
        {config1.icon}
      </span>
      <span className={`absolute right-1 text-xs font-medium transition-opacity ${currentMode === mode2 ? 'opacity-100' : 'opacity-50'}`}>
        {config2.icon}
      </span>
    </button>
  )
}

// Mode indicator badge
export const ModeIndicatorBadge: React.FC<{
  mode: StrategyMode
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  className?: string
}> = ({ mode, size = 'md', showLabel = true, className = '' }) => {
  const config = MODE_DISPLAY_CONFIG[mode]

  const sizeClasses = {
    sm: 'px-1 py-0.5 text-xs',
    md: 'px-2 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base'
  }

  return (
    <span
      className={`
        inline-flex items-center space-x-1 rounded-full font-medium
        ${config.bgColor} ${config.textColor} ${config.borderColor}
        ${sizeClasses[size]}
        ${className}
      `}
    >
      <span>{config.icon}</span>
      {showLabel && <span>{config.label}</span>}
    </span>
  )
}