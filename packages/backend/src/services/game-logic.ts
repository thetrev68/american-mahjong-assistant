// Game Logic Service - Core American Mahjong Game Rules Implementation
// Handles tile wall, discard pile, hand validation, and game actions

import type { 
  Tile, 
  ActionType, 
  ExposedSet,
  GamePhase,
  PlayerPosition 
} from 'shared-types'

// Helper function to generate display names for tiles
const getDisplayName = (suit: string, value: string): string => {
  switch (suit) {
    case 'dots':
      return `${value} Dot${value === '1' ? '' : 's'}`
    case 'bams':
      return `${value} Bam${value === '1' ? '' : 's'}`
    case 'cracks':
      return `${value} Crack${value === '1' ? '' : 's'}`
    case 'winds':
      return `${value.charAt(0).toUpperCase() + value.slice(1)} Wind`
    case 'dragons':
      return `${value.charAt(0).toUpperCase() + value.slice(1)} Dragon`
    case 'flowers':
      return `Flower ${value.slice(1)}`
    case 'jokers':
      return 'Joker'
    default:
      return `${value}`
  }
}

interface GameWall {
  remainingTiles: Tile[]
  totalTiles: number
  tilesDealt: number
  isExhausted: boolean
}

interface DiscardPile {
  tiles: Tile[]
  discardHistory: Array<{
    tile: Tile
    playerId: string
    turnNumber: number
    timestamp: Date
    availableFor: {
      pung: boolean
      kong: boolean
      win: boolean
    }
  }>
}

interface GameActionValidation {
  isValid: boolean
  violations: string[]
  alternativeActions?: string[]
}

interface GameActionResult {
  success: boolean
  action: ActionType | string
  playerId: string
  data: unknown
  wallUpdated?: boolean
  discardUpdated?: boolean
  handUpdated?: boolean
  nextPlayer?: string
  gameEnded?: boolean
  error?: string
}

interface PlayerGameData {
  playerId: string
  position: PlayerPosition
  hand: Tile[]
  exposedSets: ExposedSet[]
  hasDrawn: boolean
  canDiscard: boolean
  canCall: boolean
  canWin: boolean
  jokersHeld: number
}

export type GameActionData =
  | { tile: Tile } // discard
  | { targetTile: Tile; setType: 'pung' | 'kong' } // call
  | { jokerTile: Tile; replacementTile: Tile } // joker swap
  | { winningPattern: string; totalScore: number } // mahjong
  | Record<string, never> // pass out (empty data)
  | undefined

export class GameLogicService {
  private wall: GameWall
  private discardPile: DiscardPile
  private playerData: Map<string, PlayerGameData>
  private currentPhase: GamePhase
  private currentPlayer: string | null
  private turnNumber: number
  
  constructor() {
    this.wall = this.initializeWall()
    this.discardPile = this.initializeDiscardPile()
    this.playerData = new Map()
    this.currentPhase = 'waiting'
    this.currentPlayer = null
    this.turnNumber = 0
  }

  /**
   * Initialize complete American Mahjong wall (152 tiles)
   */
  private initializeWall(): GameWall {
    const tiles: Tile[] = []
    
    // Numbers (1-9): 4 copies each for dots, bams, cracks = 108 tiles
    const suits = ['dots', 'bams', 'cracks'] as const
    const numbers = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const
    
    for (const suit of suits) {
      for (const value of numbers) {
        for (let i = 0; i < 4; i++) {
          tiles.push({
            id: `${value}${suit.charAt(0).toUpperCase()}`,
            suit,
            value,
            displayName: getDisplayName(suit, value),
            isJoker: false
          })
        }
      }
    }
    
    // Winds: 4 copies each = 16 tiles
    const winds = ['east', 'south', 'west', 'north'] as const
    for (const wind of winds) {
      for (let i = 0; i < 4; i++) {
        tiles.push({
          id: wind,
          suit: 'winds',
          value: wind,
          displayName: getDisplayName('winds', wind),
          isJoker: false
        })
      }
    }
    
    // Dragons: 4 copies each = 12 tiles
    const dragons = ['red', 'green', 'white'] as const
    for (const dragon of dragons) {
      for (let i = 0; i < 4; i++) {
        tiles.push({
          id: dragon,
          suit: 'dragons',
          value: dragon,
          displayName: getDisplayName('dragons', dragon),
          isJoker: false
        })
      }
    }
    
    // Flowers: 1 copy each = 4 tiles
    const flowers = ['f1', 'f2', 'f3', 'f4'] as const
    for (const flower of flowers) {
      tiles.push({
        id: flower,
        suit: 'flowers',
        value: flower,
        displayName: getDisplayName('flowers', flower),
        isJoker: false
      })
    }
    
    // Jokers: 8 copies = 8 tiles
    for (let i = 0; i < 8; i++) {
      tiles.push({
        id: 'joker',
        suit: 'jokers',
        value: 'joker',
        displayName: getDisplayName('jokers', 'joker'),
        isJoker: true
      })
    }
    
    // Shuffle wall
    this.shuffleArray(tiles)
    
    return {
      remainingTiles: tiles,
      totalTiles: 152,
      tilesDealt: 0,
      isExhausted: false
    }
  }

