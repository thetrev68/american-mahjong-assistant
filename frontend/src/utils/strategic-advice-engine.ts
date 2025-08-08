/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
// frontend/src/utils/strategic-advice-engine.ts
// Advanced strategic advice system for NMJL gameplay
// Provides comprehensive strategic guidance based on hand analysis and game state

import type { Tile, HandPattern, Player, DiscardedTile } from '../types';
import { NMJLPatternAnalyzer } from './nmjl-pattern-analyzer';
import { NMJLProbabilityCalculator } from './nmjl-probability-calculator';
import { CharlestonRecommendationEngine } from './charleston-recommendation-engine';
import { GameplayRecommendationEngine } from './gameplay-recommendation-engine';

interface StrategicAdvice {
  primary: string; // Main strategic focus
  secondary: string[]; // Supporting advice
  warnings: string[]; // Important cautions
  opportunities: string[]; // Tactical opportunities
  priority: 'defensive' | 'balanced' | 'aggressive';
  confidence: number;
  reasoning: {
    handStrength: string;
    opponentThreats: string;
    gamePhase: string;
    timeConstraints: string;
  };
}

interface GameAnalysis {
  phase: 'charleston' | 'early' | 'mid' | 'late' | 'endgame';
  playerHand: {
    strength: 'weak' | 'moderate' | 'strong' | 'excellent';
    flexibility: 'rigid' | 'moderate' | 'flexible' | 'very_flexible';
    completionChance: number;
    bestPattern: HandPattern | null;
    alternativePatterns: number;
  };
  opponents: {
    totalThreat: 'low' | 'medium' | 'high' | 'critical';
    specificThreats: Array<{
      playerId: string;
      position: string;
      threatLevel: 'low' | 'medium' | 'high';
      suspectedPattern: string;
    }>;
  };
  gameState: {
    turnsRemaining: number;
    wallPercentage: number;
    discardDiversity: number;
  };
}

/**
 * Strategic Advice Engine for NMJL
 * Provides comprehensive strategic guidance throughout the game
 */
export class StrategicAdviceEngine {
  
  /**
   * Generate comprehensive strategic advice
   */
  static generateAdvice(
    playerTiles: Tile[],
    players: Player[],
    discardPile: DiscardedTile[],
    gamePhase: 'charleston' | 'playing',
    turnsElapsed: number = 0,
    wallTilesRemaining: number = 100
  ): StrategicAdvice {
    
    // Step 1: Analyze current game state
    const gameAnalysis = this.analyzeGameState(
      playerTiles,
      players,
      discardPile,
      gamePhase,
      turnsElapsed,
      wallTilesRemaining
    );
    
    // Step 2: Generate phase-specific advice
    const phaseAdvice = this.generatePhaseSpecificAdvice(gameAnalysis, gamePhase);
    
    // Step 3: Generate hand-specific advice
    const handAdvice = this.generateHandSpecificAdvice(gameAnalysis);
    
    // Step 4: Generate opponent-specific advice
    const opponentAdvice = this.generateOpponentSpecificAdvice(gameAnalysis);
    
    // Step 5: Synthesize into comprehensive advice
    return this.synthesizeAdvice(gameAnalysis, phaseAdvice, handAdvice, opponentAdvice);
  }
  
  /**
   * Analyze current game state comprehensively
   */
  private static analyzeGameState(
    playerTiles: Tile[],
    players: Player[],
    discardPile: DiscardedTile[],
    gamePhase: string,
    turnsElapsed: number,
    wallTilesRemaining: number
  ): GameAnalysis {
    
    // Analyze player hand strength
    const patternAnalysis = NMJLPatternAnalyzer.analyzeAllPatterns(playerTiles, 2025, 5);
    const bestPattern = patternAnalysis[0];
    
    const handStrength = this.categorizeHandStrength(bestPattern?.completion || 0, patternAnalysis.length);
    const flexibility = this.categorizeHandFlexibility(patternAnalysis);
    
    // Determine actual game phase based on various factors
    const actualPhase = this.determineGamePhase(gamePhase, turnsElapsed, wallTilesRemaining);
    
    // Analyze opponents
    const opponentAnalysis = this.analyzeOpponentThreats(players, discardPile);
    
    // Analyze game state
    const gameState = {
      turnsRemaining: Math.floor(wallTilesRemaining / players.length),
      wallPercentage: wallTilesRemaining / 100,
      discardDiversity: this.calculateDiscardDiversity(discardPile)
    };
    
    return {
      phase: actualPhase,
      playerHand: {
        strength: handStrength,
        flexibility: flexibility,
        completionChance: bestPattern?.completion || 0,
        bestPattern: bestPattern?.pattern || null,
        alternativePatterns: patternAnalysis.filter(p => p.completion > 0.3).length
      },
      opponents: opponentAnalysis,
      gameState
    };
  }
  
