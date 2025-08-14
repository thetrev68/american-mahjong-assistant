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
 * 
 * This handles duplicate pattern parts by matching them sequentially to groups
 */
export function getColoredPatternParts(pattern: string, groups: PatternGroup[]): ColoredPatternPart[] {
  const patternParts = pattern.split(' ')
  const coloredParts: ColoredPatternPart[] = []
  
  // Create array of group base names (without suffixes) and their colors
  const groupSequence = groups.map(group => {
    const groupName = String(group.Group)
    const baseGroupName = groupName.replace(/_\d+$/, '') // Remove _1, _2, etc.
    return {
      baseName: baseGroupName,
      color: group.display_color
    }
  })
  
  // Map each pattern part to its corresponding group in sequence
  patternParts.forEach((part, index) => {
    // Find the matching group at this position in the sequence
    const matchingGroup = groupSequence[index]
    const color = matchingGroup?.color || 'blue' // Default to blue if not found
    
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
      text: 'text-blue-900', // Darker navy blue to match physical card
      background: 'bg-blue-100 text-blue-900'
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