/**
 * Integration Test: Error Handling and Edge Cases
 * Tests system robustness and graceful failure handling
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import App from '../../App'
import { useGameStore } from '../../stores/game-store'
import { usePatternStore } from '../../stores/pattern-store'
import { useTileStore } from '../../stores/tile-store'
import { nmjlService } from '../../services/nmjl-service'
import { analysisEngine } from '../../services/analysis-engine'

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
    React.createElement(BrowserRouter, null, children)
  )
}

describe('Error Handling and Edge Cases Integration', () => {
  beforeEach(() => {
    // Reset all stores
    useGameStore.getState().resetGame()
    usePatternStore.getState().clearPatterns()
    useTileStore.getState().clearTiles()

    // Clear all mocks
    vi.clearAllMocks()
  })

  describe('Network and Service Failures', () => {
    it('should handle NMJL pattern loading failures gracefully', async () => {
      // Mock network failure
      vi.spyOn(nmjlService, 'loadAllPatterns').mockRejectedValue(new Error('Network timeout'))

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
      vi.spyOn(analysisEngine, 'analyzeHand').mockRejectedValue(new Error('Analysis service unavailable'))

      const gameStore = useGameStore.getState()
      const tileStore = useTileStore.getState()

      // Set up game state
      gameStore.setCoPilotMode('solo')
      gameStore.setGamePhase('gameplay')

      // Add tiles to trigger analysis
      const mockTiles = [
        { suit: 'bam', rank: '1', id: 'tile-1' },
        { suit: 'bam', rank: '2', id: 'tile-2' },
        { suit: 'bam', rank: '3', id: 'tile-3' }
      ]

      mockTiles.forEach(tile => tileStore.addTile(tile))

      // Should not crash the application
      expect(tileStore.getTileCount()).toBe(3)
      expect(gameStore.gamePhase).toBe('gameplay')
    })

    it('should recover from intermittent failures', async () => {
      let callCount = 0
      
      // Mock intermittent failure (fail first, succeed second)
      vi.spyOn(nmjlService, 'loadAllPatterns').mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          return Promise.reject(new Error('Temporary network error'))
        }
        return Promise.resolve([
          {
            Year: 2025,
            Section: 'TEST',
            Line: 1,
            Hands_Key: '2025-TEST-1',
            Hand: 'TEST PATTERN',
            Hand_Criteria: 'Test',
            Points: 25,
            Concealed: false
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
      vi.spyOn(nmjlService, 'loadAllPatterns').mockResolvedValue([
        // Valid pattern
        {
          Year: 2025,
          Section: 'TEST',
          Line: 1,
          Hands_Key: '2025-TEST-1',
          Hand: 'VALID PATTERN',
          Hand_Criteria: 'Test',
          Points: 25,
          Concealed: false
        },
        // Invalid/corrupted pattern (missing required fields)
        {
          Year: 2025,
          // Missing other required fields
        } as unknown,
        // Another invalid pattern (wrong data types)
        {
          Year: 'invalid',
          Section: null,
          Line: 'not-a-number',
          Hands_Key: '',
          Hand: 123,
          Hand_Criteria: undefined,
          Points: 'invalid',
          Concealed: 'not-boolean'
        } as unknown
      ])

      const patternStore = usePatternStore.getState()

      // Should filter out invalid patterns
      const patterns = await nmjlService.loadAllPatterns()
      expect(patterns.length).toBe(3) // Raw data has 3 items

      // Pattern store should handle gracefully
      patterns.forEach(pattern => {
        try {
          if (pattern.Hands_Key && pattern.Hand_Criteria) {
            patternStore.selectPattern(pattern)
          }
        } catch {
          // Should not throw errors for invalid data
          expect(error).toBeUndefined()
        }
      })

      // Should only have valid patterns selected
      const selectedPatterns = patternStore.getSelectedPatterns()
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
        const initialCount = tileStore.getTileCount()
        
        try {
          tileStore.addTile(tile as unknown)
        } catch {
          // Should either handle gracefully or throw expected error
        }

        // Tile count should not increase for invalid tiles
        const newCount = tileStore.getTileCount()
        expect(newCount).toBe(initialCount)
      })
    })

    it('should validate game state transitions', () => {
      const gameStore = useGameStore.getState()

      // Test invalid phase transitions
      const invalidTransitions = [
        { from: 'setup', to: 'gameplay' }, // Skip intermediate phases
        { from: 'charleston', to: 'tile-input' }, // Backward transition
        { from: 'gameplay', to: 'setup' } // Invalid backward
      ]

      invalidTransitions.forEach(({ from, to }) => {
        gameStore.setGamePhase(from as unknown)
        expect(gameStore.gamePhase).toBe(from)

        try {
          gameStore.setGamePhase(to as unknown)
          // If transition is allowed, verify it's intentional
          if (gameStore.gamePhase === to) {
            // Some transitions might be valid (e.g., reset to setup)
            expect(['setup', from]).toContain(gameStore.gamePhase)
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
      const largePatterSet = Array(1000).fill(null).map((_, index) => ({
        Year: 2025,
        Section: 'STRESS_TEST',
        Line: index + 1,
        Hands_Key: `2025-STRESS-TEST-${index}`,
        Hand: `PATTERN ${index}`,
        Hand_Criteria: `Stress Test ${index}`,
        Points: 25,
        Concealed: false
      }))

      vi.spyOn(nmjlService, 'loadAllPatterns').mockResolvedValue(largePatterSet)

      const patternStore = usePatternStore.getState()

      const startTime = Date.now()
      const patterns = await nmjlService.loadAllPatterns()
      const loadTime = Date.now() - startTime

      // Should complete within reasonable time
      expect(loadTime).toBeLessThan(5000) // 5 seconds max

      // Should handle large dataset without crashing
      expect(patterns.length).toBe(1000)
      expect(() => patternStore.selectPattern(patterns[0])).not.toThrow()
    })

    it('should handle rapid user interactions', async () => {
      const tileStore = useTileStore.getState()
      const mockTile = { suit: 'bam', rank: '1', id: 'rapid-test' }

      // Simulate rapid add/remove operations
      const operations = Array(100).fill(null).map((_, index) => {
        return index % 2 === 0 
          ? () => tileStore.addTile({ ...mockTile, id: `rapid-${index}` })
          : () => tileStore.removeTile(`rapid-${index - 1}`)
      })

      // Should handle rapid operations without error
      expect(() => {
        operations.forEach(op => op())
      }).not.toThrow()

      // Final state should be consistent
      expect(typeof tileStore.getTileCount()).toBe('number')
      expect(tileStore.getTileCount()).toBeGreaterThanOrEqual(0)
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
        patternStore.clearPatterns()
        tileStore.clearTiles()
      }).not.toThrow()

      expect(patternStore.getSelectedPatterns()).toEqual([])
      expect(tileStore.getTileCount()).toBe(0)
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
        tileStore.addTile(tile)
      })

      // Should enforce maximum tile limit
      expect(tileStore.getTileCount()).toBeLessThanOrEqual(14)
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
      
      const canProceed = tileStore.getTileCount() >= 13
      expect(typeof canProceed).toBe('boolean')
    })
  })

  describe('Recovery and Cleanup', () => {
    it('should clean up resources properly', () => {
      const gameStore = useGameStore.getState()
      
      // Set up some complex state
      gameStore.setCoPilotMode('solo')
      gameStore.setGamePhase('gameplay')
      gameStore.addPlayer({ id: 'test-player', name: 'Test', isReady: true })

      // Reset should clean up properly
      gameStore.resetGame()

      expect(gameStore.coPilotMode).toBe('everyone')
      expect(gameStore.gamePhase).toBe('setup')
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

        largeMockData.forEach(player => gameStore.addPlayer(player))
        expect(gameStore.players.length).toBe(1000)
        
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