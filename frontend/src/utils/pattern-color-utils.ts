// Pattern Color Utilities
// Helpers for colorizing pattern displays based on group colors

import type { PatternGroup } from '../types/nmjl-types'

export interface ColoredPatternPart {
  text: string
  color: 'blue' | 'red' | 'green'
}

/**
 * Maps pattern parts to their group colors
 * e.g., "FFFF 2025 222 222" with groups [FFFF, 2025, 222_1, 222_2]
 * returns colored parts for each space-separated component
 */
export function getColoredPatternParts(pattern: string, groups: PatternGroup[]): ColoredPatternPart[] {
  const patternParts = pattern.split(' ')
  const coloredParts: ColoredPatternPart[] = []
  
  // Create a lookup map of group names to colors
  // Remove suffixes like _1, _2 when matching
  const groupColorMap = new Map<string, 'blue' | 'red' | 'green'>()
  
  groups.forEach(group => {
    const groupName = String(group.Group)
    const baseGroupName = groupName.replace(/_\d+$/, '') // Remove _1, _2, etc.
    groupColorMap.set(baseGroupName, group.display_color)
    groupColorMap.set(groupName, group.display_color) // Also store with suffix for exact matches
  })
  
  // Map each pattern part to its color
  patternParts.forEach(part => {
    const color = groupColorMap.get(part) || 'blue' // Default to blue if not found
    coloredParts.push({
      text: part,
      color: color
    })
  })
  
  return coloredParts
}

/**
 * Get CSS classes for pattern part colors
 */
export function getColorClasses(color: 'blue' | 'red' | 'green', variant: 'text' | 'background' = 'text'): string {
  const colorMap = {
    blue: {
      text: 'text-blue-600',
      background: 'bg-blue-100 text-blue-800'
    },
    red: {
      text: 'text-red-600', 
      background: 'bg-red-100 text-red-800'
    },
    green: {
      text: 'text-green-600',
      background: 'bg-green-100 text-green-800'
    }
  }
  
  return colorMap[color][variant]
}