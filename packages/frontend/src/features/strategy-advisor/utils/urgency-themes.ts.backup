// Urgency Themes - Visual treatment definitions for adaptive UI based on urgency context
// Provides comprehensive theming system with accessibility considerations

import type { UrgencyUITreatment, UrgencyLevel } from '../types/strategy-advisor.types'

// Color scheme definitions
export interface UrgencyColorScheme {
  primary: string
  secondary: string
  accent: string
  background: string
  border: string
  text: string
  textSecondary: string
  shadow: string
  glow?: string
}

// Animation configuration
export interface UrgencyAnimationConfig {
  transition: string
  pulseIntensity: 'none' | 'subtle' | 'moderate' | 'strong'
  scaleIntensity: number
  glowIntensity: number
  hoverScale: number
}

// Typography configuration
export interface UrgencyTypographyConfig {
  fontWeight: 'normal' | 'medium' | 'semibold' | 'bold' | 'extrabold'
  fontSize: 'sm' | 'base' | 'lg' | 'xl'
  lineHeight: 'tight' | 'normal' | 'relaxed'
  letterSpacing: 'tight' | 'normal' | 'wide'
}

// Layout configuration
export interface UrgencyLayoutConfig {
  padding: 'compact' | 'normal' | 'spacious'
  spacing: 'tight' | 'normal' | 'loose'
  borderRadius: 'sm' | 'md' | 'lg'
  borderWidth: 'thin' | 'normal' | 'thick'
}

// Complete theme configuration
export interface UrgencyTheme {
  colors: UrgencyColorScheme
  animations: UrgencyAnimationConfig
  typography: UrgencyTypographyConfig
  layout: UrgencyLayoutConfig
  accessibility: {
    reduceMotion: boolean
    highContrast: boolean
    focusVisible: string
  }
}

// Theme definitions by color scheme
const COLOR_SCHEMES: Record<UrgencyUITreatment['colorScheme'], UrgencyColorScheme> = {
  calm: {
    primary: 'bg-blue-500',
    secondary: 'bg-blue-100',
    accent: 'text-blue-600',
    background: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-gray-900',
    textSecondary: 'text-gray-600',
    shadow: 'shadow-md',
    glow: 'shadow-blue-200/50'
  },
  moderate: {
    primary: 'bg-orange-500',
    secondary: 'bg-orange-100',
    accent: 'text-orange-600',
    background: 'bg-orange-50',
    border: 'border-orange-300',
    text: 'text-gray-900',
    textSecondary: 'text-gray-700',
    shadow: 'shadow-lg',
    glow: 'shadow-orange-200/60'
  },
  urgent: {
    primary: 'bg-red-500',
    secondary: 'bg-red-100',
    accent: 'text-red-600',
    background: 'bg-red-50',
    border: 'border-red-400',
    text: 'text-gray-900',
    textSecondary: 'text-gray-800',
    shadow: 'shadow-xl',
    glow: 'shadow-red-300/70'
  },
  emergency: {
    primary: 'bg-red-600',
    secondary: 'bg-red-200',
    accent: 'text-red-700',
    background: 'bg-red-100',
    border: 'border-red-500',
    text: 'text-gray-900',
    textSecondary: 'text-gray-900',
    shadow: 'shadow-2xl',
    glow: 'shadow-red-400/80'
  }
}

// Animation configurations by intensity
const ANIMATION_CONFIGS: Record<UrgencyUITreatment['animationIntensity'], UrgencyAnimationConfig> = {
  subtle: {
    transition: 'transition-all duration-300 ease-in-out',
    pulseIntensity: 'subtle',
    scaleIntensity: 1.02,
    glowIntensity: 0.3,
    hoverScale: 1.01
  },
  moderate: {
    transition: 'transition-all duration-200 ease-out',
    pulseIntensity: 'moderate',
    scaleIntensity: 1.05,
    glowIntensity: 0.5,
    hoverScale: 1.02
  },
  pronounced: {
    transition: 'transition-all duration-150 ease-out',
    pulseIntensity: 'strong',
    scaleIntensity: 1.08,
    glowIntensity: 0.8,
    hoverScale: 1.03
  }
}

