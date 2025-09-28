/**
 * Accessibility Provider
 * Global accessibility context and configuration
 */

import React from 'react'
import type { ReactNode } from 'react'
import { useAccessibility } from '../../hooks/useAccessibility'
import { AccessibilityContext } from './AccessibilityContext'

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

export default AccessibilityProvider