  /**
   * Generate phase-specific strategic advice
   */
  private static generatePhaseSpecificAdvice(
    analysis: GameAnalysis,
    gamePhase: string
  ): { primary: string; secondary: string[]; warnings: string[] } {
    
    const advice = { primary: '', secondary: [] as string[], warnings: [] as string[] };
    
    switch (analysis.phase) {
      case 'charleston':
        advice.primary = 'Focus on building pattern potential while maintaining flexibility';
        advice.secondary.push('Pass tiles that don\'t contribute to multiple patterns');
        advice.secondary.push('Keep jokers and tiles that work in several hands');
        if (analysis.playerHand.flexibility === 'rigid') {
          advice.warnings.push('Hand has limited options - be extra careful with Charleston passes');
        }
        break;
        
      case 'early':
        advice.primary = 'Identify your target pattern and begin focused building';
        advice.secondary.push('Discard isolated tiles that don\'t fit your pattern');
        advice.secondary.push('Pay attention to opponent discard patterns');
        if (analysis.playerHand.strength === 'weak') {
          advice.warnings.push('Hand needs work - consider switching patterns if opportunities arise');
        }
        break;
        
      case 'mid':
        advice.primary = 'Balance offense and defense while building toward completion';
        advice.secondary.push('Be selective with discards - opponents are getting closer');
        advice.secondary.push('Consider calling tiles if it significantly advances your hand');
        if (analysis.opponents.totalThreat === 'high') {
          advice.warnings.push('Multiple opponents are threats - prioritize defense');
        }
        break;
        
      case 'late':
        advice.primary = 'Prioritize defense while looking for safe ways to complete';
        advice.secondary.push('Avoid discarding tiles that help opponents');
        advice.secondary.push('Consider defensive plays even if they slow your progress');
        advice.warnings.push('Game is in danger zone - be very careful with discards');
        break;
        
      case 'endgame':
        advice.primary = 'Maximum defense - only discard completely safe tiles';
        advice.secondary.push('Look for miracle draws but expect opponents to win');
        advice.secondary.push('Focus on not feeding the winner');
        advice.warnings.push('Critical phase - one wrong discard could lose the game');
        break;
    }
    
    return advice;
  }
  
  /**
   * Generate hand-specific strategic advice
   */
  private static generateHandSpecificAdvice(
    analysis: GameAnalysis
  ): { opportunities: string[]; warnings: string[] } {
    
    const advice = { opportunities: [] as string[], warnings: [] as string[] };
    
    // Hand strength specific advice
    switch (analysis.playerHand.strength) {
      case 'excellent':
        advice.opportunities.push(`${(analysis.playerHand.completionChance * 100).toFixed(0)}% complete - push for victory`);
        advice.opportunities.push('You\'re in the lead - maintain advantage');
        break;
        
      case 'strong':
        advice.opportunities.push('Good position - continue current strategy');
        advice.opportunities.push('Look for calling opportunities to accelerate');
        break;
        
      case 'moderate':
        advice.opportunities.push('Decent foundation - need to improve efficiency');
        if (analysis.playerHand.alternativePatterns > 1) {
          advice.opportunities.push('Multiple pattern options available');
        }
        break;
        
      case 'weak':
        advice.warnings.push('Hand needs significant improvement');
        advice.opportunities.push('Consider switching to easier patterns');
        if (analysis.gameState.turnsRemaining < 10) {
          advice.warnings.push('Time running out with weak hand - focus on defense');
        }
        break;
    }
    
    // Flexibility specific advice
    if (analysis.playerHand.flexibility === 'very_flexible') {
      advice.opportunities.push('High flexibility - can adapt to opportunities');
    } else if (analysis.playerHand.flexibility === 'rigid') {
      advice.warnings.push('Limited options - protect essential tiles');
    }
    
    // Best pattern specific advice
    if (analysis.playerHand.bestPattern) {
      const pattern = analysis.playerHand.bestPattern;
      advice.opportunities.push(`${pattern.name} (${pattern.points} points) is your best option`);
      
      if (pattern.difficulty === 'expert') {
        advice.warnings.push('Pursuing very difficult pattern - have backup plan');
      } else if (pattern.difficulty === 'easy') {
        advice.opportunities.push('Easy pattern - good safety choice');
      }
    }
    
    return advice;
  }
  
