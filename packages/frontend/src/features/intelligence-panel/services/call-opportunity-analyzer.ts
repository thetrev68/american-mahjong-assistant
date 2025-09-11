// Call Opportunity Analyzer  
// Strategic evaluation of call opportunities (pung/kong) with risk/reward analysis

import type { Tile, PlayerTile } from '../../../types/tile-types'
import type { NMJL2025Pattern } from 'shared-types'
import type { GameState, PatternProgressScore } from './turn-intelligence-engine'
import type { OpponentProfile } from './opponent-analysis-engine'
import { AnalysisEngine } from '../../../lib/services/analysis-engine'

export interface CallOpportunity {
  tile: Tile
  discardingPlayer: string
  availableCallTypes: CallType[]
  timeRemaining: number
  deadline: number
}

export type CallType = 'pung' | 'kong' | 'quint' | 'sextet'

export interface CallRecommendation {
  shouldCall: boolean
  recommendedCallType: CallType | null
  netValue: number
  confidence: number
  reasoning: string[]
  riskFactors: RiskFactor[]
  benefits: Benefit[]
  alternatives: AlternativeAction[]
}

export interface RiskFactor {
  type: 'exposure' | 'tempo' | 'flexibility' | 'opponent'
  severity: 'low' | 'medium' | 'high'
  description: string
  impact: number // -1 to 0
}

export interface Benefit {
  type: 'progress' | 'tempo' | 'defensive' | 'strategic'
  value: 'low' | 'medium' | 'high'
  description: string
  impact: number // 0 to 1
}

export interface AlternativeAction {
  action: 'pass' | 'wait'
  reasoning: string
  expectedValue: number
}

export interface CallAnalysisContext {
  playerHand: PlayerTile[]
  selectedPatterns: NMJL2025Pattern[]
  gameState: GameState
  opponentProfiles: OpponentProfile[]
  turnPosition: number
  roundPhase: 'early' | 'middle' | 'late'
}

export class CallOpportunityAnalyzer {

  async analyzeCallOpportunity(
    opportunity: CallOpportunity,
    context: CallAnalysisContext
  ): Promise<CallRecommendation> {
    
    const { playerHand } = context
    
    // Calculate baseline pattern progress before call
    const progressBefore = await this.calculateCurrentProgress(playerHand)
    
    // Analyze each possible call type
    const callAnalyses = await Promise.all(
      opportunity.availableCallTypes.map(callType =>
        this.analyzeSpecificCall(opportunity.tile, callType, context)
      )
    )

    // Find the best call option
    const bestCall = callAnalyses.reduce((best, current) => 
      current.netValue > best.netValue ? current : best
    )

    // Calculate overall recommendation
    const shouldCall = bestCall.netValue > 0.1 // Threshold for positive value
    const confidence = this.calculateCallConfidence(bestCall, context)

    // Generate comprehensive reasoning
    const reasoning = this.generateCallReasoning(bestCall, progressBefore, context)

    return {
      shouldCall,
      recommendedCallType: shouldCall ? bestCall.callType : null,
      netValue: bestCall.netValue,
      confidence,
      reasoning,
      riskFactors: bestCall.riskFactors,
      benefits: bestCall.benefits,
      alternatives: this.generateAlternatives(bestCall)
    }
  }

  private async analyzeSpecificCall(
    tile: Tile,
    callType: CallType,
    context: CallAnalysisContext
  ): Promise<SpecificCallAnalysis> {
    
    const { playerHand } = context

    // Simulate hand after making the call
    const handAfterCall = this.simulateHandAfterCall(playerHand, tile, callType)
    
    // Calculate pattern progress after call
    const progressAfter = await this.calculateCurrentProgress(handAfterCall)
    const progressBefore = await this.calculateCurrentProgress(playerHand)
    
    const progressGain = progressAfter.score - progressBefore.score

    // Calculate various factors
    const exposureRisk = this.calculateExposureRisk(callType, tile, context)
    const turnAdvantage = this.calculateTurnAdvantage(callType, context)
    const flexibilityLoss = this.calculateFlexibilityLoss(playerHand, tile, callType)
    const opponentImpact = this.calculateOpponentImpact(tile, context)

    // Calculate net value
    const netValue = progressGain + turnAdvantage - exposureRisk - flexibilityLoss + opponentImpact

    // Analyze risk factors
    const riskFactors = this.identifyRiskFactors(callType, tile, context)
    
    // Analyze benefits  
    const benefits = this.identifyBenefits(progressGain, turnAdvantage, opponentImpact)

    return {
      callType,
      netValue,
      progressGain,
      exposureRisk,
      turnAdvantage,
      flexibilityLoss,
      opponentImpact,
      riskFactors,
      benefits
    }
  }

  private simulateHandAfterCall(hand: PlayerTile[], calledTile: Tile, callType: CallType): PlayerTile[] {
    const tilesNeeded = this.getTilesNeededForCall(hand, calledTile, callType)
    
    if (tilesNeeded.length === 0) {
      return hand // Cannot make the call
    }

    // Remove the tiles that would be used in the call
    const remainingHand = [...hand]
    for (const tileToRemove of tilesNeeded) {
      const index = remainingHand.findIndex(t => t.id === tileToRemove.id)
      if (index >= 0) {
        remainingHand.splice(index, 1)
      }
    }

    return remainingHand
  }