  /**
   * Initialize empty discard pile
   */
  private initializeDiscardPile(): DiscardPile {
    return {
      tiles: [],
      discardHistory: []
    }
  }

  /**
   * Deal initial hands to players
   */
  dealInitialHands(playerIds: string[]): Map<string, Tile[]> {
    const hands = new Map<string, Tile[]>()
    
    // Each player gets 13 tiles initially
    for (const playerId of playerIds) {
      const hand = this.drawTiles(13)
      hands.set(playerId, hand)
      
      // Initialize player game data
      this.playerData.set(playerId, {
        playerId,
        position: this.getPlayerPosition(playerId, playerIds),
        hand,
        exposedSets: [],
        hasDrawn: false,
        canDiscard: false,
        canCall: false,
        canWin: false,
        jokersHeld: hand.filter(tile => tile.id === 'joker').length
      })
    }
    
    return hands
  }

  /**
   * Validate a player action
   */
  validateAction(playerId: string, action: string, actionData?: GameActionData): GameActionValidation {
    const player = this.playerData.get(playerId)
    
    if (!player) {
      return {
        isValid: false,
        violations: ['Player not found in game']
      }
    }

    switch (action) {
      case 'draw':
        return this.validateDrawAction(player)
      case 'discard':
        return this.validateDiscardAction(player, actionData)
      case 'call_pung':
      case 'call_kong':
        return this.validateCallAction(player, actionData)
      case 'joker-swap':
        return this.validateJokerSwapAction(player, actionData)
      case 'call_mahjong':
        return this.validateMahjongAction(player, actionData)
      case 'pass':
        return this.validatePassOutAction(player)
      default:
        return {
          isValid: false,
          violations: [`Unknown action: ${action}`],
          alternativeActions: ['draw', 'discard', 'pass']
        }
    }
  }

  /**
   * Execute a validated player action
   */
  async executeAction(
    playerId: string,
    action: string,
    actionData?: GameActionData
  ): Promise<GameActionResult> {
    const validation = this.validateAction(playerId, action, actionData)
    
    if (!validation.isValid) {
      return {
        success: false,
        action: action as ActionType,
        playerId,
        data: actionData,
        error: validation.violations.join('; ')
      }
    }

    try {
      switch (action) {
        case 'draw':
          return this.executeDrawAction(playerId)
        case 'discard':
          return this.executeDiscardAction(playerId, actionData)
        case 'call_pung':
        case 'call_kong':
          return this.executeCallAction(playerId, actionData)
        case 'joker-swap':
          return this.executeJokerSwapAction(playerId, actionData)
        case 'call_mahjong':
          return this.executeMahjongAction(playerId, actionData)
        case 'pass':
          return this.executePassOutAction(playerId, actionData)
        default:
          return {
            success: false,
            action: action as ActionType,
            playerId,
            data: actionData,
            error: `Action ${action} not implemented`
          }
      }
    } catch (error) {
      return {
        success: false,
        action: action as ActionType,
        playerId,
        data: actionData,
        error: error instanceof Error ? error.message : 'Action execution failed'
      }
    }
  }

  /**
   * Draw tiles from wall
   */
  private drawTiles(count: number): Tile[] {
    const tiles: Tile[] = []
    
    for (let i = 0; i < count; i++) {
      if (this.wall.remainingTiles.length === 0) {
        this.wall.isExhausted = true
        break
      }
      
      tiles.push(this.wall.remainingTiles.pop()!)
      this.wall.tilesDealt++
    }
    
    return tiles
  }

  /**
   * Get player position based on player order
   */
  private getPlayerPosition(playerId: string, playerIds: string[]): PlayerPosition {
    const positions: PlayerPosition[] = ['east', 'south', 'west', 'north']
    const index = playerIds.indexOf(playerId)
    return positions[index % 4]
  }

