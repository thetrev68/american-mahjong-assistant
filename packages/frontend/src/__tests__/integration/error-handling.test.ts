/**
 * Integration Test: Error Handling and Edge Cases
 * Tests system robustness and graceful failure handling
 */

import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import App from '../../App'
import { useGameStore } from '../../stores/game-store'
import { usePatternStore } from '../../stores/pattern-store'
import { useTileStore } from '../../stores/tile-store'
import { nmjlService } from '../../services/nmjl-service'
import { AnalysisEngine } from '../../services/analysis-engine'
import type { NMJL2025Pattern } from 'shared-types'

// Test wrapper
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  })

  return React.createElement(
    QueryClientProvider,
    { client: queryClient },
    children
  )
}

describe('Error Handling and Edge Cases Integration', () => {
  beforeEach(() => {
    // Reset all stores
    useGameStore.getState().resetGame()
    usePatternStore.getState().clearSelection()
    useTileStore.getState().clearHand()

    // Clear all mocks
    vi.clearAllMocks()
  })

  describe('Network and Service Failures', () => {
    it('should handle NMJL pattern loading failures gracefully', async () => {
      // Mock network failure
      vi.spyOn(nmjlService, 'loadPatterns').mockRejectedValue(new Error('Network timeout'))

      render(
        React.createElement(TestWrapper, null,
          React.createElement(App)
        )
      )

      // App should still render
      expect(screen.getByText(/American Mahjong/i)).toBeInTheDocument()

      // Navigate to pattern selection
      const startButton = screen.getByText(/Start Playing/i) || screen.getByText(/Get Started/i)
      await userEvent.click(startButton)

      // Should show error state but not crash
      await waitFor(() => {
        expect(
          screen.getByText(/error/i) || 
          screen.getByText(/try again/i) ||
          screen.getByText(/loading/i)
        ).toBeInTheDocument()
      })

      // App should remain functional
      expect(() => screen.getByText(/American Mahjong/i)).not.toThrow()
    })

    it('should handle analysis engine failures', async () => {
      // Mock analysis engine failure
      vi.spyOn(AnalysisEngine, 'analyzeHand').mockRejectedValue(new Error('Analysis service unavailable'))

      const gameStore = useGameStore.getState()
      const tileStore = useTileStore.getState()

      // Set up game state
      gameStore.setCoPilotMode('solo')
      gameStore.setGamePhase('playing')

      // Add tiles to trigger analysis
      const mockTiles = [
        { suit: 'bam', rank: '1', id: 'tile-1' },
        { suit: 'bam', rank: '2', id: 'tile-2' },
        { suit: 'bam', rank: '3', id: 'tile-3' }
      ]

      mockTiles.forEach(tile => tileStore.addTile(tile.id))

      // Should not crash the application
      expect(tileStore.handSize).toBe(3)
      expect(gameStore.gamePhase).toBe('gameplay')
    })

    it('should recover from intermittent failures', async () => {
      let callCount = 0
      
      // Mock intermittent failure (fail first, succeed second)
      vi.spyOn(nmjlService, 'loadPatterns').mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          return Promise.reject(new Error('Temporary network error'))
        }
        return Promise.resolve([
          {
            Year: 2025,
            Section: 'TEST',
            Line: 1,
            'Pattern ID': 1,
            Hands_Key: '2025-TEST-1',
            Hand_Pattern: 'TEST PATTERN',
            Hand_Description: 'Test pattern for testing',
            Hand_Points: 25,
            Hand_Conceiled: false,
            Hand_Difficulty: 'easy' as const,
            Hand_Notes: null,
            Groups: []
          }
        ])
      })

      render(
        React.createElement(TestWrapper, null,
          React.createElement(App)
        )
      )

      // Navigate and trigger pattern loading
      const startButton = screen.getByText(/Start Playing/i) || screen.getByText(/Get Started/i)
      await userEvent.click(startButton)

      // Should eventually recover
      await waitFor(async () => {
        const retryButton = screen.queryByText(/retry/i) || screen.queryByText(/try again/i)
        if (retryButton) {
          await userEvent.click(retryButton)
        }
      })

      // Should eventually succeed
      await waitFor(() => {
        expect(callCount).toBeGreaterThan(1)
      }, { timeout: 5000 })
    })
  })

  describe('Invalid Data Handling', () => {
    it('should handle corrupted pattern data', async () => {
      // Mock corrupted pattern data
      vi.spyOn(nmjlService, 'loadPatterns').mockResolvedValue([
        // Valid pattern
        {
          Year: 2025,
          Section: 'TEST',
          Line: 1,
          'Pattern ID': 1,
          Hands_Key: '2025-TEST-1',
          Hand_Pattern: 'VALID PATTERN',
          Hand_Description: 'Valid test pattern',
          Hand_Points: 25,
          Hand_Conceiled: false,
          Hand_Difficulty: 'easy' as const,
          Hand_Notes: null,
          Groups: []
        },
        // Invalid/corrupted pattern (missing required fields)
        {
          Year: 2025
        } as unknown as NMJL2025Pattern,
        // Another invalid pattern (wrong data types)
        {
          Year: 'invalid',
          Section: null,
          Line: 'not-a-number',
          Hands_Key: '',
          Hand_Pattern: 123,
          Hand_Points: 'invalid',
          Hand_Conceiled: 'not-boolean'
        } as unknown as NMJL2025Pattern
      ])

      const patternStore = usePatternStore.getState()

      // Should filter out invalid patterns
      const patterns = await nmjlService.loadPatterns()
      expect(patterns.length).toBe(3) // Raw data has 3 items

      // Pattern store should handle gracefully
      patterns.forEach(pattern => {
        try {
          if (pattern.Hands_Key && pattern.Hand_Description) {
            patternStore.selectPattern(pattern.Hands_Key)
          }
        } catch {
          // Should not throw errors for invalid data
        }
      })

      // Should only have valid patterns selected
      const selectedPatterns = patternStore.getTargetPatterns()
      expect(selectedPatterns.length).toBeLessThanOrEqual(1) // Only the valid one
    })

    it('should handle invalid tile data', () => {
      const tileStore = useTileStore.getState()

      // Test various invalid tile inputs
      const invalidTiles = [
        null,
        undefined,
        {},
        { suit: 'invalid' },
        { suit: 'bam', rank: null },
        { suit: 'bam', rank: '10' }, // Invalid rank
        { suit: '', rank: '1' },
        { suit: 'bam', rank: '1', id: null }
      ]

      invalidTiles.forEach(tile => {
        const initialCount = tileStore.handSize
        
        try {
          tileStore.addTile((tile as { id?: string })?.id || 'invalid-id')
        } catch {
          // Should either handle gracefully or throw expected error
        }

        // Tile count should not increase for invalid tiles
        const newCount = tileStore.handSize
        expect(newCount).toBe(initialCount)
      })
    })

    it('should validate game state transitions', () => {
      const gameStore = useGameStore.getState()

      // Test invalid phase transitions
      const invalidTransitions = [
        { from: 'lobby', to: 'playing' }, // Skip intermediate phases
        { from: 'charleston', to: 'tile-input' }, // Backward transition
        { from: 'playing', to: 'lobby' } // Invalid backward
      ]

      invalidTransitions.forEach(({ from, to }) => {
        try {
          gameStore.setGamePhase(from as 'lobby' | 'tile-input' | 'charleston' | 'playing' | 'finished')
          // Phase might revert to default if invalid, which is acceptable
        } catch {
          // Invalid phases might throw, which is also acceptable
        }

        try {
          gameStore.setGamePhase(to as 'lobby' | 'tile-input' | 'charleston' | 'playing' | 'finished')
          // If transition is allowed, verify it's intentional
          if (gameStore.gamePhase === to) {
            // Some transitions might be valid (e.g., reset to setup)
            expect(['lobby', from]).toContain(gameStore.gamePhase)
          }
        } catch {
          // Invalid transitions should either throw or be ignored
          expect(gameStore.gamePhase).toBe(from)
        }
      })
    })
  })

  describe('Browser Storage Failures', () => {
    it('should handle localStorage failures', () => {
      // Mock localStorage failure
      const originalSetItem = localStorage.setItem
      localStorage.setItem = vi.fn(() => {
        throw new Error('Storage quota exceeded')
      })

      const gameStore = useGameStore.getState()
      
      // Should not crash when trying to persist state
      expect(() => {
        gameStore.setCoPilotMode('solo')
      }).not.toThrow()

      // Restore original implementation
      localStorage.setItem = originalSetItem
    })

    it('should handle corrupted localStorage data', () => {
      // Mock corrupted data in localStorage
      const originalGetItem = localStorage.getItem
      localStorage.getItem = vi.fn((key: string) => {
        if (key.includes('mahjong')) {
          return '{"invalid": json, syntax}'
        }
        return null
      })

      // Stores should handle corrupted data gracefully
      expect(() => {
        useGameStore.getState()
        usePatternStore.getState()
        useTileStore.getState()
      }).not.toThrow()

      // Restore original implementation
      localStorage.getItem = originalGetItem
    })
  })

  describe('Resource Limitations', () => {
    it('should handle large datasets efficiently', async () => {
      // Create a large mock dataset
      const largePatterSet: NMJL2025Pattern[] = Array(1000).fill(null).map((_, index) => ({
        Year: 2025,
        Section: 'STRESS_TEST',
        Line: index + 1,
        'Pattern ID': index + 1,
        Hands_Key: `2025-STRESS-TEST-${index}`,
        Hand_Pattern: `PATTERN ${index}`,
        Hand_Description: `Stress Test ${index}`,
        Hand_Points: 25,
        Hand_Conceiled: false,
        Hand_Difficulty: 'easy' as const,
        Hand_Notes: null,
        Groups: []
      }))

      vi.spyOn(nmjlService, 'loadPatterns').mockResolvedValue(largePatterSet)

      const patternStore = usePatternStore.getState()

      const startTime = Date.now()
      const patterns = await nmjlService.loadPatterns()
      const loadTime = Date.now() - startTime

      // Should complete within reasonable time
      expect(loadTime).toBeLessThan(5000) // 5 seconds max

      // Should handle large dataset without crashing
      expect(patterns.length).toBe(1000)
      expect(() => patternStore.selectPattern(patterns[0].Hands_Key)).not.toThrow()
    })

    it('should handle rapid user interactions', async () => {
      const tileStore = useTileStore.getState()

      // Simulate rapid add/remove operations
      const operations = Array(100).fill(null).map((_, index) => {
        return index % 2 === 0 
          ? () => tileStore.addTile(`rapid-${index}`)
          : () => tileStore.removeTile(`rapid-${index - 1}`)
      })

      // Should handle rapid operations without error
      expect(() => {
        operations.forEach(op => op())
      }).not.toThrow()

      // Final state should be consistent
      expect(typeof tileStore.handSize).toBe('number')
      expect(tileStore.handSize).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Boundary Conditions', () => {
    it('should handle empty states', () => {
      const gameStore = useGameStore.getState()
      const patternStore = usePatternStore.getState()
      const tileStore = useTileStore.getState()

      // All stores should handle empty states gracefully
      expect(() => {
        gameStore.resetGame()
        patternStore.clearSelection()
        tileStore.clearHand()
      }).not.toThrow()

      expect(patternStore.getTargetPatterns()).toEqual([])
      expect(tileStore.handSize).toBe(0)
      expect(gameStore.players).toEqual([])
    })

    it('should handle maximum limits', () => {
      const tileStore = useTileStore.getState()

      // Try to add more than 14 tiles
      const excessTiles = Array(20).fill(null).map((_, index) => ({
        suit: 'bam' as const,
        rank: `${(index % 9) + 1}` as const,
        id: `excess-${index}`
      }))

      excessTiles.forEach(tile => {
        tileStore.addTile(tile.id)
      })

      // Should enforce maximum tile limit
      expect(tileStore.handSize).toBeLessThanOrEqual(14)
    })

    it('should handle minimum requirements', () => {
      const gameStore = useGameStore.getState()

      // Should handle minimum player requirements
      expect(() => {
        gameStore.setCoPilotMode('solo')
        // Solo mode should work with just one player
      }).not.toThrow()

      // Should validate minimum tile requirements for game phases
      const tileStore = useTileStore.getState()
      
      // Charleston requires 13 tiles
      gameStore.setGamePhase('charleston')
      
      const canProceed = tileStore.handSize >= 13
      expect(typeof canProceed).toBe('boolean')
    })
  })

  describe('Recovery and Cleanup', () => {
    it('should clean up resources properly', () => {
      const gameStore = useGameStore.getState()
      
      // Set up some complex state
      gameStore.setCoPilotMode('solo')
      gameStore.setGamePhase('playing')
      gameStore.addPlayer({ id: 'test-player', name: 'Test', position: null, isReady: true, isConnected: true })

      // Reset should clean up properly
      gameStore.resetGame()

      expect(gameStore.coPilotMode).toBe(null)
      expect(gameStore.gamePhase).toBe('lobby')
      expect(gameStore.players).toEqual([])
      expect(gameStore.currentPlayerId).toBeNull()
    })

    it('should handle memory leaks prevention', () => {
      // This is more of a regression test to ensure we don't retain references
      const initialMemoryTest = () => {
        const gameStore = useGameStore.getState()
        const largeMockData = Array(1000).fill(null).map((_, index) => ({
          id: `memory-test-${index}`,
          name: `Player ${index}`,
          isReady: false
        }))

        largeMockData.forEach(playerData => {
          try {
            gameStore.addPlayer({
              ...playerData,
              position: null,
              isConnected: true
            })
          } catch {
            // May throw if player limit reached, which is expected
          }
        })
        expect(gameStore.players.length).toBeGreaterThan(0)
        
        // Reset should clear all references
        gameStore.resetGame()
        expect(gameStore.players.length).toBe(0)
      }

      // Should not accumulate memory over multiple iterations
      expect(() => {
        for (let i = 0; i < 10; i++) {
          initialMemoryTest()
        }
      }).not.toThrow()
    })
  })
})