  private getTilesNeededForCall(hand: PlayerTile[], calledTile: Tile, callType: CallType): PlayerTile[] {
    const matchingTiles = hand.filter(t => t.id === calledTile.id)

    switch (callType) {
      case 'pung':
        return matchingTiles.length >= 2 ? matchingTiles.slice(0, 2) : []
      case 'kong':
        return matchingTiles.length >= 3 ? matchingTiles.slice(0, 3) : []
      case 'quint':
        return matchingTiles.length >= 4 ? matchingTiles.slice(0, 4) : []
      case 'sextet':
        return matchingTiles.length >= 5 ? matchingTiles.slice(0, 5) : []
      default:
        return []
    }
  }

  private async calculateCurrentProgress(hand: PlayerTile[]): Promise<PatternProgressScore> {
    if (hand.length === 0) {
      return {
        score: 0,
        tilesCompleted: 0,
        totalTiles: 14,
        description: 'Empty hand',
        improvements: []
      }
    }

    // Use existing analysis engine
    const analysis = await AnalysisEngine.analyzeHand(hand, [])
    
    if (analysis.recommendedPatterns.length === 0) {
      return {
        score: 0,
        tilesCompleted: 0,
        totalTiles: 14,
        description: 'No viable patterns',
        improvements: []
      }
    }

    const bestRecommendation = analysis.recommendedPatterns[0]
    return {
      score: bestRecommendation.completionPercentage / 100,
      tilesCompleted: Math.floor((bestRecommendation.completionPercentage / 100) * 14),
      totalTiles: 14,
      description: `${bestRecommendation.completionPercentage.toFixed(1)}% complete`,
      improvements: []
    }
  }

  private calculateExposureRisk(callType: CallType, tile: Tile, context: CallAnalysisContext): number {
    let risk = 0

    // Base exposure risk by call type
    switch (callType) {
      case 'pung': risk = 0.1; break
      case 'kong': risk = 0.15; break
      case 'quint': risk = 0.2; break
      case 'sextet': risk = 0.25; break
    }

    // Increase risk in late game
    if (context.roundPhase === 'late') {
      risk += 0.1
    }

    // Increase risk if tile is potentially valuable to opponents
    const dangerousToOpponents = context.opponentProfiles.some(opponent =>
      opponent.dangerousTiles.some(dangerTile => dangerTile.id === tile.id)
    )
    
    if (dangerousToOpponents) {
      risk += 0.05
    }

    return Math.min(0.5, risk) // Cap at 50% risk
  }

  private calculateTurnAdvantage(_callType: CallType, context: CallAnalysisContext): number {
    let advantage = 0

    // Getting an extra turn is valuable
    advantage += 0.15

    // More valuable in late game when turns are precious
    if (context.roundPhase === 'late') {
      advantage += 0.1
    }

    // Less valuable if you're already in a good turn position
    if (context.turnPosition === 1) { // Next to turn anyway
      advantage *= 0.5
    }

    return advantage
  }

  private calculateFlexibilityLoss(hand: PlayerTile[], tile: Tile, callType: CallType): number {
    const tilesUsed = this.getTilesNeededForCall(hand, tile, callType).length + 1 // +1 for called tile
    
    // Base flexibility loss proportional to tiles committed
    let flexibilityLoss = tilesUsed * 0.02

    // Higher loss for versatile tiles (middle numbers)
    if (tile.suit === 'dots' || tile.suit === 'bams' || tile.suit === 'cracks') {
      const num = parseInt(tile.value)
      if (!isNaN(num) && num >= 4 && num <= 6) {
        flexibilityLoss += 0.05 // Middle numbers are more flexible
      }
    }

    return Math.min(0.3, flexibilityLoss)
  }

  private calculateOpponentImpact(tile: Tile, context: CallAnalysisContext): number {
    let impact = 0

    // Check if calling prevents opponents from getting the tile
    for (const opponent of context.opponentProfiles) {
      if (opponent.dangerousTiles.some(dangerTile => dangerTile.id === tile.id)) {
        impact += 0.08 // Defensive value
      }
    }

    // Check if discarding player might have been trying to help someone
    const discardingPlayer = context.opponentProfiles.find(
      p => p.playerId === context.gameState.currentPlayer
    )
    
    if (discardingPlayer && discardingPlayer.threatLevel === 'high') {
      impact += 0.05 // Intercepting a potentially dangerous discard
    }

    return Math.min(0.2, impact)
  }

