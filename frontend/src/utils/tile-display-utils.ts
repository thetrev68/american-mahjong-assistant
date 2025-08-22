// Tile Display Utilities
// Single-character notation and color coding for pattern variations

export interface TileDisplayChar {
  char: string
  color: 'green' | 'red' | 'blue' | 'black'
  tileId: string
  isMatched?: boolean
}

/**
 * Convert tile ID to single character notation
 * 1 2 3 4 5 6 7 8 9 G R D F N E W S J
 * G = Green Dragon, R = Red Dragon, D = White Dragon
 * F = Flower, N = North, E = East, W = West, S = South, J = Joker
 */
export function getTileDisplayChar(tileId: string): TileDisplayChar {
  // Handle null/undefined cases
  if (!tileId) {
    return { char: '?', color: 'black', tileId: tileId || 'unknown' }
  }
  
  const tileStr = String(tileId).toLowerCase()
  
  // Numbers 1-9 for each suit
  if (tileStr.match(/^[1-9][bcd]$/)) {
    const num = tileStr[0]
    const suit = tileStr[1]
    
    let color: TileDisplayChar['color'] = 'black'
    if (suit === 'b') color = 'green'      // Bams = green
    else if (suit === 'c') color = 'red'   // Cracks = red  
    else if (suit === 'd') color = 'blue'  // Dots = blue
    
    return {
      char: num,
      color,
      tileId
    }
  }
  
  // Dragons (handle multiple formats)
  if (tileStr === 'f2' || tileStr.includes('green') || tileStr === 'gd') {
    return { char: 'G', color: 'green', tileId }
  }
  if (tileStr === 'f3' || tileStr.includes('red') || tileStr === 'rd') {
    return { char: 'R', color: 'red', tileId }
  }
  if (tileStr === 'f4' || tileStr.includes('white') || tileStr === 'wd') {
    return { char: 'D', color: 'blue', tileId }
  }
  
  // Winds (handle multiple formats)
  if (tileStr === 'north' || tileStr === 'n' || tileStr === 'nw') {
    return { char: 'N', color: 'black', tileId }
  }
  if (tileStr === 'east' || tileStr === 'e' || tileStr === 'ew') {
    return { char: 'E', color: 'black', tileId }
  }
  if (tileStr === 'west' || tileStr === 'w' || tileStr === 'ww') {
    return { char: 'W', color: 'black', tileId }
  }
  if (tileStr === 'south' || tileStr === 's' || tileStr === 'sw') {
    return { char: 'S', color: 'black', tileId }
  }
  
  // Flowers (handle multiple formats)
  if (tileStr === 'f1' || tileStr.includes('flower') || tileStr === 'f') {
    return { char: 'F', color: 'black', tileId }
  }
  
  // Jokers (handle multiple formats)
  if (tileStr.includes('joker') || tileStr === 'j') {
    return { char: 'J', color: 'black', tileId }
  }
  
  // Advanced pattern matching for unknown formats
  if (tileStr.match(/^[1-9]/)) {
    return { char: tileStr[0], color: 'black', tileId }
  }
  
  // Last resort - use first character
  const firstChar = tileStr.charAt(0).toUpperCase()
  if (firstChar && firstChar !== '?') {
    return { char: firstChar, color: 'black', tileId }
  }
  
  // Final fallback
  return { char: '?', color: 'black', tileId }
}

/**
 * Convert pattern variation tiles array to display characters with quantity-aware matching
 */
export function getPatternDisplayChars(
  patternTiles: string[], 
  playerTiles: string[] = []
): TileDisplayChar[] {
  // Count quantities of each tile type in player's hand
  const normalizeId = (id: string): string => String(id).toLowerCase().trim()
  const playerTileCounts = new Map<string, number>()
  
  playerTiles.forEach(tileId => {
    const normalized = normalizeId(tileId)
    playerTileCounts.set(normalized, (playerTileCounts.get(normalized) || 0) + 1)
  })
  
  // Track how many of each tile type we've already matched in the pattern
  const usedTileCounts = new Map<string, number>()
  
  return patternTiles.map(tileId => {
    const displayChar = getTileDisplayChar(tileId)
    
    // Handle unknown tiles more gracefully
    if (displayChar.char === '?' && tileId) {
      // Log for debugging but don't spam console in production
      if (process.env.NODE_ENV === 'development') {
        console.debug(`Unknown tile ID: ${tileId}`)
      }
      
      // Try to extract meaningful character from tile ID
      if (typeof tileId === 'string') {
        if (tileId.includes('joker')) displayChar.char = 'J'
        else if (tileId.match(/^[1-9]/)) displayChar.char = tileId[0]
        else displayChar.char = tileId.charAt(0).toUpperCase()
      }
    }
    
    // Check if this tile can be matched based on quantities
    const normalized = normalizeId(tileId)
    const playerHasCount = playerTileCounts.get(normalized) || 0
    const alreadyUsedCount = usedTileCounts.get(normalized) || 0
    const canMatch = playerHasCount > alreadyUsedCount
    
    if (canMatch) {
      // Mark this tile as used
      usedTileCounts.set(normalized, alreadyUsedCount + 1)
    }
    
    return {
      ...displayChar,
      isMatched: canMatch
    }
  })
}