  /**
   * Generate opponent-specific strategic advice
   */
  private static generateOpponentSpecificAdvice(
    analysis: GameAnalysis
  ): { warnings: string[]; opportunities: string[] } {
    
    const advice = { warnings: [] as string[], opportunities: [] as string[] };
    
    // Overall threat level advice
    switch (analysis.opponents.totalThreat) {
      case 'critical':
        advice.warnings.push('CRITICAL: Multiple opponents very close to winning');
        advice.warnings.push('Switch to full defensive mode');
        break;
        
      case 'high':
        advice.warnings.push('High threat level - balance offense and defense');
        advice.warnings.push('Be very selective with discards');
        break;
        
      case 'medium':
        advice.warnings.push('Moderate threat - maintain awareness');
        break;
        
      case 'low':
        advice.opportunities.push('Opponents not threatening - can focus on offense');
        break;
    }
    
    // Specific opponent threats
    analysis.opponents.specificThreats.forEach(threat => {
      if (threat.threatLevel === 'high') {
        advice.warnings.push(`${threat.position} is a major threat (${threat.suspectedPattern})`);
      } else if (threat.threatLevel === 'medium') {
        advice.warnings.push(`Watch ${threat.position} - building ${threat.suspectedPattern}`);
      }
    });
    
    // Opportunity identification
    const lowThreatCount = analysis.opponents.specificThreats
      .filter(t => t.threatLevel === 'low').length;
    
    if (lowThreatCount >= 2) {
      advice.opportunities.push('Multiple opponents struggling - good time to be aggressive');
    }
    
    return advice;
  }
  
  /**
   * Synthesize all advice into comprehensive guidance
   */
  private static synthesizeAdvice(
    analysis: GameAnalysis,
    phaseAdvice: any,
    handAdvice: any,
    opponentAdvice: any
  ): StrategicAdvice {
    
    // Determine overall strategic priority
    const priority = this.determineStrategicPriority(analysis);
    
    // Calculate confidence in advice
    const confidence = this.calculateAdviceConfidence(analysis);
    
    // Generate reasoning
    const reasoning = {
      handStrength: this.explainHandStrength(analysis.playerHand),
      opponentThreats: this.explainOpponentThreats(analysis.opponents),
      gamePhase: this.explainGamePhase(analysis.phase, analysis.gameState),
      timeConstraints: this.explainTimeConstraints(analysis.gameState)
    };
    
    return {
      primary: phaseAdvice.primary,
      secondary: [
        ...phaseAdvice.secondary,
        ...handAdvice.opportunities.slice(0, 2)
      ],
      warnings: [
        ...phaseAdvice.warnings,
        ...handAdvice.warnings,
        ...opponentAdvice.warnings
      ].slice(0, 3), // Limit to most important warnings
      opportunities: [
        ...handAdvice.opportunities,
        ...opponentAdvice.opportunities
      ].slice(0, 3),
      priority,
      confidence,
      reasoning
    };
  }
  
  // Helper methods for categorization and analysis
  
  private static categorizeHandStrength(completion: number, patternCount: number): 'weak' | 'moderate' | 'strong' | 'excellent' {
    if (completion >= 0.8) return 'excellent';
    if (completion >= 0.6) return 'strong';
    if (completion >= 0.4 || patternCount >= 3) return 'moderate';
    return 'weak';
  }
  
