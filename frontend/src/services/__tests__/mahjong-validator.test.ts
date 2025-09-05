// Mahjong Validator Tests
// Tests for the MahjongValidator service with real pattern validation

import { MahjongValidator, type MahjongDeclaration } from '../mahjong-validator'
import type { NMJL2025Pattern } from '../../../../shared/nmjl-types'
import type { PlayerTile } from '../../types/tile-types'
import type { GameContext } from '../pattern-analysis-engine'

describe('MahjongValidator', () => {
  const mockPattern: NMJL2025Pattern = {
    Year: 2025,
    Section: 'SINGLES AND PAIRS',
    Line: 1,
    'Pattern ID': 1,
    Hands_Key: 'SP-1',
    Hand_Pattern: '1111 2222 3333 44',
    Hand_Description: 'SINGLES AND PAIRS #1',
    Hand_Points: 25,
    Hand_Conceiled: false,
    Hand_Difficulty: 'easy' as const,
    Hand_Notes: null,
    Groups: [
      {
        Group: '1111',
        Suit_Role: 'any' as const,
        Suit_Note: null,
        Constraint_Type: 'pung' as const,
        Constraint_Values: '1',
        Constraint_Must_Match: null,
        Constraint_Extra: null,
        Jokers_Allowed: false,
        display_color: 'blue' as const
      }
    ]
  }

  const mockPlayerTiles: PlayerTile[] = [
    {
      id: '1D',
      suit: 'dots' as const,
      value: '1' as const,
      displayName: 'One Dot',
      instanceId: '1D-1',
      isSelected: false
    },
    {
      id: '1D',
      suit: 'dots' as const,
      value: '1' as const,
      displayName: 'One Dot',
      instanceId: '1D-2',
      isSelected: false
    }
  ]

  const mockGameContext: GameContext = {
    jokersInHand: 0,
    wallTilesRemaining: 100,
    discardPile: [],
    exposedTiles: {},
    currentPhase: 'gameplay'
  }

  describe('quickValidationCheck', () => {
    it('should validate hand with exactly 14 tiles', () => {
      const hand = Array(13).fill(mockPlayerTiles[0])
      const exposed = [mockPlayerTiles[1]]
      
      const result = MahjongValidator.quickValidationCheck(hand, exposed)
      
      expect(result.canDeclare).toBe(true)
    })

    it('should reject hand with wrong tile count', () => {
      const hand = Array(12).fill(mockPlayerTiles[0])
      const exposed: PlayerTile[] = []
      
      const result = MahjongValidator.quickValidationCheck(hand, exposed)
      
      expect(result.canDeclare).toBe(false)
      expect(result.reason).toContain('Need exactly 14 tiles')
    })

    it('should reject hand with no concealed tiles', () => {
      const hand: PlayerTile[] = []
      const exposed = Array(14).fill(mockPlayerTiles[0])
      
      const result = MahjongValidator.quickValidationCheck(hand, exposed)
      
      expect(result.canDeclare).toBe(false)
      expect(result.reason).toContain('Must have at least some concealed tiles')
    })
  })

  describe('getPatternRequirements', () => {
    it('should return correct pattern requirements', () => {
      const requirements = MahjongValidator.getPatternRequirements(mockPattern)
      
      expect(requirements.description).toBe('SINGLES AND PAIRS #1')
      expect(requirements.points).toBe(25)
      expect(requirements.difficulty).toBe('easy')
      expect(requirements.requiresConcealedHand).toBe(false)
      expect(requirements.allowsJokers).toBe(false)
    })
  })

  describe('patternAllowsJokers', () => {
    it('should detect patterns that allow jokers', () => {
      const patternWithJokers: NMJL2025Pattern = {
        ...mockPattern,
        Groups: [
          {
            ...mockPattern.Groups[0],
            Jokers_Allowed: true
          }
        ]
      }
      
      expect(MahjongValidator.patternAllowsJokers(patternWithJokers)).toBe(true)
    })

    it('should detect patterns that do not allow jokers', () => {
      expect(MahjongValidator.patternAllowsJokers(mockPattern)).toBe(false)
    })
  })

  describe('validateMahjongDeclaration', () => {
    it('should handle basic validation errors gracefully', async () => {
      const declaration: MahjongDeclaration = {
        playerId: 'test-player',
        hand: Array(12).fill(mockPlayerTiles[0]), // Invalid count
        exposedTiles: [],
        selectedPattern: mockPattern,
        context: mockGameContext
      }

      const result = await MahjongValidator.validateMahjongDeclaration(declaration)
      
      expect(result.isValid).toBe(false)
      expect(result.violations).toContain('Invalid tile count: 12 tiles (need exactly 14)')
    })

    it('should handle pattern analysis engine failures gracefully', async () => {
      const declaration: MahjongDeclaration = {
        playerId: 'test-player',
        hand: Array(14).fill(mockPlayerTiles[0]),
        exposedTiles: [],
        selectedPattern: mockPattern,
        context: mockGameContext
      }

      // This test will likely fail pattern analysis but should not crash
      const result = await MahjongValidator.validateMahjongDeclaration(declaration)
      
      expect(result).toBeDefined()
      expect(typeof result.isValid).toBe('boolean')
    })
  })
})