  /**
   * Validation: Draw Action
   */
  private validateDrawAction(player: PlayerGameData): GameActionValidation {
    const violations: string[] = []
    
    if (player.hasDrawn) {
      violations.push('Player has already drawn this turn')
    }
    
    if (this.wall.isExhausted) {
      violations.push('Wall is exhausted - cannot draw')
    }
    
    if (player.hand.length >= 14) {
      violations.push('Hand is full - must discard before drawing')
    }
    
    return {
      isValid: violations.length === 0,
      violations,
      alternativeActions: violations.length > 0 ? ['discard', 'pass-out'] : undefined
    }
  }

  /**
   * Validation: Discard Action
   */
  private validateDiscardAction(player: PlayerGameData, actionData: GameActionData): GameActionValidation {
    const violations: string[] = []
    
    if (!player.hasDrawn && player.hand.length === 13) {
      violations.push('Must draw before discarding')
    }
    
    if (!actionData || !('tile' in actionData)) {
      violations.push('No tile specified for discard')
      return { isValid: false, violations }
    }

    const tileInHand = player.hand.find(tile => tile.id === actionData.tile.id)
    if (!tileInHand) {
      violations.push('Tile not found in hand')
    }
    
    return {
      isValid: violations.length === 0,
      violations,
      alternativeActions: violations.length > 0 ? ['draw'] : undefined
    }
  }

  /**
   * Validation: Call Action (pung/kong)
   */
  private validateCallAction(player: PlayerGameData, actionData: GameActionData): GameActionValidation {
    const violations: string[] = []
    
    if (!actionData || !('targetTile' in actionData) || !('setType' in actionData)) {
      violations.push('Invalid call action data - must include targetTile and setType')
      return { isValid: false, violations }
    }

    if (!['pung', 'kong'].includes(actionData.setType)) {
      violations.push('Invalid call type - must be pung or kong')
    }
    
    if (this.discardPile.tiles.length === 0) {
      violations.push('No tiles available in discard pile')
    }
    
    // Check if player has required tiles for the call
    if (actionData.setType === 'pung') {
      const matchingTiles = player.hand.filter(tile =>
        tile.id === actionData.targetTile.id || tile.id === 'joker'
      )
      if (matchingTiles.length < 2) {
        violations.push(`Need at least 2 matching tiles for pung (have ${matchingTiles.length})`)
      }
    }

    if (actionData.setType === 'kong') {
      const matchingTiles = player.hand.filter(tile =>
        tile.id === actionData.targetTile.id || tile.id === 'joker'
      )
      if (matchingTiles.length < 3) {
        violations.push(`Need at least 3 matching tiles for kong (have ${matchingTiles.length})`)
      }
    }
    
    return {
      isValid: violations.length === 0,
      violations,
      alternativeActions: violations.length > 0 ? ['draw', 'discard'] : undefined
    }
  }

  /**
   * Validation: Joker Swap Action
   */
  private validateJokerSwapAction(player: PlayerGameData, actionData: GameActionData): GameActionValidation {
    const violations: string[] = []
    
    if (!actionData || !('jokerTile' in actionData) || !('replacementTile' in actionData)) {
      violations.push('Must specify both joker tile and replacement tile')
      return { isValid: false, violations }
    }
    
    if (player.jokersHeld === 0) {
      violations.push('Player has no jokers to swap')
    }
    
    // Check if replacement tile is valid for exposed sets
    const hasExposedSets = player.exposedSets.length > 0
    if (!hasExposedSets) {
      violations.push('No exposed sets available for joker swap')
    }
    
    return {
      isValid: violations.length === 0,
      violations,
      alternativeActions: violations.length > 0 ? ['draw', 'discard'] : undefined
    }
  }

  /**
   * Validation: Mahjong Declaration
   */
  private validateMahjongAction(player: PlayerGameData, actionData: GameActionData): GameActionValidation {
    const violations: string[] = []
    
    const totalTiles = player.hand.length + player.exposedSets.reduce((sum, set) => sum + set.tiles.length, 0)
    if (totalTiles !== 14) {
      violations.push(`Invalid tile count for mahjong: ${totalTiles} (need exactly 14)`)
    }
    
    if (!actionData || !('winningPattern' in actionData)) {
      violations.push('Must specify winning pattern')
    }

    if (!actionData || !('totalScore' in actionData)) {
      violations.push('Must provide total score for mahjong')
    }
    
    return {
      isValid: violations.length === 0,
      violations,
      alternativeActions: violations.length > 0 ? ['discard', 'pass-out'] : undefined
    }
  }