  private static categorizeHandFlexibility(patternAnalysis: any[]): 'rigid' | 'moderate' | 'flexible' | 'very_flexible' {
    const viablePatterns = patternAnalysis.filter(p => p.completion > 0.3).length;
    if (viablePatterns >= 4) return 'very_flexible';
    if (viablePatterns >= 3) return 'flexible';
    if (viablePatterns >= 2) return 'moderate';
    return 'rigid';
  }
  
  private static determineGamePhase(
    gamePhase: string,
    turnsElapsed: number,
    wallTilesRemaining: number
  ): 'charleston' | 'early' | 'mid' | 'late' | 'endgame' {
    
    if (gamePhase === 'charleston') return 'charleston';
    
    const wallPercentage = wallTilesRemaining / 100;
    
    if (wallPercentage > 0.7) return 'early';
    if (wallPercentage > 0.4) return 'mid';
    if (wallPercentage > 0.15) return 'late';
    return 'endgame';
  }
  
  private static analyzeOpponentThreats(players: Player[], discardPile: DiscardedTile[]) {
    // Simplified opponent analysis
    const threats = players.map(player => ({
      playerId: player.id,
      position: player.position,
      threatLevel: player.tilesInHand <= 5 ? 'high' : 
                   player.tilesInHand <= 8 ? 'medium' : 'low',
      suspectedPattern: 'Unknown' // TODO: Would analyze discards in full implementation
    }));
    
    const highThreats = threats.filter(t => t.threatLevel === 'high').length;
    const mediumThreats = threats.filter(t => t.threatLevel === 'medium').length;
    
    const totalThreat = highThreats >= 2 ? 'critical' :
                       highThreats >= 1 ? 'high' :
                       mediumThreats >= 2 ? 'medium' : 'low';
    
    return {
      totalThreat,
      specificThreats: threats
    } as any;
  }
  
  private static calculateDiscardDiversity(discardPile: DiscardedTile[]): number {
    const uniqueTiles = new Set(discardPile.map(d => d.tile.id)).size;
    return uniqueTiles / Math.max(1, discardPile.length);
  }
  
  private static determineStrategicPriority(analysis: GameAnalysis): 'defensive' | 'balanced' | 'aggressive' {
    if (analysis.opponents.totalThreat === 'critical') return 'defensive';
    if (analysis.opponents.totalThreat === 'high') return 'balanced';
    if (analysis.playerHand.strength === 'excellent') return 'aggressive';
    if (analysis.phase === 'early') return 'aggressive';
    return 'balanced';
  }
  
  private static calculateAdviceConfidence(analysis: GameAnalysis): number {
    let confidence = 0.7; // Base confidence
    
    // Increase confidence for clear situations
    if (analysis.playerHand.strength === 'excellent' || analysis.playerHand.strength === 'weak') {
      confidence += 0.1;
    }
    
    if (analysis.opponents.totalThreat === 'critical' || analysis.opponents.totalThreat === 'low') {
      confidence += 0.1;
    }
    
    // Decrease confidence for complex situations
    if (analysis.playerHand.flexibility === 'very_flexible') {
      confidence -= 0.05; // More options = harder decisions
    }
    
    return Math.max(0.5, Math.min(0.95, confidence));
  }
  
  private static explainHandStrength(hand: any): string {
    return `Hand is ${hand.strength} (${(hand.completionChance * 100).toFixed(0)}% complete with ${hand.bestPattern?.name || 'unknown pattern'})`;
  }
  
  private static explainOpponentThreats(opponents: any): string {
    return `Opponent threat level: ${opponents.totalThreat} (${opponents.specificThreats.filter((t: any) => t.threatLevel === 'high').length} high threats)`;
  }
  
  private static explainGamePhase(phase: string, gameState: any): string {
    return `${phase} phase with ${gameState.turnsRemaining} turns remaining (${(gameState.wallPercentage * 100).toFixed(0)}% of wall left)`;
  }
  
  private static explainTimeConstraints(gameState: any): string {
    if (gameState.turnsRemaining < 5) {
      return 'Very limited time - focus on defense';
    } else if (gameState.turnsRemaining < 15) {
      return 'Time pressure building - balance speed and safety';
    } else {
      return 'Plenty of time - can afford to be selective';
    }
  }
}