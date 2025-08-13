// NMJL 2025 Pattern Type Definitions
// Simplified and modernized for the co-pilot architecture

export type ConstraintType = 'kong' | 'pung' | 'sequence' | 'pair' | 'single' | 'consecutive' | 'like'
export type SuitRole = 'first' | 'second' | 'third' | 'any' | 'none'
export type HandDifficulty = 'easy' | 'medium' | 'hard'

export interface PatternGroup {
  Group: string
  Suit_Role: SuitRole
  Suit_Note: string | null
  Constraint_Type: ConstraintType
  Constraint_Values: string
  Constraint_Must_Match: string | null
  Constraint_Extra: string | null
  Jokers_Allowed: boolean
}

export interface NMJL2025Pattern {
  Year: number
  Section: number
  Line: number
  'Pattern ID': number
  Hands_Key: string
  Hand_Pattern: string
  Hand_Description: string
  Hand_Points: number
  Hand_Conceiled: boolean
  Hand_Difficulty: HandDifficulty
  Hand_Notes: string | null
  Groups: PatternGroup[]
}

export interface PatternSelectionOption {
  id: number
  displayName: string
  pattern: string
  points: number
  difficulty: HandDifficulty
  description: string
  section: number
  allowsJokers: boolean
}

export interface PatternProgress {
  patternId: number
  completionPercentage: number
  tilesNeeded: number
  completingTiles: string[]
  canUseJokers: boolean
  jokersNeeded: number
}