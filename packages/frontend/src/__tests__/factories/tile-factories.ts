/**
 * Tile Test Data Factories
 * 
 * Creates consistent PlayerTile objects for testing
 */

import type { PlayerTile, TileSuit, TileValue } from 'shared-types'

export interface TileFactoryOptions {
  suit?: TileSuit
  value?: TileValue
  id?: string
  instanceId?: string
  displayName?: string
  isSelected?: boolean
  isJoker?: boolean
}

/**
 * Create a single PlayerTile with optional overrides
 */
export function createTile(options: TileFactoryOptions = {}): PlayerTile {
  const suit = options.suit || 'bams'
  const value = options.value || '1'
  const id = options.id || `${value}${suit === 'bams' ? 'B' : suit === 'cracks' ? 'C' : suit === 'dots' ? 'D' : suit === 'flowers' ? '' : suit === 'dragons' ? '' : suit === 'winds' ? '' : 'B'}`
  
  return {
    suit,
    value,
    id,
    instanceId: options.instanceId || `${id}-inst-${Math.random().toString(36).substr(2, 9)}`,
    displayName: options.displayName || `${value} ${suit}`, // Simplified for test data
    isSelected: options.isSelected || false,
    isJoker: options.isJoker || false
  }
}

/**
 * Create multiple tiles of the same type
 */
export function createTiles(count: number, options: TileFactoryOptions = {}): PlayerTile[] {
  return Array.from({ length: count }, (_, index) => 
    createTile({ 
      ...options, 
      instanceId: options.instanceId || `${options.id || 'tile'}-${index + 1}-inst` 
    })
  )
}

/**
 * Create a complete 13-tile hand for testing
 */
export function createTestHand(): PlayerTile[] {
  return [
    createTile({ suit: 'bams', value: '1', id: '1B' }),
    createTile({ suit: 'bams', value: '2', id: '2B' }),
    createTile({ suit: 'bams', value: '3', id: '3B' }),
    createTile({ suit: 'bams', value: '4', id: '4B' }),
    createTile({ suit: 'cracks', value: '1', id: '1C' }),
    createTile({ suit: 'cracks', value: '2', id: '2C' }),
    createTile({ suit: 'cracks', value: '3', id: '3C' }),
    createTile({ suit: 'cracks', value: '4', id: '4C' }),
    createTile({ suit: 'dots', value: '1', id: '1D' }),
    createTile({ suit: 'dots', value: '2', id: '2D' }),
    createTile({ suit: 'dots', value: '3', id: '3D' }),
    createTile({ suit: 'flowers', value: 'f1', id: 'f1' }),
    createTile({ suit: 'flowers', value: 'f2', id: 'f2' })
  ]
}

/**
 * Create a specific hand pattern for testing
 */
export function createHandByPattern(pattern: string): PlayerTile[] {
  const tiles: PlayerTile[] = []
  const tileStrings = pattern.split(' ').join('').match(/.{1,2}/g) || []
  
  tileStrings.forEach((tileStr, index) => {
    const suit = getTileSuitFromId(tileStr)
    const value = getTileValueFromId(tileStr)
    
    tiles.push(createTile({ 
      suit, 
      value, 
      id: tileStr,
      instanceId: `pattern-tile-${index + 1}-inst`
    }))
  })
  
  return tiles
}

/**
 * Create specific tile combinations for testing
 */