  /**
   * Validation: Pass Out Action
   */
  private validatePassOutAction(_player: PlayerGameData): GameActionValidation {
    // Pass out is always valid - it's a forfeit action
    return {
      isValid: true,
      violations: []
    }
  }

  /**
   * Execute: Draw Action
   */
  private executeDrawAction(playerId: string): GameActionResult {
    const player = this.playerData.get(playerId)!
    const drawnTiles = this.drawTiles(1)
    
    if (drawnTiles.length === 0) {
      return {
        success: false,
        action: 'draw',
        playerId,
        data: {},
        error: 'No tiles available to draw'
      }
    }
    
    player.hand.push(drawnTiles[0])
    player.hasDrawn = true
    player.canDiscard = true
    player.canWin = player.hand.length === 14
    
    return {
      success: true,
      action: 'draw',
      playerId,
      data: {
        tilesDrawn: drawnTiles.length,
        wallTilesRemaining: this.wall.remainingTiles.length,
        handSize: player.hand.length
      },
      wallUpdated: true,
      handUpdated: true
    }
  }

  /**
   * Execute: Discard Action
   */
  private executeDiscardAction(playerId: string, actionData: GameActionData): GameActionResult {
    const player = this.playerData.get(playerId)!
    if (!actionData || !('tile' in actionData)) {
      throw new Error('Invalid discard action data')
    }
    const tileToDiscard = actionData.tile
    
    // Remove tile from hand
    const tileIndex = player.hand.findIndex(tile => tile.id === tileToDiscard.id)
    player.hand.splice(tileIndex, 1)
    
    // Add to discard pile
    this.discardPile.tiles.push(tileToDiscard)
    this.discardPile.discardHistory.push({
      tile: tileToDiscard,
      playerId,
      turnNumber: this.turnNumber,
      timestamp: new Date(),
      availableFor: {
        pung: true,
        kong: true,
        win: true
      }
    })
    
    // Update player state
    player.hasDrawn = false
    player.canDiscard = false
    player.canCall = false
    player.canWin = false
    
    return {
      success: true,
      action: 'discard',
      playerId,
      data: {
        tileDiscarded: tileToDiscard,
        handSize: player.hand.length,
        discardPileSize: this.discardPile.tiles.length
      },
      discardUpdated: true,
      handUpdated: true,
      nextPlayer: this.getNextPlayer(playerId)
    }
  }

  /**
   * Execute: Call Action (pung/kong)
   */
  private executeCallAction(playerId: string, actionData: GameActionData): GameActionResult {
    const player = this.playerData.get(playerId)!
    if (!actionData || !('targetTile' in actionData) || !('setType' in actionData)) {
      throw new Error('Invalid call action data')
    }
    const { setType, targetTile } = actionData

    // Get the discarded tile
    const discardedTile = this.discardPile.tiles.pop()!

    // Remove matching tiles from hand
    const tilesForSet: Tile[] = [discardedTile]
    const neededTiles = setType === 'pung' ? 2 : 3
    
    for (let i = 0; i < neededTiles && tilesForSet.length <= neededTiles; i++) {
      const matchingIndex = player.hand.findIndex(tile => 
        tile.id === targetTile.id || tile.id === 'joker'
      )
      if (matchingIndex >= 0) {
        tilesForSet.push(player.hand.splice(matchingIndex, 1)[0])
      }
    }
    
    // Create exposed set
    const exposedSet: ExposedSet = {
      type: setType,
      tiles: tilesForSet,
      calledFrom: this.getLastDiscardingPlayer() as PlayerPosition,
      timestamp: Date.now()
    }
    
    player.exposedSets.push(exposedSet)
    player.canDiscard = true
    player.canWin = (player.hand.length + this.getTotalExposedTiles(player)) === 14
    
    return {
      success: true,
      action: 'call',
      playerId,
      data: {
        setType,
        exposedSet,
        handSize: player.hand.length,
        exposedSets: player.exposedSets.length
      },
      discardUpdated: true,
      handUpdated: true,
      nextPlayer: playerId // Calling player gets next turn
    }
  }

