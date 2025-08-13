// Tile Service - Core tile management and validation
// Handles all tile-related operations with proper validation

import type { Tile, PlayerTile, TileCount, HandValidation, TileSuit, TileValue } from '../types/tile-types'

class TileService {
  private allTiles: Tile[] = []

  constructor() {
    this.initializeTiles()
  }

  private initializeTiles() {
    const tiles: Tile[] = []

    // Dots (1D-9D) - Red tiles
    for (let i = 1; i <= 9; i++) {
      tiles.push({
        id: `${i}D`,
        suit: 'dots',
        value: i.toString() as TileValue,
        displayName: `${i} Dot${i === 1 ? '' : 's'}`,
        unicodeSymbol: `🀙${String.fromCharCode(0x1F019 + i - 1)}`
      })
    }

    // Bams (1B-9B) - Green tiles  
    for (let i = 1; i <= 9; i++) {
      tiles.push({
        id: `${i}B`,
        suit: 'bams',
        value: i.toString() as TileValue,
        displayName: `${i} Bam${i === 1 ? '' : 's'}`,
        unicodeSymbol: `🀐${String.fromCharCode(0x1F010 + i - 1)}`
      })
    }

    // Cracks (1C-9C) - Blue tiles
    for (let i = 1; i <= 9; i++) {
      tiles.push({
        id: `${i}C`,
        suit: 'cracks',
        value: i.toString() as TileValue,
        displayName: `${i} Crack${i === 1 ? '' : 's'}`,
        unicodeSymbol: `🀇${String.fromCharCode(0x1F007 + i - 1)}`
      })
    }

    // Winds
    const winds = [
      { id: 'east', value: 'east' as TileValue, name: 'East Wind', symbol: '🀀' },
      { id: 'south', value: 'south' as TileValue, name: 'South Wind', symbol: '🀁' },
      { id: 'west', value: 'west' as TileValue, name: 'West Wind', symbol: '🀂' },
      { id: 'north', value: 'north' as TileValue, name: 'North Wind', symbol: '🀃' }
    ]
    
    winds.forEach(wind => {
      tiles.push({
        id: wind.id,
        suit: 'winds',
        value: wind.value,
        displayName: wind.name,
        unicodeSymbol: wind.symbol
      })
    })

    // Dragons
    const dragons = [
      { id: 'red', value: 'red' as TileValue, name: 'Red Dragon', symbol: '🀄' },
      { id: 'green', value: 'green' as TileValue, name: 'Green Dragon', symbol: '🀅' },
      { id: 'white', value: 'white' as TileValue, name: 'White Dragon', symbol: '🀆' }
    ]
    
    dragons.forEach(dragon => {
      tiles.push({
        id: dragon.id,
        suit: 'dragons',
        value: dragon.value,
        displayName: dragon.name,
        unicodeSymbol: dragon.symbol
      })
    })

    // Flowers
    for (let i = 1; i <= 4; i++) {
      tiles.push({
        id: `f${i}`,
        suit: 'flowers',
        value: `f${i}` as TileValue,
        displayName: `Flower ${i}`,
        unicodeSymbol: `🀢${String.fromCharCode(0x1F022 + i - 1)}`
      })
    }

    // Jokers
    tiles.push({
      id: 'joker',
      suit: 'jokers',
      value: 'joker',
      displayName: 'Joker',
      unicodeSymbol: '🃏'
    })

    this.allTiles = tiles
  }

  // Get all available tiles
  getAllTiles(): Tile[] {
    return [...this.allTiles]
  }

  // Get tiles by suit
  getTilesBySuit(suit: TileSuit): Tile[] {
    return this.allTiles.filter(tile => tile.suit === suit)
  }

  // Get tile by ID
  getTileById(id: string): Tile | undefined {
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
    const lowercaseQuery = query.toLowerCase()
    return this.allTiles.filter(tile => 
      tile.displayName.toLowerCase().includes(lowercaseQuery) ||
      tile.id.toLowerCase().includes(lowercaseQuery) ||
      tile.suit.toLowerCase().includes(lowercaseQuery)
    )
  }
}

export const tileService = new TileService()