// Typography configurations by emphasis
const TYPOGRAPHY_CONFIGS: Record<UrgencyUITreatment['visualEmphasis'], UrgencyTypographyConfig> = {
  normal: {
    fontWeight: 'normal',
    fontSize: 'sm',
    lineHeight: 'normal',
    letterSpacing: 'normal'
  },
  bold: {
    fontWeight: 'medium',
    fontSize: 'sm',
    lineHeight: 'normal',
    letterSpacing: 'normal'
  },
  prominent: {
    fontWeight: 'semibold',
    fontSize: 'base',
    lineHeight: 'tight',
    letterSpacing: 'normal'
  },
  alert: {
    fontWeight: 'bold',
    fontSize: 'lg',
    lineHeight: 'tight',
    letterSpacing: 'wide'
  }
}

// Layout configurations by information density
const LAYOUT_CONFIGS: Record<UrgencyUITreatment['informationDensity'], UrgencyLayoutConfig> = {
  full: {
    padding: 'spacious',
    spacing: 'loose',
    borderRadius: 'md',
    borderWidth: 'normal'
  },
  essential: {
    padding: 'normal',
    spacing: 'normal',
    borderRadius: 'md',
    borderWidth: 'normal'
  },
  minimal: {
    padding: 'compact',
    spacing: 'tight',
    borderRadius: 'sm',
    borderWidth: 'thick'
  }
}

/**
 * Get complete theme configuration for a given UI treatment
 */
export function getUrgencyTheme(
  treatment: UrgencyUITreatment,
  options: {
    respectReducedMotion?: boolean
    highContrast?: boolean
  } = {}
): UrgencyTheme {
  const { respectReducedMotion = true, highContrast = false } = options

  const colors = COLOR_SCHEMES[treatment.colorScheme]
  const animations = ANIMATION_CONFIGS[treatment.animationIntensity]
  const typography = TYPOGRAPHY_CONFIGS[treatment.visualEmphasis]
  const layout = LAYOUT_CONFIGS[treatment.informationDensity]

  // Apply accessibility adjustments
  const accessibilityAdjustedAnimations = respectReducedMotion
    ? { ...animations, pulseIntensity: 'none' as const, scaleIntensity: 1, glowIntensity: 0 }
    : animations

  const accessibilityAdjustedColors = highContrast
    ? enhanceContrastColors(colors)
    : colors

  return {
    colors: accessibilityAdjustedColors,
    animations: accessibilityAdjustedAnimations,
    typography,
    layout,
    accessibility: {
      reduceMotion: respectReducedMotion,
      highContrast,
      focusVisible: 'focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 focus:outline-none'
    }
  }
}

/**
 * Get CSS classes for urgency-aware styling
 */
export function getUrgencyClasses(
  treatment: UrgencyUITreatment,
  options: {
    respectReducedMotion?: boolean
    includeHover?: boolean
    includeAnimations?: boolean
  } = {}
): {
  container: string
  text: string
  border: string
  background: string
  shadow: string
  animation: string
  hover: string
} {
  const { respectReducedMotion = true, includeHover = true, includeAnimations = true } = options

  const theme = getUrgencyTheme(treatment, { respectReducedMotion })

  // Base classes
  const container = [
    theme.colors.background,
    theme.colors.border,
    theme.colors.shadow,
    `rounded-${theme.layout.borderRadius}`,
    `border-${theme.layout.borderWidth === 'thick' ? '2' : '1'}`,
    getPaddingClass(theme.layout.padding)
  ].join(' ')

  const text = [
    theme.colors.text,
    `font-${theme.typography.fontWeight}`,
    `text-${theme.typography.fontSize}`,
    `leading-${theme.typography.lineHeight}`,
    `tracking-${theme.typography.letterSpacing}`
  ].join(' ')

  const border = theme.colors.border
  const background = theme.colors.background
  const shadow = theme.colors.shadow

  // Animation classes
  const animation = includeAnimations && !respectReducedMotion
    ? [
        theme.animations.transition,
        getPulseClass(theme.animations.pulseIntensity),
        theme.colors.glow && `hover:${theme.colors.glow}`
      ].filter(Boolean).join(' ')
    : ''

  // Hover effects
  const hover = includeHover
    ? [
        `hover:scale-${Math.round(theme.animations.hoverScale * 100)}`,
        `hover:${theme.colors.glow}`,
        'hover:brightness-105'
      ].join(' ')
    : ''

  return {
    container,
    text,
    border,
    background,
    shadow,
    animation,
    hover
  }
}

