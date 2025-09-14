/**
 * Accessibility Hook
 * Comprehensive WCAG 2.1 AA compliance utilities
 */

import React, { useState, useEffect, useRef, useCallback } from 'react'

interface AccessibilityOptions {
  reducedMotion?: boolean
  highContrast?: boolean
  screenReader?: boolean
  keyboardOnly?: boolean
  fontSize?: 'small' | 'medium' | 'large' | 'extra-large'
}

interface AriaLiveOptions {
  priority?: 'polite' | 'assertive' | 'off'
  atomic?: boolean
  relevant?: 'additions' | 'removals' | 'text' | 'all'
}

export const useAccessibility = () => {
  const [options, setOptions] = useState<AccessibilityOptions>({
    reducedMotion: false,
    highContrast: false,
    screenReader: false,
    keyboardOnly: false,
    fontSize: 'medium'
  })

  const announcementRef = useRef<HTMLDivElement>(null)

  // Detect user preferences from system
  useEffect(() => {
    const detectPreferences = () => {
      setOptions(prev => ({
        ...prev,
        reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        highContrast: window.matchMedia('(prefers-contrast: high)').matches,
        screenReader: navigator.userAgent.includes('NVDA') || 
                     navigator.userAgent.includes('JAWS') ||
                     window.speechSynthesis?.speaking === false
      }))
    }

    detectPreferences()

    // Listen for preference changes
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const highContrastQuery = window.matchMedia('(prefers-contrast: high)')
    
    const handleReducedMotionChange = (e: MediaQueryListEvent) => {
      setOptions(prev => ({ ...prev, reducedMotion: e.matches }))
    }
    
    const handleHighContrastChange = (e: MediaQueryListEvent) => {
      setOptions(prev => ({ ...prev, highContrast: e.matches }))
    }

    reducedMotionQuery.addListener(handleReducedMotionChange)
    highContrastQuery.addListener(handleHighContrastChange)

    return () => {
      reducedMotionQuery.removeListener(handleReducedMotionChange)
      highContrastQuery.removeListener(handleHighContrastChange)
    }
  }, [])

  // Screen reader announcement
  const announceToScreenReader = useCallback((
    message: string, 
    options: AriaLiveOptions = {}
  ) => {
    if (!announcementRef.current) return

    const { priority = 'polite', atomic = true, relevant = 'all' } = options
    
    const announcement = document.createElement('div')
    announcement.setAttribute('aria-live', priority)
    announcement.setAttribute('aria-atomic', atomic.toString())
    announcement.setAttribute('aria-relevant', relevant)
    announcement.setAttribute('role', priority === 'assertive' ? 'alert' : 'status')
    announcement.className = 'sr-only'
    announcement.textContent = message

    announcementRef.current.appendChild(announcement)

    // Clean up after announcement
    setTimeout(() => {
      if (announcementRef.current?.contains(announcement)) {
        announcementRef.current.removeChild(announcement)
      }
    }, 1000)
  }, [])

  // Keyboard navigation utilities
  const handleArrowNavigation = useCallback((
    e: KeyboardEvent,
    items: NodeListOf<HTMLElement> | HTMLElement[],
    currentIndex: number,
    onIndexChange: (newIndex: number) => void,
    options: { wrap?: boolean; orientation?: 'horizontal' | 'vertical' | 'both' } = {}
  ) => {
    const { wrap = true, orientation = 'both' } = options
    const itemsArray = Array.from(items)
    const maxIndex = itemsArray.length - 1

    let newIndex = currentIndex

    switch (e.key) {
      case 'ArrowUp':
        if (orientation === 'horizontal') return
        e.preventDefault()
        newIndex = currentIndex > 0 ? currentIndex - 1 : wrap ? maxIndex : 0
        break
      
      case 'ArrowDown':
        if (orientation === 'horizontal') return
        e.preventDefault()
        newIndex = currentIndex < maxIndex ? currentIndex + 1 : wrap ? 0 : maxIndex
        break
        
      case 'ArrowLeft':
        if (orientation === 'vertical') return
        e.preventDefault()
        newIndex = currentIndex > 0 ? currentIndex - 1 : wrap ? maxIndex : 0
        break
        
      case 'ArrowRight':
        if (orientation === 'vertical') return
        e.preventDefault()
        newIndex = currentIndex < maxIndex ? currentIndex + 1 : wrap ? 0 : maxIndex
        break
        
      case 'Home':
        e.preventDefault()
        newIndex = 0
        break
        
      case 'End':
        e.preventDefault()
        newIndex = maxIndex
        break
        
      default:
        return
    }

    if (newIndex !== currentIndex) {
      onIndexChange(newIndex)
      itemsArray[newIndex]?.focus()
    }
  }, [])

  // Focus management
  const trapFocus = useCallback((
    container: HTMLElement,
    firstFocusableSelector: string = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  ) => {
    const focusableElements = container.querySelectorAll(firstFocusableSelector)
    const firstElement = focusableElements[0] as HTMLElement
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault()
          lastElement?.focus()
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault()
          firstElement?.focus()
        }
      }
    }

    container.addEventListener('keydown', handleKeyDown)
    firstElement?.focus()

    return () => {
      container.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  // Color contrast utilities
  const getContrastRatio = useCallback((color1: string, color2: string): number => {
    const getRGB = (color: string) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = color
      ctx.fillRect(0, 0, 1, 1)
      const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data
      return [r / 255, g / 255, b / 255]
    }

    const getLuminance = (rgb: number[]) => {
      const [r, g, b] = rgb.map(c => 
        c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
      )
      return 0.2126 * r + 0.7152 * g + 0.0722 * b
    }

    const rgb1 = getRGB(color1)
    const rgb2 = getRGB(color2)
    const lum1 = getLuminance(rgb1)
    const lum2 = getLuminance(rgb2)
    
    const brightest = Math.max(lum1, lum2)
    const darkest = Math.min(lum1, lum2)
    
    return (brightest + 0.05) / (darkest + 0.05)
  }, [])

  // WCAG compliance checkers
  const isWCAGCompliant = useCallback((
    foreground: string, 
    background: string, 
    level: 'AA' | 'AAA' = 'AA',
    size: 'normal' | 'large' = 'normal'
  ): boolean => {
    const ratio = getContrastRatio(foreground, background)
    
    if (level === 'AAA') {
      return size === 'large' ? ratio >= 4.5 : ratio >= 7
    }
    
    return size === 'large' ? ratio >= 3 : ratio >= 4.5
  }, [getContrastRatio])

  // Generate ARIA attributes
  const generateAriaAttributes = useCallback((config: {
    label?: string
    labelledBy?: string
    describedBy?: string
    expanded?: boolean
    selected?: boolean
    checked?: boolean
    invalid?: boolean
    required?: boolean
    live?: 'polite' | 'assertive' | 'off'
    role?: string
    level?: number
  }) => {
    const attrs: Record<string, string> = {}
    
    if (config.label) attrs['aria-label'] = config.label
    if (config.labelledBy) attrs['aria-labelledby'] = config.labelledBy
    if (config.describedBy) attrs['aria-describedby'] = config.describedBy
    if (config.expanded !== undefined) attrs['aria-expanded'] = config.expanded.toString()
    if (config.selected !== undefined) attrs['aria-selected'] = config.selected.toString()
    if (config.checked !== undefined) attrs['aria-checked'] = config.checked.toString()
    if (config.invalid !== undefined) attrs['aria-invalid'] = config.invalid.toString()
    if (config.required !== undefined) attrs['aria-required'] = config.required.toString()
    if (config.live) attrs['aria-live'] = config.live
    if (config.role) attrs['role'] = config.role
    if (config.level !== undefined) attrs['aria-level'] = config.level.toString()
    
    return attrs
  }, [])

  // Skip link component factory
  const createSkipLink = useCallback((href: string, children: React.ReactNode) => {
    return React.createElement('a', {
      href,
      className: 'sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-md focus:shadow-lg',
      onFocus: () => announceToScreenReader('Skip link activated')
    }, children)
  }, [announceToScreenReader])

  // Create announcement container
  useEffect(() => {
    if (!announcementRef.current) {
      const container = document.createElement('div')
      container.className = 'sr-only'
      container.setAttribute('aria-live', 'polite')
      container.setAttribute('aria-atomic', 'true')
      document.body.appendChild(container)
      announcementRef.current = container
    }

    return () => {
      if (announcementRef.current?.parentNode) {
        announcementRef.current.parentNode.removeChild(announcementRef.current)
      }
    }
  }, [])

  return {
    options,
    setOptions,
    announceToScreenReader,
    handleArrowNavigation,
    trapFocus,
    getContrastRatio,
    isWCAGCompliant,
    generateAriaAttributes,
    createSkipLink
  }
}