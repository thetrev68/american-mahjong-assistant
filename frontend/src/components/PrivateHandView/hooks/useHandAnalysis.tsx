/* eslint-disable react-hooks/exhaustive-deps */
// frontend/src/components/PrivateHandView/hooks/useHandAnalysis.tsx
// Enhanced hook for analyzing player's hand using advanced NMJL engines

import { useState, useEffect, useCallback } from 'react';
import type { Tile, HandAnalysis, PatternMatch, PlayerPosition, ExposedSet } from '../../../types';
import { NMJLPatternAnalyzer } from '../../../utils/nmjl-pattern-analyzer';
import { NMJLProbabilityCalculator } from '../../../utils/nmjl-probability-calculator';
import { StrategicAdviceEngine } from '../../../utils/strategic-advice-engine';
import { NMJLRulesEnforcer } from '../../../utils/nmjl-rules-enforcer';

interface UseHandAnalysisReturn {
  analysis: HandAnalysis | null;
  isAnalyzing: boolean;
  error: string | null;
  refreshAnalysis: () => void;
  strategicAdvice: unknown | null;
  ruleViolations: Array<{ rule: string; violation: string; severity: 'warning' | 'error' }>;
}

export const useHandAnalysis = (
  tiles: Tile[], 
  cardYear: number = 2025,
  gamePhase: 'charleston' | 'playing' = 'playing'
): UseHandAnalysisReturn => {
  const [analysis, setAnalysis] = useState<HandAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [strategicAdvice, setStrategicAdvice] = useState<unknown | null>(null);
  const [ruleViolations, setRuleViolations] = useState<Array<{ 
    rule: string; 
    violation: string; 
    severity: 'warning' | 'error' 
  }>>([]);

  // Analyze hand using advanced NMJL engines
  const analyzeHand = useCallback(async (tilesToAnalyze: Tile[]): Promise<HandAnalysis | null> => {
    if (tilesToAnalyze.length === 0) return null;

    try {
      // Step 1: Get pattern matches using advanced analyzer
      const patternMatches = NMJLPatternAnalyzer.analyzeAllPatterns(tilesToAnalyze, cardYear, 5);
      const bestPattern = patternMatches[0];

      // Step 2: Generate advanced recommendations
      const recommendations = await generateAdvancedRecommendations(tilesToAnalyze, bestPattern);

      // Step 3: Calculate probabilities for best patterns
      const probabilities = bestPattern ? await calculateProbabilities(tilesToAnalyze, bestPattern) : {
        completion: 0,
        turnsEstimate: 0
      };

      // Step 4: Generate threat analysis (simplified for now)
      const threats = {
        dangerousTiles: tilesToAnalyze.filter(t => t.suit === 'jokers').slice(0, 2),
        safeTiles: tilesToAnalyze.filter(t => t.suit === 'winds' || t.suit === 'dragons').slice(0, 3),
        opponentThreats: [
          {
            playerId: 'opponent-1',
            suspectedPatterns: ['LIKE NUMBERS'],
            dangerLevel: 'medium' as const
          }
        ]
      };

      return {
        bestPatterns: patternMatches.slice(0, 3),
        recommendations,
        probabilities,
        threats
      };
    } catch (err) {
      throw new Error(`Failed to analyze hand: ${err}`);
    }
  }, [cardYear]);

  // Generate advanced recommendations using multiple engines
  const generateAdvancedRecommendations = async (
    tilesToAnalyze: Tile[], 
    bestPattern: PatternMatch | undefined
  ) => {
    
    // Get keep/discard recommendations based on best pattern
    const keep: Tile[] = [];
    const discard: Tile[] = [];
    const charleston: Tile[] = [];

    if (bestPattern && bestPattern.pattern) {
      // Use pattern analyzer to identify keep tiles
      const keepTiles = NMJLPatternAnalyzer.identifyKeepTiles(tilesToAnalyze, bestPattern.pattern);
      const discardTiles = NMJLPatternAnalyzer.identifyDiscardTiles(tilesToAnalyze, bestPattern.pattern, keepTiles);
      
      keep.push(...keepTiles);
      discard.push(...discardTiles.slice(0, 3)); // Top 3 discard candidates
      charleston.push(...discardTiles.slice(3, 6)); // Charleston candidates
    } else {
      // Fallback recommendations when no strong pattern
      const jokers = tilesToAnalyze.filter(t => t.isJoker || t.suit === 'jokers');
      const winds = tilesToAnalyze.filter(t => t.suit === 'winds');
      const dragons = tilesToAnalyze.filter(t => t.suit === 'dragons');
      
      keep.push(...jokers); // Always keep jokers
      discard.push(...winds.slice(0, 2));
      charleston.push(...dragons.slice(0, 3));
    }

    return { keep, discard, charleston };
  };

  // Calculate advanced probabilities
  const calculateProbabilities = async (
    tilesToAnalyze: Tile[], 
    bestPattern: PatternMatch
  ) => {
    
    const gameState = {
      wallTilesRemaining: 100, // Default assumption
      discardedTiles: [],
      exposedTiles: [],
      turnsElapsed: 0,
      playersRemaining: 4
    };

    const availableJokers = tilesToAnalyze.filter(t => t.isJoker || t.suit === 'jokers').length;

    try {
      const probResult = NMJLProbabilityCalculator.calculatePatternProbability(
        tilesToAnalyze,
        bestPattern.pattern,
        gameState,
        availableJokers
      );

      return {
        completion: bestPattern.completion,
        turnsEstimate: probResult.expectedTurns
      };
    } catch (err) {
      console.warn('Probability calculation failed:', err);
      return {
        completion: bestPattern.completion,
        turnsEstimate: Math.ceil((1 - bestPattern.completion) * 8)
      };
    }
  };

  // Generate strategic advice
  const generateStrategicAdvice = useCallback(async (tilesToAnalyze: Tile[]) => {
    try {
      // Mock players for advice generation
      const mockPlayers = [
        { id: 'p1', name: 'Player 1', position: 'south' as PlayerPosition, tilesInHand: 12, exposedSets: [], isHost: false, isConnected: true, isReady: false, hasCalledMahjong: false },
        { id: 'p2', name: 'Player 2', position: 'west' as PlayerPosition, tilesInHand: 11, exposedSets: [], isHost: false, isConnected: true, isReady: false, hasCalledMahjong: false },
        { id: 'p3', name: 'Player 3', position: 'north' as PlayerPosition, tilesInHand: 13, exposedSets: [], isHost: false, isConnected: true, isReady: false, hasCalledMahjong: false }
      ] as Array<{
        id: string;
        name: string;
        position: PlayerPosition;
        tilesInHand: number;
        exposedSets: ExposedSet[];
        isHost: boolean;
        isConnected: boolean;
        isReady: boolean;
        hasCalledMahjong: boolean;
      }>;

      const advice = StrategicAdviceEngine.generateAdvice(
        tilesToAnalyze,
        mockPlayers,
        [], // Empty discard pile
        gamePhase,
        0, // Turns elapsed
        100 // Wall tiles remaining
      );

      return advice;
    } catch (err) {
      console.warn('Strategic advice generation failed:', err);
      return null;
    }
  }, [cardYear]);

  // Check for rule violations
  const checkRuleViolations = (tilesToAnalyze: Tile[]) => {
    try {
      return NMJLRulesEnforcer.getAllRuleViolations(tilesToAnalyze, []);
    } catch (err) {
      console.warn('Rule validation failed:', err);
      return [];
    }
  };

  // Refresh analysis manually
  const refreshAnalysis = () => {
    if (tiles.length > 0) {
      setIsAnalyzing(true);
      setError(null);
      
      // Add slight delay for better UX
      setTimeout(async () => {
        try {
          const [newAnalysis, newAdvice, violations] = await Promise.all([
            analyzeHand(tiles),
            generateStrategicAdvice(tiles),
            Promise.resolve(checkRuleViolations(tiles))
          ]);
          
          setAnalysis(newAnalysis);
          setStrategicAdvice(newAdvice);
          setRuleViolations(violations);
        } catch (err) {
          setError(`Analysis failed: ${err}`);
        } finally {
          setIsAnalyzing(false);
        }
      }, 300);
    }
  };

  // Auto-analyze when tiles change
  useEffect(() => {
    if (tiles.length === 0) {
      setAnalysis(null);
      setStrategicAdvice(null);
      setRuleViolations([]);
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    // Debounce analysis to avoid excessive calculations
    const debounceTimer = setTimeout(async () => {
      try {
        const [newAnalysis, newAdvice, violations] = await Promise.all([
          analyzeHand(tiles),
          generateStrategicAdvice(tiles),
          Promise.resolve(checkRuleViolations(tiles))
        ]);
        
        setAnalysis(newAnalysis);
        setStrategicAdvice(newAdvice);
        setRuleViolations(violations);
      } catch (err) {
        setError(`Analysis failed: ${err}`);
        console.error('Hand analysis error:', err);
      } finally {
        setIsAnalyzing(false);
      }
    }, 800); // Slightly longer debounce for complex analysis

    return () => clearTimeout(debounceTimer);
  }, [tiles, cardYear, gamePhase, analyzeHand, generateStrategicAdvice]);

  return {
    analysis,
    isAnalyzing,
    error,
    refreshAnalysis,
    strategicAdvice,
    ruleViolations
  };
};