/**
 * Get urgency-specific message filtering logic
 */
export function shouldShowMessage(
  messageUrgency: UrgencyLevel,
  treatment: UrgencyUITreatment
): boolean {
  switch (treatment.messageFiltering) {
    case 'all':
      return true

    case 'prioritized':
      return messageUrgency === 'high' || messageUrgency === 'critical'

    case 'critical-only':
      return messageUrgency === 'critical'

    default:
      return true
  }
}

/**
 * Get reduced information for minimal density mode
 */
export interface MessageContent {
  title: string
  message: string
  showDetails: boolean
  showConfidence: boolean
  showActions: boolean
}

export function adaptMessageContent(
  originalContent: MessageContent,
  treatment: UrgencyUITreatment
): MessageContent {
  switch (treatment.informationDensity) {
    case 'full':
      return originalContent

    case 'essential':
      return {
        ...originalContent,
        showDetails: false,
        showActions: true
      }

    case 'minimal':
      return {
        title: originalContent.title,
        message: originalContent.message.substring(0, 60) + (originalContent.message.length > 60 ? '...' : ''),
        showDetails: false,
        showConfidence: false,
        showActions: true
      }

    default:
      return originalContent
  }
}

// Helper functions

function enhanceContrastColors(colors: UrgencyColorScheme): UrgencyColorScheme {
  return {
    ...colors,
    text: 'text-black',
    textSecondary: 'text-gray-800',
    border: colors.border.replace('200', '400').replace('300', '500')
  }
}

function getPaddingClass(padding: UrgencyLayoutConfig['padding']): string {
  switch (padding) {
    case 'compact': return 'p-2'
    case 'normal': return 'p-3'
    case 'spacious': return 'p-4'
    default: return 'p-3'
  }
}

function getPulseClass(intensity: UrgencyAnimationConfig['pulseIntensity']): string {
  switch (intensity) {
    case 'subtle': return 'animate-pulse'
    case 'moderate': return 'animate-pulse'
    case 'strong': return 'animate-bounce'
    case 'none': return ''
    default: return ''
  }
}

/**
 * Utility function to merge urgency classes with existing classes
 */
export function mergeUrgencyClasses(baseClasses: string, urgencyClasses: string): string {
  // Simple merge - in a real implementation, you might want more sophisticated merging
  // that handles conflicting Tailwind classes
  return [baseClasses, urgencyClasses].filter(Boolean).join(' ')
}

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return true
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Check if user prefers high contrast
 */
export function prefersHighContrast(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-contrast: high)').matches
}

// Export theme constants for reference
export const URGENCY_THEME_CONSTANTS = {
  COLOR_SCHEMES,
  ANIMATION_CONFIGS,
  TYPOGRAPHY_CONFIGS,
  LAYOUT_CONFIGS
} as const

// Export types
export type {
  UrgencyColorScheme,
  UrgencyAnimationConfig,
  UrgencyTypographyConfig,
  UrgencyLayoutConfig,
  UrgencyTheme,
  MessageContent
}