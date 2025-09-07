/**
 * Accessibility Provider
 * Global accessibility context and configuration
 */

import React, { createContext, useContext, ReactNode } from 'react'
import { useAccessibility, AccessibilityOptions } from '../../hooks/useAccessibility'

interface AccessibilityContextType {
  options: AccessibilityOptions
  setOptions: (options: Partial<AccessibilityOptions>) => void
  announceToScreenReader: (message: string, options?: { priority?: 'polite' | 'assertive' | 'off'; atomic?: boolean; relevant?: 'additions' | 'removals' | 'text' | 'all' }) => void
  handleArrowNavigation: (
    e: KeyboardEvent,
    items: NodeListOf<HTMLElement> | HTMLElement[],
    currentIndex: number,
    onIndexChange: (newIndex: number) => void,
    options?: { wrap?: boolean; orientation?: 'horizontal' | 'vertical' | 'both' }
  ) => void
  trapFocus: (container: HTMLElement, selector?: string) => () => void
  getContrastRatio: (color1: string, color2: string) => number
  isWCAGCompliant: (
    foreground: string,
    background: string,
    level?: 'AA' | 'AAA',
    size?: 'normal' | 'large'
  ) => boolean
  generateAriaAttributes: (config: { label?: string; labelledBy?: string; describedBy?: string; expanded?: boolean; selected?: boolean; checked?: boolean; invalid?: boolean; required?: boolean; live?: 'polite' | 'assertive' | 'off'; role?: string; level?: number }) => Record<string, string>
  createSkipLink: (href: string, children: ReactNode) => React.ReactElement
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined)

interface AccessibilityProviderProps {
  children: ReactNode
}

const AccessibilityProvider: React.FC<AccessibilityProviderProps> = ({ children }) => {
  const accessibility = useAccessibility()

  // Add global accessibility styles based on preferences
  React.useEffect(() => {
    const root = document.documentElement
    
    if (accessibility.options.reducedMotion) {
      root.style.setProperty('--animation-duration', '0s')
      root.style.setProperty('--transition-duration', '0s')
    } else {
      root.style.removeProperty('--animation-duration')
      root.style.removeProperty('--transition-duration')
    }

    if (accessibility.options.highContrast) {
      root.classList.add('high-contrast')
    } else {
      root.classList.remove('high-contrast')
    }

    // Font size scaling
    const fontSizeMap = {
      'small': '14px',
      'medium': '16px',
      'large': '18px',
      'extra-large': '22px'
    }
    
    root.style.setProperty(
      '--base-font-size', 
      fontSizeMap[accessibility.options.fontSize || 'medium']
    )

  }, [accessibility.options])

  return (
    <AccessibilityContext.Provider value={accessibility}>
      {/* Skip navigation links */}
      <div className="skip-links">
        {accessibility.createSkipLink('#main-content', 'Skip to main content')}
        {accessibility.createSkipLink('#navigation', 'Skip to navigation')}
      </div>
      
      {children}
      
      {/* Screen reader announcements container */}
      <div 
        id="screen-reader-announcements" 
        className="sr-only" 
        aria-live="polite" 
        aria-atomic="true" 
      />
    </AccessibilityContext.Provider>
  )
}

const useAccessibilityContext = (): AccessibilityContextType => {
  const context = useContext(AccessibilityContext)
  if (!context) {
    throw new Error('useAccessibilityContext must be used within AccessibilityProvider')
  }
  return context
}

export { AccessibilityProvider, useAccessibilityContext }