export const TilePresets = {
  // Basic suits
  bams: (values: TileValue[]) => values.map(value => createTile({ suit: 'bams', value, id: `${value}B` })),
  cracks: (values: TileValue[]) => values.map(value => createTile({ suit: 'cracks', value, id: `${value}C` })),
  dots: (values: TileValue[]) => values.map(value => createTile({ suit: 'dots', value, id: `${value}D` })),
  
  // Honor tiles
  winds: () => ['east', 'south', 'west', 'north'].map(value => 
    createTile({ suit: 'winds', value: value as TileValue, id: value })
  ),
  dragons: () => ['red', 'green', 'white'].map(value => 
    createTile({ suit: 'dragons', value: value as TileValue, id: value })
  ),
  flowers: () => ['f1', 'f2', 'f3', 'f4'].map(value => 
    createTile({ suit: 'flowers', value: value as TileValue, id: value })
  ),
  
  // Special tiles
  jokers: (count: number = 1) => Array.from({ length: count }, (_, i) => 
    createTile({ suit: 'jokers', value: 'joker', id: 'joker', instanceId: `joker-${i + 1}-inst`, isJoker: true })
  ),
  
  // Common patterns
  pung: (tileId: string) => createTiles(3, { id: tileId }),
  kong: (tileId: string) => createTiles(4, { id: tileId }),
  pair: (tileId: string) => createTiles(2, { id: tileId }),
  
  // Sequences (for number tiles)
  sequence: (startValue: number, suit: TileSuit = 'bams') => {
    const suitCode = suit === 'bams' ? 'B' : suit === 'cracks' ? 'C' : 'D'
    return [startValue, startValue + 1, startValue + 2].map(value => 
      createTile({ suit, value: value.toString() as TileValue, id: `${value}${suitCode}` })
    )
  },

  // Preset hands for testing
  mixedHand: () => [
    createTile({ suit: 'bams', value: '1', id: '1B' }),
    createTile({ suit: 'bams', value: '2', id: '2B' }),
    createTile({ suit: 'bams', value: '3', id: '3B' }),
    createTile({ suit: 'cracks', value: '4', id: '4C' }),
    createTile({ suit: 'cracks', value: '5', id: '5C' }),
    createTile({ suit: 'dots', value: '6', id: '6D' }),
    createTile({ suit: 'dots', value: '7', id: '7D' }),
    createTile({ suit: 'winds', value: 'east', id: 'east' }),
    createTile({ suit: 'winds', value: 'south', id: 'south' }),
    createTile({ suit: 'dragons', value: 'red', id: 'red' }),
    createTile({ suit: 'dragons', value: 'green', id: 'green' }),
    createTile({ suit: 'flowers', value: 'f1', id: 'f1' }),
    createTile({ suit: 'jokers', value: 'joker', id: 'joker', isJoker: true }),
    createTile({ suit: 'bams', value: '9', id: '9B' })
  ],

  pungs: () => [
    ...TilePresets.pung('1B'),
    ...TilePresets.pung('5C'),
    ...TilePresets.pung('red'),
    ...TilePresets.pung('2D'),
    createTile({ suit: 'bams', value: '9', id: '9B' }),
    createTile({ suit: 'cracks', value: '8', id: '8C' })
  ],

  pairs: () => [
    ...TilePresets.pair('1B'),
    ...TilePresets.pair('2C'), 
    ...TilePresets.pair('3D'),
    ...TilePresets.pair('east'),
    ...TilePresets.pair('red'),
    ...TilePresets.pair('f1'),
    createTile({ suit: 'bams', value: '7', id: '7B' }),
    createTile({ suit: 'cracks', value: '8', id: '8C' })
  ]
}

// Helper functions
function generateDisplayName(suit: TileSuit, value: TileValue): string {
  const suitNames = {
    bams: 'Bam',
    cracks: 'Crack', 
    dots: 'Dot',
    winds: 'Wind',
    dragons: 'Dragon',
    flowers: 'Flower',
    jokers: 'Joker'
  }
  
  if (suit === 'jokers') return 'Joker'
  if (suit === 'flowers') return `Flower ${value.toUpperCase()}`
  if (suit === 'winds') return `${value.charAt(0).toUpperCase() + value.slice(1)} Wind`
  if (suit === 'dragons') return `${value.charAt(0).toUpperCase() + value.slice(1)} Dragon`
  
  return `${value} ${suitNames[suit]}`
}

function getTileSuitFromId(tileId: string): TileSuit {
  if (tileId.endsWith('B')) return 'bams'
  if (tileId.endsWith('C')) return 'cracks'
  if (tileId.endsWith('D')) return 'dots'
  if (['east', 'south', 'west', 'north'].includes(tileId)) return 'winds'
  if (['red', 'green', 'white'].includes(tileId)) return 'dragons'
  if (tileId.startsWith('f')) return 'flowers'
  if (tileId === 'joker') return 'jokers'
  return 'bams' // default
}

function getTileValueFromId(tileId: string): TileValue {
  if (tileId === 'joker') return 'joker'
  if (['east', 'south', 'west', 'north', 'red', 'green', 'white'].includes(tileId)) {
    return tileId as TileValue
  }
  if (tileId.startsWith('f')) return tileId as TileValue
  
  // Extract number from tile ID (e.g., "1B" -> "1")
  const match = tileId.match(/^(\d+)/)
  return match ? match[1] as TileValue : '1'
}