// Tile Service - Core tile management and validation
// Handles all tile-related operations with proper validation

import type { PlayerTile } from 'shared-types'
import type { Tile, TileSuit, TileValue } from 'shared-types'
import tilesData from '../../assets/tiles.json'

// Local interfaces for tile service functionality
interface HandValidation {
  isValid: boolean
  errors: string[]
  warnings: string[]
  tileCount: number
  expectedCount: number
  duplicateErrors: string[]
}

interface TileCount {
  tileId: string
  count: number
  remaining: number
}

class TileService {
  private allTiles: Tile[] = []
  private initialized = false

  constructor() {
    // Lazy initialization to avoid circular dependency issues
  }


  private doInitializeTiles() {
    if (this.initialized) return

    const tiles: Tile[] = []

    // Use the frames directly from the JSON in their original order
    tilesData.frames.forEach(frame => {
      const tileId = frame.filename.replace('.png', '')
      const description = frame.description // Use the description from the JSON

      let suit: TileSuit
      let value: TileValue
      if (tileId.endsWith('B')) {
        suit = 'bams'
        value = tileId.slice(0, -1) as TileValue
      } else if (tileId.endsWith('C')) {
        suit = 'cracks'
        value = tileId.slice(0, -1) as TileValue
      } else if (tileId.endsWith('D')) {
        suit = 'dots'
        value = tileId.slice(0, -1) as TileValue
      } else if (['east', 'south', 'west', 'north'].includes(tileId)) {
        suit = 'winds'
        value = tileId as TileValue
      } else if (['red', 'green', 'white'].includes(tileId)) {
        suit = 'dragons'
        value = tileId as TileValue
      } else if (tileId.startsWith('f')) {
        suit = 'flowers'
        value = tileId as TileValue
      } else if (tileId === 'joker') {
        suit = 'jokers'
        value = 'joker'
      } else {
        return // Skip unknown tiles
      }

      tiles.push({
        id: tileId,
        suit: suit,
        value: value,
        displayName: description
      })
    })

    this.allTiles = tiles
    this.initialized = true
  }

  // Get all available tiles
  getAllTiles(): Tile[] {
    // For synchronous calls, do immediate initialization if not already done
    if (!this.initialized) {
      this.doInitializeTiles()
    }
    return [...this.allTiles]
  }

  // Get tiles by suit
  getTilesBySuit(suit: TileSuit): Tile[] {
    if (!this.initialized) {
      this.doInitializeTiles()
    }
    return this.allTiles.filter(tile => tile.suit === suit)
  }

  // Get tile by ID
  getTileById(id: string): Tile | undefined {
    if (!this.initialized) {
      this.doInitializeTiles()
    }
    return this.allTiles.find(tile => tile.id === id)
  }

  // Create a player tile instance
  createPlayerTile(tileId: string, instanceId?: string): PlayerTile | null {
    const baseTile = this.getTileById(tileId)
    if (!baseTile) return null

    return {
      ...baseTile,
      instanceId: instanceId || this.generateInstanceId(),
      isSelected: false
    }
  }

  // Generate unique instance ID
  private generateInstanceId(): string {
    return `tile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // Validate a hand of tiles
  validateHand(tiles: PlayerTile[], expectedCount: number = 14): HandValidation {
    const errors: string[] = []
    const warnings: string[] = []
    const tileCount = tiles.length
    
    // Check tile count
    if (tileCount !== expectedCount) {
      const diff = expectedCount - tileCount
      if (diff > 0) {
        errors.push(`Missing ${diff} tile${diff === 1 ? '' : 's'}`)
      } else {
        errors.push(`Too many tiles: ${Math.abs(diff)} extra`)
      }
    }

    // Check for duplicates (max 4 of each tile type)
    const tileCounts = new Map<string, number>()
    const duplicateErrors: string[] = []

    tiles.forEach(tile => {
      const count = tileCounts.get(tile.id) || 0
      tileCounts.set(tile.id, count + 1)
      
      if (count >= 4) {
        const tileName = tile.displayName
        duplicateErrors.push(`Too many ${tileName} tiles (max 4)`)
      }
    })

    // Check for invalid tile combinations
    const jokerCount = tiles.filter(t => t.suit === 'jokers').length
    const flowerCount = tiles.filter(t => t.suit === 'flowers').length
    
    if (jokerCount > 8) {
      errors.push('Too many jokers (max 8 in standard set)')
    }
    
    if (flowerCount > 4) {
      errors.push('Too many flowers (max 4)')
    }

    // Warnings for unusual hands
    if (jokerCount > 4) {
      warnings.push('Many jokers - verify count carefully')
    }

    if (flowerCount > 0 && tileCount === expectedCount) {
      warnings.push('Flowers count toward hand total')
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      tileCount,
      expectedCount,
      duplicateErrors
    }
  }

  // Count tiles by type
  countTiles(tiles: PlayerTile[]): TileCount[] {
    const counts = new Map<string, number>()
    
    tiles.forEach(tile => {
      counts.set(tile.id, (counts.get(tile.id) || 0) + 1)
    })

    return Array.from(counts.entries()).map(([tileId, count]) => ({
      tileId,
      count,
      remaining: 4 - count // Standard set has 4 of each tile
    }))
  }

  // Sort tiles by suit and value
  sortTiles(tiles: PlayerTile[]): PlayerTile[] {
    const suitOrder: TileSuit[] = ['dots', 'bams', 'cracks', 'winds', 'dragons', 'flowers', 'jokers']
    
    return [...tiles].sort((a, b) => {
      // Sort by suit first
      const suitA = suitOrder.indexOf(a.suit)
      const suitB = suitOrder.indexOf(b.suit)
      if (suitA !== suitB) return suitA - suitB
      
      // Then by value within suit
      if (a.suit === 'winds') {
        const windOrder = ['east', 'south', 'west', 'north']
        return windOrder.indexOf(a.value) - windOrder.indexOf(b.value)
      }
      
      if (a.suit === 'dragons') {
        const dragonOrder = ['red', 'green', 'white']
        return dragonOrder.indexOf(a.value) - dragonOrder.indexOf(b.value)
      }
      
      // Numeric values
      const numA = parseInt(a.value)
      const numB = parseInt(b.value)
      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB
      }
      
      // Fallback to string comparison
      return a.value.localeCompare(b.value)
    })
  }

  // Get tiles grouped by suit for display
  getTilesGroupedBySuit(tiles: PlayerTile[]): Record<TileSuit, PlayerTile[]> {
    const groups: Record<TileSuit, PlayerTile[]> = {
      dots: [],
      bams: [],
      cracks: [],
      winds: [],
      dragons: [],
      flowers: [],
      jokers: []
    }

    tiles.forEach(tile => {
      groups[tile.suit].push(tile)
    })

    // Sort each group
    Object.keys(groups).forEach(suit => {
      groups[suit as TileSuit] = this.sortTiles(groups[suit as TileSuit])
    })

    return groups
  }

  // Quick tile search
  searchTiles(query: string): Tile[] {
    if (!this.initialized) {
      this.doInitializeTiles()
    }
    const lowercaseQuery = query.toLowerCase()
    return this.allTiles.filter(tile =>
      tile.displayName.toLowerCase().includes(lowercaseQuery) ||
      tile.id.toLowerCase().includes(lowercaseQuery) ||
      tile.suit.toLowerCase().includes(lowercaseQuery)
    )
  }
}

export const tileService = new TileService()