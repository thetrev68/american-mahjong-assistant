/**
 * Focus Manager
 * Comprehensive focus management for complex UI interactions
 */

import React, { useRef, useEffect, useCallback, type ReactNode } from 'react'
import { useAccessibilityContext } from './useAccessibilityContext'

interface FocusManagerProps {
  children: ReactNode
  autoFocus?: boolean
  returnFocus?: boolean
  trap?: boolean
  className?: string
  onEscape?: () => void
  onFocusEnter?: () => void
  onFocusLeave?: () => void
}

export const FocusManager: React.FC<FocusManagerProps> = ({
  children,
  autoFocus = false,
  returnFocus = true,
  trap = false,
  className = '',
  onEscape,
  onFocusEnter,
  onFocusLeave
}) => {
  const { trapFocus, announceToScreenReader } = useAccessibilityContext()
  const containerRef = useRef<HTMLDivElement>(null)
  const previousActiveElement = useRef<HTMLElement | null>(null)
  const trapCleanup = useRef<(() => void) | null>(null)

  // Store previous focus for restoration
  useEffect(() => {
    if (returnFocus) {
      previousActiveElement.current = document.activeElement as HTMLElement
    }

    return () => {
      if (returnFocus && previousActiveElement.current) {
        previousActiveElement.current.focus()
      }
    }
  }, [returnFocus])

  // Auto focus on mount
  useEffect(() => {
    if (autoFocus && containerRef.current) {
      const focusableElement = containerRef.current.querySelector(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])'
      ) as HTMLElement
      
      if (focusableElement) {
        focusableElement.focus()
        onFocusEnter?.()
        announceToScreenReader('Focus entered interactive area')
      }
    }
  }, [autoFocus, onFocusEnter, announceToScreenReader])

  // Set up focus trap
  useEffect(() => {
    if (trap && containerRef.current) {
      trapCleanup.current = trapFocus(containerRef.current)
    }

    return () => {
      trapCleanup.current?.()
    }
  }, [trap, trapFocus])

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    switch (e.key) {
      case 'Escape':
        if (onEscape) {
          e.preventDefault()
          e.stopPropagation()
          onEscape()
          announceToScreenReader('Escaped from interactive area')
        }
        break
        
      case 'Tab':
        // Let the trap focus handle tab navigation
        break
    }
  }, [onEscape, announceToScreenReader])

  // Focus event handlers
  const handleFocusIn = useCallback((e: FocusEvent) => {
    if (containerRef.current?.contains(e.target as Node)) {
      onFocusEnter?.()
    }
  }, [onFocusEnter])

  const handleFocusOut = useCallback((e: FocusEvent) => {
    if (containerRef.current && !containerRef.current.contains(e.relatedTarget as Node)) {
      onFocusLeave?.()
    }
  }, [onFocusLeave])

  // Add event listeners
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.addEventListener('keydown', handleKeyDown)
    container.addEventListener('focusin', handleFocusIn)
    container.addEventListener('focusout', handleFocusOut)

    return () => {
      container.removeEventListener('keydown', handleKeyDown)
      container.removeEventListener('focusin', handleFocusIn)
      container.removeEventListener('focusout', handleFocusOut)
    }
  }, [handleKeyDown, handleFocusIn, handleFocusOut])

  return (
    <div
      ref={containerRef}
      className={`focus-manager ${className}`}
      tabIndex={-1}
    >
      {children}
    </div>
  )
}

// Roving tabindex manager for lists and grids
interface RovingTabIndexProps {
  children: ReactNode
  orientation?: 'horizontal' | 'vertical' | 'both'
  wrap?: boolean
  defaultIndex?: number
  onActiveIndexChange?: (index: number) => void
  className?: string
}

export const RovingTabIndex: React.FC<RovingTabIndexProps> = ({
  children,
  orientation = 'both',
  wrap = true,
  defaultIndex = 0,
  onActiveIndexChange,
  className = ''
}) => {
  const { handleArrowNavigation, announceToScreenReader } = useAccessibilityContext()
  const containerRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = React.useState(defaultIndex)

  // Update tabindex for all focusable elements
  useEffect(() => {
    if (!containerRef.current) return

    const focusableElements = containerRef.current.querySelectorAll(
      '[role="button"], button, [href], input, select, textarea, [tabindex]'
    ) as NodeListOf<HTMLElement>

    focusableElements.forEach((element, index) => {
      element.tabIndex = index === activeIndex ? 0 : -1
    })
  }, [activeIndex])

  // Handle active index changes
  const handleIndexChange = useCallback((newIndex: number) => {
    setActiveIndex(newIndex)
    onActiveIndexChange?.(newIndex)
    announceToScreenReader(`Item ${newIndex + 1} selected`)
  }, [onActiveIndexChange, announceToScreenReader])

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!containerRef.current) return

    const focusableElements = containerRef.current.querySelectorAll(
      '[role="button"], button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ) as NodeListOf<HTMLElement>

    handleArrowNavigation(
      e,
      focusableElements,
      activeIndex,
      handleIndexChange,
      { wrap, orientation }
    )
  }, [activeIndex, handleIndexChange, handleArrowNavigation, wrap, orientation])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.addEventListener('keydown', handleKeyDown)
    return () => container.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return (
    <div
      ref={containerRef}
      className={`roving-tabindex ${className}`}
      role="group"
      onFocus={(e) => {
        // If focus lands on the container, move it to the active item
        if (e.target === containerRef.current) {
          const activeElement = containerRef.current?.querySelector('[tabindex="0"]') as HTMLElement
          activeElement?.focus()
        }
      }}
    >
      {children}
    </div>
  )
}
