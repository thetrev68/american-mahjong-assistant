// frontend/src/components/PrivateHandView/hooks/useHandAnalysis.tsx
// Custom hook for analyzing player's hand and providing strategic recommendations

import { useState, useEffect, useMemo } from 'react';
import type { Tile, HandAnalysis, PatternMatch, HandPattern } from '../../../types';

interface UseHandAnalysisReturn {
  analysis: HandAnalysis | null;
  isAnalyzing: boolean;
  error: string | null;
  refreshAnalysis: () => void;
}

export const useHandAnalysis = (tiles: Tile[]): UseHandAnalysisReturn => {
  const [analysis, setAnalysis] = useState<HandAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mock pattern definitions for development
  const mockPatterns: HandPattern[] = useMemo(() => [
    {
      id: 'like-numbers-1',
      name: 'LIKE NUMBERS',
      description: 'Four consecutive numbers in each suit',
      requiredTiles: [],
      optionalTiles: [],
      points: 25,
      difficulty: 'medium'
    },
    {
      id: '2025',
      name: '2025',
      description: 'Special pattern for the year 2025',
      requiredTiles: [],
      optionalTiles: [],
      points: 50,
      difficulty: 'hard'
    },
    {
      id: 'consecutive-run',
      name: 'CONSECUTIVE RUN',
      description: 'Run of consecutive numbers',
      requiredTiles: [],
      optionalTiles: [],
      points: 30,
      difficulty: 'easy'
    }
  ], []);

  // Analyze how well tiles match a specific pattern
  const analyzePatternMatch = (
    pattern: HandPattern
  ): PatternMatch => {
    // Mock analysis for development
    const randomCompletion = Math.random() * 0.8 + 0.2; // 20-100% completion
    
    return {
      pattern: pattern,
      completion: randomCompletion,
      missingTiles: [],
      blockedBy: [],
      confidence: randomCompletion * 0.9
    };
  };

  // Generate strategic recommendations
  const generateRecommendations = (
    tilesToAnalyze: Tile[], 
    patterns: PatternMatch[]
  ) => {
    const bestPattern = patterns[0];
    const keep: Tile[] = [];
    const discard: Tile[] = [];
    const charleston: Tile[] = [];

    if (bestPattern && bestPattern.completion > 0.3) {
      // Keep tiles that contribute to best pattern
      if (bestPattern.pattern.name === 'LIKE NUMBERS') {
        // Keep consecutive numbers
        const numberTiles = tilesToAnalyze.filter(t => 
          ['dots', 'bams', 'cracks'].includes(t.suit) && 
          !isNaN(parseInt(t.value))
        );
        keep.push(...numberTiles.slice(0, 6));
      }
      
      // Discard isolated tiles
      const isolatedTiles = tilesToAnalyze.filter(tile => {
        // Consider winds and dragons as potentially isolated
        return ['winds', 'dragons'].includes(tile.suit) && 
               !keep.some(keepTile => keepTile.id === tile.id);
      });
      discard.push(...isolatedTiles.slice(0, 3));
      
      // Charleston recommendations - pass tiles not useful for current patterns
      const unusefulTiles = tilesToAnalyze.filter(tile => 
        !keep.some(keepTile => keepTile.id === tile.id) &&
        !discard.some(discardTile => discardTile.id === tile.id)
      );
      charleston.push(...unusefulTiles.slice(0, 3));
    } else {
      // No strong pattern - give general advice
      const winds = tilesToAnalyze.filter(t => t.suit === 'winds');
      const dragons = tilesToAnalyze.filter(t => t.suit === 'dragons');
      
      discard.push(...winds.slice(0, 2));
      charleston.push(...dragons.slice(0, 2));
    }

    return { keep, discard, charleston };
  };

  // Analyze defensive threats
  const analyzeThreats = (tilesToAnalyze: Tile[]) => {
    // Mock threat analysis for development
    const dangerousTiles = tilesToAnalyze.filter(t => t.suit === 'jokers'); // Jokers are valuable
    const safeTiles = tilesToAnalyze.filter(t => t.suit === 'winds' || t.suit === 'dragons');
    
    return {
      dangerousTiles: dangerousTiles.slice(0, 2),
      safeTiles: safeTiles.slice(0, 3),
      opponentThreats: [
        {
          playerId: 'player2',
          suspectedPatterns: ['LIKE NUMBERS'],
          dangerLevel: 'medium' as const
        },
        {
          playerId: 'player3', 
          suspectedPatterns: ['2025', 'CONSECUTIVE RUN'],
          dangerLevel: 'low' as const
        }
      ]
    };
  };

  // Analyze hand patterns
  const analyzeHand = useMemo(() => {
    return (tilesToAnalyze: Tile[]): HandAnalysis | null => {
      if (tilesToAnalyze.length === 0) return null;

      // Analyze for each pattern
      const patternMatches: PatternMatch[] = mockPatterns.map(pattern => 
        analyzePatternMatch(pattern)
      ).sort((a, b) => b.completion - a.completion);

      // Generate recommendations based on best patterns
      const recommendations = generateRecommendations(tilesToAnalyze, patternMatches);

      // Analyze defensive threats
      const threats = analyzeThreats(tilesToAnalyze);

      // Calculate probabilities
      const bestMatch = patternMatches[0];
      const probabilities = {
        completion: bestMatch ? bestMatch.completion : 0,
        turnsEstimate: bestMatch ? Math.ceil((1 - bestMatch.completion) * 8) : 8
      };

      return {
        bestPatterns: patternMatches.slice(0, 3), // Top 3 matches
        recommendations,
        threats,
        probabilities
      };
    };
  }, [mockPatterns]);

  // Refresh analysis manually
  const refreshAnalysis = () => {
    if (tiles.length > 0) {
      setIsAnalyzing(true);
      setError(null);
      
      // Simulate analysis delay
      setTimeout(() => {
        try {
          const newAnalysis = analyzeHand(tiles);
          setAnalysis(newAnalysis);
        } catch {
          setError('Failed to analyze hand');
        } finally {
          setIsAnalyzing(false);
        }
      }, 800);
    }
  };

  // Auto-analyze when tiles change
  useEffect(() => {
    if (tiles.length === 0) {
      setAnalysis(null);
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    // Debounce analysis to avoid excessive calculations
    const debounceTimer = setTimeout(() => {
      try {
        const newAnalysis = analyzeHand(tiles);
        setAnalysis(newAnalysis);
      } catch {
        setError('Failed to analyze hand');
      } finally {
        setIsAnalyzing(false);
      }
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [tiles, analyzeHand]);

  return {
    analysis,
    isAnalyzing,
    error,
    refreshAnalysis
  };
};