  /**
   * Execute: Joker Swap Action
   */
  private executeJokerSwapAction(playerId: string, actionData: GameActionData): GameActionResult {
    const player = this.playerData.get(playerId)!
    if (!actionData || !('replacementTile' in actionData)) {
      throw new Error('Invalid joker swap action data')
    }
    const { replacementTile } = actionData
    
    // Find the exposed set containing the joker
    const exposedSet = player.exposedSets.find(set => 
      set.tiles.some((tile: Tile) => tile.id === 'joker')
    )
    
    if (!exposedSet) {
      return {
        success: false,
        action: 'joker-swap',
        playerId,
        data: actionData,
        error: 'No joker found in exposed sets'
      }
    }
    
    // Replace joker with actual tile
    const jokerIndex = exposedSet.tiles.findIndex((tile: Tile) => tile.id === 'joker')
    exposedSet.tiles[jokerIndex] = replacementTile
    
    // Add joker to hand
    player.hand.push({
      id: 'joker',
      suit: 'jokers',
      value: 'joker',
      displayName: getDisplayName('jokers', 'joker'),
      isJoker: true
    })
    
    player.jokersHeld++
    
    return {
      success: true,
      action: 'joker-swap',
      playerId,
      data: {
        swappedJoker: true,
        exposedSet,
        jokersInHand: player.jokersHeld
      },
      handUpdated: true
    }
  }

  /**
   * Execute: Mahjong Declaration
   */
  private executeMahjongAction(playerId: string, actionData: GameActionData): GameActionResult {
    // const player = this.playerData.get(playerId)!
    if (!actionData || !('winningPattern' in actionData) || !('totalScore' in actionData)) {
      throw new Error('Invalid mahjong action data')
    }

    // In a full implementation, this would integrate with MahjongValidator
    // For now, we'll assume the frontend has already validated the win

    return {
      success: true,
      action: 'mahjong',
      playerId,
      data: {
        winner: playerId,
        winningPattern: actionData.winningPattern,
        totalScore: actionData.totalScore
      },
      gameEnded: true
    }
  }

  /**
   * Execute: Pass Out Action
   */
  private executePassOutAction(playerId: string, actionData: GameActionData): GameActionResult {
    // const player = this.playerData.get(playerId)!

    // Mark player as passed out
    // In the socket handler, this will be tracked in game state

    const reason = (actionData as { reason?: string })?.reason || 'Player chose to pass out'

    return {
      success: true,
      action: 'pass',
      playerId,
      data: {
        reason,
        remainingPlayers: Array.from(this.playerData.keys()).filter(id => id !== playerId)
      },
      nextPlayer: this.getNextPlayer(playerId)
    }
  }

  /**
   * Get next player in turn order
   */
  private getNextPlayer(currentPlayerId: string): string {
    const playerIds = Array.from(this.playerData.keys())
    const currentIndex = playerIds.indexOf(currentPlayerId)
    const nextIndex = (currentIndex + 1) % playerIds.length
    return playerIds[nextIndex]
  }

  /**
   * Get the player who made the last discard
   */
  private getLastDiscardingPlayer(): string {
    const lastDiscard = this.discardPile.discardHistory[this.discardPile.discardHistory.length - 1]
    return lastDiscard?.playerId || ''
  }

  /**
   * Get total tiles in exposed sets for a player
   */
  private getTotalExposedTiles(player: PlayerGameData): number {
    return player.exposedSets.reduce((sum, set) => sum + set.tiles.length, 0)
  }

  /**
   * Check if wall is exhausted
   */
  isWallExhausted(minTilesNeeded: number = 8): boolean {
    return this.wall.remainingTiles.length < minTilesNeeded
  }

  /**
   * Get current game state
   */
  getGameState() {
    return {
      wall: {
        tilesRemaining: this.wall.remainingTiles.length,
        totalDealt: this.wall.tilesDealt,
        isExhausted: this.wall.isExhausted
      },
      discardPile: {
        tileCount: this.discardPile.tiles.length,
        lastTile: this.discardPile.tiles[this.discardPile.tiles.length - 1],
        history: this.discardPile.discardHistory.slice(-5) // Last 5 discards
      },
      players: Array.from(this.playerData.values()).map(player => ({
        playerId: player.playerId,
        position: player.position,
        handSize: player.hand.length,
        exposedSets: player.exposedSets.length,
        hasDrawn: player.hasDrawn,
        canDiscard: player.canDiscard,
        canCall: player.canCall,
        canWin: player.canWin,
        jokersHeld: player.jokersHeld
      })),
      currentPhase: this.currentPhase,
      currentPlayer: this.currentPlayer,
      turnNumber: this.turnNumber
    }
  }

  /**
   * Utility: Shuffle array in place
   */
  private shuffleArray<T>(array: T[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]]
    }
  }
}