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
  // Numbers 1-9 for each suit
  if (tileId.match(/^[1-9][BCD]$/)) {
    const num = tileId[0]
    const suit = tileId[1]
    
    let color: TileDisplayChar['color'] = 'black'
    if (suit === 'B') color = 'green'      // Bams = green
    else if (suit === 'C') color = 'red'   // Cracks = red  
    else if (suit === 'D') color = 'blue'  // Dots = blue
    
    return {
      char: num,
      color,
      tileId
    }
  }
  
  // Dragons
  if (tileId === 'f2') return { char: 'G', color: 'green', tileId } // Green Dragon
  if (tileId === 'f3') return { char: 'R', color: 'red', tileId }   // Red Dragon  
  if (tileId === 'f4') return { char: 'D', color: 'blue', tileId }  // White Dragon
  
  // Winds
  if (tileId === 'north') return { char: 'N', color: 'black', tileId }
  if (tileId === 'east') return { char: 'E', color: 'black', tileId }
  if (tileId === 'west') return { char: 'W', color: 'black', tileId }
  if (tileId === 'south') return { char: 'S', color: 'black', tileId }
  
  // Flowers
  if (tileId === 'f1') return { char: 'F', color: 'black', tileId }
  
  // Jokers
  if (tileId === 'joker') return { char: 'J', color: 'black', tileId }
  
  // Fallback
  return { char: '?', color: 'black', tileId }
}

/**
 * Convert pattern variation tiles array to display characters
 */
export function getPatternDisplayChars(
  patternTiles: string[], 
  playerTiles: string[] = []
): TileDisplayChar[] {
  const playerTileSet = new Set(playerTiles)
  
  return patternTiles.map(tileId => ({
    ...getTileDisplayChar(tileId),
    isMatched: playerTileSet.has(tileId)
  }))
}

/**
 * Get Tailwind CSS classes for tile character display
 */
export function getTileCharClasses(
  tileChar: TileDisplayChar, 
  inverted: boolean = false
): string {
  const baseClasses = 'font-mono text-sm font-bold px-1 rounded'
  
  if (inverted && tileChar.isMatched) {
    // Inverted colors: colored background with white text for matches
    switch (tileChar.color) {
      case 'green':
        return `${baseClasses} bg-green-600 text-white`
      case 'red':
        return `${baseClasses} bg-red-600 text-white`
      case 'blue':
        return `${baseClasses} bg-blue-600 text-white`
      case 'black':
        return `${baseClasses} bg-gray-800 text-white`
    }
  } else {
    // Normal colors: white background with colored text
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
 * Render pattern variation as single characters
 */
export function renderPatternVariation(
  patternTiles: string[],
  playerTiles: string[] = [],
  options: {
    showMatches?: boolean
    invertMatches?: boolean
    spacing?: boolean
  } = {}
): TileDisplayChar[] {
  const { showMatches = true, spacing = true } = options
  
  const chars = getPatternDisplayChars(patternTiles, showMatches ? playerTiles : [])
  
  // Add spacing every 4 characters for readability
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