/**
 * Get Tailwind CSS classes for tile character display
 */
export function getTileCharClasses(
  tileChar: TileDisplayChar, 
  inverted: boolean = true
): string {
  const baseClasses = 'font-mono text-sm font-bold px-1 rounded'
  
  // Correct logic: when inverted=true, show matched tiles with colored background (inverted)
  // when inverted=false, show all tiles with normal styling
  const shouldShowInverted = inverted && tileChar.isMatched
  
  if (shouldShowInverted) {
    // Hand tiles (matched): colored background with white text (inverted)
    switch (tileChar.color) {
      case 'green':
        return `${baseClasses} bg-green-600 text-white border border-green-700`
      case 'red':
        return `${baseClasses} bg-red-600 text-white border border-red-700`
      case 'blue':
        return `${baseClasses} bg-blue-600 text-white border border-blue-700`
      case 'black':
        return `${baseClasses} bg-gray-800 text-white border border-gray-900`
    }
  } else {
    // Pattern tiles (not in hand): white background with colored text (normal)
    switch (tileChar.color) {
      case 'green':
        return `${baseClasses} bg-white text-green-600 border border-green-200`
      case 'red':
        return `${baseClasses} bg-white text-red-600 border border-red-200`
      case 'blue':
        return `${baseClasses} bg-white text-blue-600 border border-blue-200`
      case 'black':
        return `${baseClasses} bg-white text-gray-800 border border-gray-300`
    }
  }
  
  return baseClasses
}

/**
 * Render pattern variation as single characters with proper grouping
 */
export function renderPatternVariation(
  patternTiles: string[],
  playerTiles: string[] = [],
  options: {
    showMatches?: boolean
    invertMatches?: boolean
    spacing?: boolean
    patternGroups?: Array<{ Group: string | number; display_color?: string; [key: string]: unknown }>
  } = {}
): TileDisplayChar[] {
  const { showMatches = true, spacing = true, patternGroups } = options
  
  const chars = getPatternDisplayChars(patternTiles, showMatches ? playerTiles : [])
  
  // Add spacing based on actual pattern groups if available
  if (spacing && patternGroups && patternGroups.length > 0) {
    const spacedChars: TileDisplayChar[] = []
    let currentIndex = 0
    
    // Calculate group sizes based on pattern groups
    const groupSizes = patternGroups.map(group => {
      const groupStr = String(group.Group)
      if (groupStr.includes('FFFF')) return 4
      if (groupStr.includes('FFF')) return 3
      if (groupStr.includes('FF')) return 2
      if (groupStr.length >= 3) return groupStr.length
      return 4 // Default fallback
    })
    
    // Add tiles with spacing between groups
    groupSizes.forEach((size, groupIndex) => {
      const endIndex = Math.min(currentIndex + size, chars.length)
      
      for (let i = currentIndex; i < endIndex; i++) {
        if (i < chars.length) {
          spacedChars.push(chars[i])
        }
      }
      
      // Add spacer between groups (except after last group)
      if (groupIndex < groupSizes.length - 1 && currentIndex + size < chars.length) {
        spacedChars.push({
          char: ' ',
          color: 'black',
          tileId: 'spacer',
          isMatched: false
        })
      }
      
      currentIndex += size
    })
    
    return spacedChars
  }
  
  // Fallback to every 4 characters spacing if no groups available
  if (spacing) {
    const spacedChars: TileDisplayChar[] = []
    chars.forEach((char, index) => {
      spacedChars.push(char)
      if ((index + 1) % 4 === 0 && index < chars.length - 1) {
        spacedChars.push({
          char: ' ',
          color: 'black',
          tileId: 'spacer',
          isMatched: false
        })
      }
    })
    return spacedChars
  }
  
  return chars
}

/**
 * Get pattern completion visual summary
 */
export function getPatternCompletionSummary(
  patternTiles: string[],
  playerTiles: string[]
): {
  totalTiles: number
  matchedTiles: number
  completionPercentage: number
  matchedPositions: number[]
} {
  const playerTileSet = new Set(playerTiles)
  const matchedPositions: number[] = []
  let matchedTiles = 0
  
  patternTiles.forEach((tileId, index) => {
    if (playerTileSet.has(tileId)) {
      matchedTiles++
      matchedPositions.push(index)
    }
  })
  
  return {
    totalTiles: patternTiles.length,
    matchedTiles,
    completionPercentage: Math.round((matchedTiles / patternTiles.length) * 100),
    matchedPositions
  }
}