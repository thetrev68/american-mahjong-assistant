/**
 * Accessibility Utilities
 * Utility functions for accessibility context
 */

import React from 'react'
import type { AccessibilityOptions } from '../../hooks/useAccessibility'

export interface AccessibilityContextType {
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
  createSkipLink: (href: string, children: React.ReactNode) => React.ReactElement
}

export const createAccessibilityContext = () => {
  return React.createContext<AccessibilityContextType | undefined>(undefined)
}

export const useAccessibilityContext = (context: React.Context<AccessibilityContextType | undefined>): AccessibilityContextType => {
  const contextValue = React.useContext(context)
  if (!contextValue) {
    throw new Error('useAccessibilityContext must be used within AccessibilityProvider')
  }
  return contextValue
}