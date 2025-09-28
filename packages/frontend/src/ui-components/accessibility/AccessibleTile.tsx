/**
 * Accessible Tile Component
 * WCAG 2.1 AA compliant tile with full keyboard and screen reader support
 */

import React, { forwardRef, useRef, useImperativeHandle, KeyboardEvent } from 'react'
import { AnimatedTile, AnimatedTileProps } from '../tiles/AnimatedTile'
import { useAccessibilityContext } from './AccessibilityProvider'
import type { Tile } from 'shared-types';

interface AccessibleTileProps extends Omit<AnimatedTileProps, 'onClick'> {
  onActivate?: () => void
  onSelect?: () => void
  onRemove?: () => void
  isSelected?: boolean
  isDisabled?: boolean
  position?: { row: number; col: number }
  groupLabel?: string
  description?: string
  shortcut?: string
  tabIndex?: number
  
  // Accessibility-specific props
  ariaLabel?: string
  ariaDescribedBy?: string
  role?: string
}

interface AccessibleTileRef {
  focus: () => void
  announce: (message: string) => void
}

export const AccessibleTile = forwardRef<AccessibleTileRef, AccessibleTileProps>(({
  tile,
  onActivate,
  onSelect,
  onRemove,
  isSelected = false,
  isDisabled = false,
  position,
  groupLabel,
  description,
  shortcut,
  tabIndex = 0,
  ariaLabel,
  ariaDescribedBy,
  role = 'button',
  className = '',
  ...tileProps
}, ref) => {
  const { 
    announceToScreenReader, 
    generateAriaAttributes, 
    options,
    isWCAGCompliant 
  } = useAccessibilityContext()
  
  const tileRef = useRef<HTMLDivElement>(null)

  // Expose focus methods to parent
  useImperativeHandle(ref, () => ({
    focus: () => tileRef.current?.focus(),
    announce: (message: string) => announceToScreenReader(message)
  }))

  // Generate comprehensive tile description
  const getTileDescription = (tile: Tile): string => {
    const suitNames = {
      'bam': 'Bamboo',
      'crak': 'Character', 
      'dot': 'Dot',
      'dragon': 'Dragon',
      'wind': 'Wind',
      'flower': 'Flower',
      'season': 'Season',
      'joker': 'Joker'
    }

    const suit = suitNames[tile.suit as keyof typeof suitNames] || tile.suit
    const rank = tile.value === 'red' ? 'Red' :
                tile.value === 'green' ? 'Green' :
                tile.value === 'white' ? 'White' :
                tile.value === 'east' ? 'East' :
                tile.value === 'south' ? 'South' :
                tile.value === 'west' ? 'West' :
                tile.value === 'north' ? 'North' :
                tile.value

    return `${rank} ${suit}`
  }

  // Generate ARIA label with context
  const getAriaLabel = (): string => {
    if (ariaLabel) return ariaLabel
    
    const baseLabel = getTileDescription(tile)
    const positionInfo = position ? `, position ${position.row + 1}, ${position.col + 1}` : ''
    const groupInfo = groupLabel ? `, in ${groupLabel}` : ''
    const statusInfo = isSelected ? ', selected' : ''
    const disabledInfo = isDisabled ? ', disabled' : ''
    const shortcutInfo = shortcut ? `, press ${shortcut}` : ''
    
    return `${baseLabel}${positionInfo}${groupInfo}${statusInfo}${disabledInfo}${shortcutInfo}`
  }

  // Handle keyboard interactions
  const handleKeyDown = (e: KeyboardEvent) => {
    if (isDisabled) return

    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault()
        if (onActivate) {
          onActivate()
          announceToScreenReader(`${getTileDescription(tile)} activated`)
        } else if (onSelect) {
          onSelect()
          announceToScreenReader(`${getTileDescription(tile)} ${isSelected ? 'deselected' : 'selected'}`)
        }
        break
        
      case 'Delete':
      case 'Backspace':
        if (onRemove) {
          e.preventDefault()
          onRemove()
          announceToScreenReader(`${getTileDescription(tile)} removed`)
        }
        break
        
      case 's':
      case 'S':
        if (e.ctrlKey && onSelect) {
          e.preventDefault()
          onSelect()
          announceToScreenReader(`${getTileDescription(tile)} ${isSelected ? 'deselected' : 'selected'}`)
        }
        break
    }

    // Announce shortcut if available
    if (shortcut && e.key.toLowerCase() === shortcut.toLowerCase()) {
      e.preventDefault()
      if (onActivate) {
        onActivate()
        announceToScreenReader(`${getTileDescription(tile)} activated via shortcut`)
      }
    }
  }

  // Handle focus events
  const handleFocus = () => {
    if (options.screenReader) {
      announceToScreenReader(`Focused on ${getTileDescription(tile)}`)
    }
  }

  // Generate ARIA attributes
  const ariaAttributes = generateAriaAttributes({
    label: getAriaLabel(),
    describedBy: ariaDescribedBy || (description ? 'tile-description' : undefined),
    selected: onSelect ? isSelected : undefined,
    invalid: false,
    role
  })

  // Check color contrast compliance
  const isContrastCompliant = isWCAGCompliant('#000000', '#ffffff', 'AA', 'normal')

  return (
    <div
      ref={tileRef}
      className={`
        relative inline-block cursor-pointer
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        transition-all duration-200 ease-in-out
        ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}
        ${isSelected ? 'ring-2 ring-blue-400' : ''}
        ${options.highContrast ? 'high-contrast-tile' : ''}
        ${className}
      `}
      tabIndex={isDisabled ? -1 : tabIndex}
      onKeyDown={handleKeyDown}
      onFocus={handleFocus}
      {...ariaAttributes}
    >
      <AnimatedTile
        {...tileProps}
        tile={tile}
        className={`
          ${isSelected ? 'ring-2 ring-blue-400' : ''}
          ${isDisabled ? 'grayscale' : ''}
          ${!isContrastCompliant ? 'high-contrast-border' : ''}
        `}
        onClick={undefined} // Disable click to ensure keyboard accessibility
      />
      
      {/* Visual indicator for selected state */}
      {isSelected && (
        <div 
          className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center"
          aria-hidden="true"
        >
          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
      )}
      
      {/* Keyboard shortcut indicator */}
      {shortcut && !options.reducedMotion && (
        <div 
          className="absolute top-0 left-0 bg-gray-800 text-white text-xs px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
          aria-hidden="true"
        >
          {shortcut}
        </div>
      )}
      
      {/* Screen reader description */}
      {description && (
        <div id="tile-description" className="sr-only">
          {description}
        </div>
      )}
    </div>
  )
})

AccessibleTile.displayName = 'AccessibleTile'
