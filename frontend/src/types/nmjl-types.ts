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
  display_color: 'blue' | 'red' | 'green'
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
  id: string // Now using Hands_Key which is a string
  patternId: number // Original Pattern ID for reference
  displayName: string
  pattern: string
  points: number
  difficulty: HandDifficulty
  description: string
  section: string | number // Can be string like "2025" or "ANY LIKE NUMBERS"
  line: number // Line number within the section
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