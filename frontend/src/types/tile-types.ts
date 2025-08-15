// Modern Tile System Types
// Clean, type-safe definitions for American Mahjong tiles

export type TileSuit = 'dots' | 'bams' | 'cracks' | 'winds' | 'dragons' | 'flowers' | 'jokers'

export type TileValue = 
  | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'  // Numbers
  | 'east' | 'south' | 'west' | 'north'                 // Winds
  | 'red' | 'green' | 'white'                           // Dragons  
  | 'f1' | 'f2' | 'f3' | 'f4'                          // Flowers
  | 'joker'                                             // Joker

export interface Tile {
  id: string           // Unique identifier (e.g., "1D", "east", "joker")
  suit: TileSuit
  value: TileValue
  displayName: string  // Human-readable name (e.g., "One Dot", "East Wind")
  unicodeSymbol?: string // Unicode representation for display
}

export interface PlayerTile extends Tile {
  instanceId: string   // Unique instance for multiple same tiles
  isSelected: boolean  // UI selection state
  // Future enhancement: animation and recommendation features
  animation?: TileAnimation
  recommendation?: TileRecommendation
}

// Future enhancement: Tile animation system
export interface TileAnimation {
  type: 'keep' | 'pass' | 'discard' | 'joker' | 'dragon' | 'select' | 'deselect'
  duration: number     // Animation duration in ms
  delay?: number       // Optional delay before animation starts
}

// Future enhancement: AI recommendation system for tiles
export interface TileRecommendation {
  action: 'keep' | 'pass' | 'discard' | 'neutral'
  confidence: number   // 0-100
  reasoning: string    // Why this recommendation was made
  priority: number     // Higher = more important
}

export interface TileCount {
  tileId: string
  count: number
  remaining: number    // How many left in play
}

export interface HandValidation {
  isValid: boolean
  errors: string[]
  warnings: string[]
  tileCount: number
  expectedCount: number
  duplicateErrors: string[]
}

export type TileInputMode = 'select' | 'count' | 'quick-input'

export interface TileInputState {
  selectedTiles: PlayerTile[]
  inputMode: TileInputMode
  isValidating: boolean
  validation: HandValidation
  showRecommendations: boolean
}