  private identifyRiskFactors(callType: CallType, _tile: Tile, context: CallAnalysisContext): RiskFactor[] {
    const risks: RiskFactor[] = []

    // Exposure risk
    if (callType === 'kong' || callType === 'quint' || callType === 'sextet') {
      risks.push({
        type: 'exposure',
        severity: 'medium',
        description: `${callType} exposes significant hand information to opponents`,
        impact: -0.15
      })
    }

    // Late game tempo risk
    if (context.roundPhase === 'late' && context.gameState.wallCount < 30) {
      risks.push({
        type: 'tempo',
        severity: 'medium',  
        description: 'Late game calls reduce hand flexibility',
        impact: -0.1
      })
    }

    // Opponent threat risk
    const highThreatOpponents = context.opponentProfiles.filter(o => o.threatLevel === 'high' || o.threatLevel === 'critical')
    if (highThreatOpponents.length > 0) {
      risks.push({
        type: 'opponent',
        severity: 'high',
        description: `${highThreatOpponents.length} opponents pose high threat`,
        impact: -0.12
      })
    }

    return risks
  }

  private identifyBenefits(progressGain: number, turnAdvantage: number, opponentImpact: number): Benefit[] {
    const benefits: Benefit[] = []

    if (progressGain > 0.1) {
      benefits.push({
        type: 'progress',
        value: progressGain > 0.2 ? 'high' : 'medium',
        description: `Significant pattern progress gain: ${(progressGain * 100).toFixed(1)}%`,
        impact: progressGain
      })
    }

    if (turnAdvantage > 0.1) {
      benefits.push({
        type: 'tempo',
        value: 'medium',
        description: 'Gain extra turn advantage',
        impact: turnAdvantage
      })
    }

    if (opponentImpact > 0.05) {
      benefits.push({
        type: 'defensive',
        value: 'medium',
        description: 'Prevents opponents from accessing valuable tile',
        impact: opponentImpact
      })
    }

    return benefits
  }

  private calculateCallConfidence(analysis: SpecificCallAnalysis, context: CallAnalysisContext): number {
    let confidence = 0.5

    // Higher confidence for clear positive/negative values
    confidence += Math.abs(analysis.netValue) * 0.5

    // Higher confidence with more hand information
    const handSize = context.playerHand.length
    confidence += Math.min(0.2, handSize * 0.01)

    // Higher confidence in early game (less uncertainty)
    if (context.roundPhase === 'early') {
      confidence += 0.1
    }

    return Math.max(0.1, Math.min(0.9, confidence))
  }

  private generateCallReasoning(
    analysis: SpecificCallAnalysis, 
    _progressBefore: PatternProgressScore,
    context: CallAnalysisContext
  ): string[] {
    const reasoning: string[] = []

    // Main recommendation
    if (analysis.netValue > 0.1) {
      reasoning.push(`Call recommended: ${(analysis.netValue * 100).toFixed(1)}% net positive value`)
    } else if (analysis.netValue < -0.1) {
      reasoning.push(`Pass recommended: ${(Math.abs(analysis.netValue) * 100).toFixed(1)}% net negative value`)
    } else {
      reasoning.push('Marginal decision: minimal impact either way')
    }

    // Pattern progress impact
    if (analysis.progressGain > 0.05) {
      reasoning.push(`Improves pattern progress by ${(analysis.progressGain * 100).toFixed(1)}%`)
    } else if (analysis.progressGain < -0.05) {
      reasoning.push(`Reduces pattern progress by ${(Math.abs(analysis.progressGain) * 100).toFixed(1)}%`)
    }

    // Risk factors
    if (analysis.exposureRisk > 0.1) {
      reasoning.push(`High exposure risk: ${(analysis.exposureRisk * 100).toFixed(1)}%`)
    }

    // Opponent considerations
    if (analysis.opponentImpact > 0.05) {
      reasoning.push('Defensive value: prevents opponents from accessing tile')
    }

    // Game phase considerations
    if (context.roundPhase === 'late' && analysis.netValue < 0.2) {
      reasoning.push('Late game: consider conservative play')
    }

    return reasoning
  }

  private generateAlternatives(analysis: SpecificCallAnalysis): AlternativeAction[] {
    const alternatives: AlternativeAction[] = []

    if (analysis.netValue > 0) {
      alternatives.push({
        action: 'pass',
        reasoning: 'Wait for better call opportunity or draw the tile naturally',
        expectedValue: -analysis.netValue * 0.3 // Opportunity cost
      })
    } else {
      alternatives.push({
        action: 'pass',
        reasoning: 'Focus on hand development without exposure',
        expectedValue: Math.abs(analysis.netValue) * 0.8 // Avoid the negative impact
      })
    }

    return alternatives
  }
}

interface SpecificCallAnalysis {
  callType: CallType
  netValue: number
  progressGain: number
  exposureRisk: number
  turnAdvantage: number
  flexibilityLoss: number
  opponentImpact: number
  riskFactors: RiskFactor[]
  benefits: Benefit[]
}

// Singleton instance
let callOpportunityAnalyzer: CallOpportunityAnalyzer | null = null

export const getCallOpportunityAnalyzer = (): CallOpportunityAnalyzer => {
  if (!callOpportunityAnalyzer) {
    callOpportunityAnalyzer = new CallOpportunityAnalyzer()
  }
  return callOpportunityAnalyzer
}