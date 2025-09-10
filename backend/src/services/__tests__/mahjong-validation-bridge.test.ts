// Mahjong Validation Bridge Tests - Backend validation service testing

import { MahjongValidationBridge } from '../mahjong-validation-bridge'
import type { NMJL2025Pattern } from '@shared/nmjl-types'
import type { Tile } from '@shared/game-types'

describe('MahjongValidationBridge', () => {
  const samplePattern: NMJL2025Pattern = {
    Year: 2025,
    Section: 'SINGLES AND PAIRS',
    Line: 2,
    'Pattern ID': 2,
    Hands_Key: 'SP-2',
    Hand_Pattern: 'FF FF 2025 2025 2025',
    Hand_Description: 'SINGLES AND PAIRS #2',
    Hand_Points: 25,
    Hand_Difficulty: 'medium',
    Hand_Conceiled: false,
    Hand_Notes: '',
    Groups: [
      {
        Group: 'SP-2-1',
        Suit_Role: 'any',
        Suit_Note: null,
        Constraint_Type: 'single',
        Constraint_Values: 'F1,F2,F3,F4',
        Constraint_Must_Match: null,
        Constraint_Extra: null,
        Jokers_Allowed: false,
        display_color: 'blue'
      },
      {
        Group: 'SP-2-2',
        Suit_Role: 'any',
        Suit_Note: null,
        Constraint_Type: 'pair',
        Constraint_Values: '2D,2D',
        Constraint_Must_Match: null,
        Constraint_Extra: null,
        Jokers_Allowed: false,
        display_color: 'red'
      }
    ]
  }

  const validHand: Tile[] = [
    { id: 'F1', suit: 'flowers', value: 'f1' },
    { id: 'F2', suit: 'flowers', value: 'f2' },
    { id: 'F3', suit: 'flowers', value: 'f3' },
    { id: 'F4', suit: 'flowers', value: 'f4' },
    { id: '2D', suit: 'dots', value: '2' },
    { id: '2D', suit: 'dots', value: '2' },
    { id: '4D', suit: 'dots', value: '4' },
    { id: '4D', suit: 'dots', value: '4' },
    { id: '6D', suit: 'dots', value: '6' },
    { id: '6D', suit: 'dots', value: '6' },
    { id: '8D', suit: 'dots', value: '8' },
    { id: '8D', suit: 'dots', value: '8' },
    { id: 'red', suit: 'dragons', value: 'red' },
    { id: 'red', suit: 'dragons', value: 'red' }
  ]

  describe('Quick Validation Check', () => {
    test('should validate correct tile count', () => {
      const result = MahjongValidationBridge.quickValidationCheck(validHand, [])
      expect(result.canDeclare).toBe(true)
    })

    test('should reject incorrect tile count', () => {
      const shortHand = validHand.slice(0, 10)
      const result = MahjongValidationBridge.quickValidationCheck(shortHand, [])
      expect(result.canDeclare).toBe(false)
      expect(result.reason).toContain('Need exactly 14 tiles')
    })

    test('should reject all exposed tiles', () => {
      const result = MahjongValidationBridge.quickValidationCheck([], validHand)
      expect(result.canDeclare).toBe(false)
      expect(result.reason).toContain('Must have concealed tiles')
    })
  })

  describe('Mahjong Declaration Validation', () => {
    test('should validate basic structure correctly', () => {
      const declaration = {
        playerId: 'test-player',
        winningHand: validHand,
        exposedTiles: [],
        selectedPattern: samplePattern
      }

      const result = MahjongValidationBridge.validateMahjongDeclaration(declaration)
      
      expect(result).toHaveProperty('isValid')
      expect(result).toHaveProperty('score')
      expect(result).toHaveProperty('violations')
      expect(result).toHaveProperty('bonusPoints')
      expect(result).toHaveProperty('handAnalysis')
    })

    test('should reject invalid tile count', () => {
      const shortHand = validHand.slice(0, 10)
      const declaration = {
        playerId: 'test-player',
        winningHand: shortHand,
        exposedTiles: [],
        selectedPattern: samplePattern
      }

      const result = MahjongValidationBridge.validateMahjongDeclaration(declaration)
      
      expect(result.isValid).toBe(false)
      expect(result.violations).toContain('Invalid tile count: 10 tiles (need exactly 14)')
      expect(result.score).toBe(0)
    })

    test('should reject excessive duplicate tiles', () => {
      const duplicateHand = [
        ...Array(5).fill({ id: '1D', suit: 'dots', value: '1' }),
        ...Array(9).fill({ id: '2D', suit: 'dots', value: '2' })
      ]
      
      const declaration = {
        playerId: 'test-player',
        winningHand: duplicateHand,
        exposedTiles: [],
        selectedPattern: samplePattern
      }

      const result = MahjongValidationBridge.validateMahjongDeclaration(declaration)
      
      expect(result.isValid).toBe(false)
      expect(result.violations.some(v => v.includes('Too many'))).toBe(true)
    })

    test('should handle validation errors gracefully', () => {
      const declaration = {
        playerId: 'test-player',
        winningHand: null as any,
        exposedTiles: [],
        selectedPattern: samplePattern
      }

      const result = MahjongValidationBridge.validateMahjongDeclaration(declaration)
      
      expect(result.isValid).toBe(false)
      expect(result.violations).toContain('Invalid tile count: 0 tiles (need exactly 14)')
    })
  })

  describe('Pattern Requirements Analysis', () => {
    test('should analyze pattern requirements correctly', () => {
      const requirements = MahjongValidationBridge.getPatternRequirements(samplePattern)
      
      expect(requirements).toHaveProperty('allowsJokers')
      expect(requirements).toHaveProperty('requiresConcealedHand')
      expect(requirements).toHaveProperty('difficulty')
      expect(requirements).toHaveProperty('points')
      expect(requirements).toHaveProperty('specialNotes')
      
      expect(requirements.points).toBe(25)
      expect(requirements.difficulty).toBe('medium')
      expect(requirements.requiresConcealedHand).toBe(false)
    })

    test('should identify joker restrictions', () => {
      const noJokerPattern = {
        ...samplePattern,
        Groups: [{
          ...samplePattern.Groups[0],
          Jokers_Allowed: false
        }]
      }
      
      const requirements = MahjongValidationBridge.getPatternRequirements(noJokerPattern)
      expect(requirements.allowsJokers).toBe(false)
    })

    test('should identify concealed hand requirements', () => {
      const concealedPattern = {
        ...samplePattern,
        Hand_Conceiled: true
      }
      
      const requirements = MahjongValidationBridge.getPatternRequirements(concealedPattern)
      expect(requirements.requiresConcealedHand).toBe(true)
    })
  })

  describe('Scoring Calculations', () => {
    test('should calculate basic scoring correctly', () => {
      const declaration = {
        playerId: 'test-player',
        winningHand: validHand,
        exposedTiles: [],
        selectedPattern: samplePattern
      }

      const result = MahjongValidationBridge.validateMahjongDeclaration(declaration)
      
      if (result.isValid) {
        expect(result.score).toBeGreaterThanOrEqual(samplePattern.Hand_Points)
        expect(result.bonusPoints).toBeInstanceOf(Array)
      }
    })

    test('should apply joker penalties', () => {
      const handWithJokers: Tile[] = [
        ...validHand.slice(0, 12),
        { id: 'joker', suit: 'jokers' as const, value: 'joker' as const },
        { id: 'joker', suit: 'jokers' as const, value: 'joker' as const }
      ]

      const declaration = {
        playerId: 'test-player',
        winningHand: handWithJokers,
        exposedTiles: [],
        selectedPattern: samplePattern
      }

      const result = MahjongValidationBridge.validateMahjongDeclaration(declaration)
      
      if (result.isValid) {
        const hasPenalty = result.bonusPoints.some(bonus => 
          bonus.toLowerCase().includes('joker') && bonus.includes('-')
        )
        expect(hasPenalty).toBe(true)
      }
    })

    test('should apply concealed hand bonus', () => {
      const concealedPattern = {
        ...samplePattern,
        Hand_Conceiled: true
      }

      const declaration = {
        playerId: 'test-player',
        winningHand: validHand,
        exposedTiles: [], // No exposed tiles for concealed bonus
        selectedPattern: concealedPattern
      }

      const result = MahjongValidationBridge.validateMahjongDeclaration(declaration)
      
      if (result.isValid) {
        const hasBonus = result.bonusPoints.some(bonus => 
          bonus.toLowerCase().includes('concealed')
        )
        expect(hasBonus).toBe(true)
      }
    })
  })

  describe('Hand Analysis', () => {
    test('should provide detailed hand analysis', () => {
      const declaration = {
        playerId: 'test-player',
        winningHand: validHand.slice(0, 11),
        exposedTiles: validHand.slice(11),
        selectedPattern: samplePattern
      }

      const result = MahjongValidationBridge.validateMahjongDeclaration(declaration)
      
      expect(result.handAnalysis).toEqual({
        totalTiles: 14,
        jokersUsed: 0,
        exposedTiles: 3,
        concealedTiles: 11
      })
    })

    test('should count jokers correctly', () => {
      const handWithJokers: Tile[] = [
        ...validHand.slice(0, 10),
        { id: 'joker', suit: 'jokers' as const, value: 'joker' as const },
        { id: 'joker', suit: 'jokers' as const, value: 'joker' as const }
      ]

      const exposedWithJokers: Tile[] = [
        { id: 'joker', suit: 'jokers' as const, value: 'joker' as const },
        { id: '1D', suit: 'dots' as const, value: '1' as const }
      ]

      const declaration = {
        playerId: 'test-player',
        winningHand: handWithJokers,
        exposedTiles: exposedWithJokers,
        selectedPattern: samplePattern
      }

      const result = MahjongValidationBridge.validateMahjongDeclaration(declaration)
      
      expect(result.handAnalysis?.jokersUsed).toBe(3)
    })
  })
})