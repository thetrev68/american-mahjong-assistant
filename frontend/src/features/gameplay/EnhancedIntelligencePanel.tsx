import React from 'react'
import { Button } from '../../ui-components/Button'
import { TurnRecommendationsSection } from './components/TurnRecommendationsSection'
import { CallOpportunitySection } from './components/CallOpportunitySection'
import { OpponentInsightsSection } from './components/OpponentInsightsSection'
import { DefensivePlaySection } from './components/DefensivePlaySection'
import type { HandAnalysis } from '../../stores/intelligence-store'
import type { GameState } from '../../services/turn-intelligence-engine'
import type { CallOpportunity } from '../../services/call-opportunity-analyzer'

interface EnhancedIntelligencePanelProps {
  analysis: HandAnalysis | null
  gameState: GameState
  playerId: string
  isCurrentTurn: boolean
  callOpportunity: CallOpportunity | null
  onClose: () => void
  onActionRecommendation: (action: string, data: any) => void
}

export const EnhancedIntelligencePanel: React.FC<EnhancedIntelligencePanelProps> = ({
  analysis,
  gameState: _gameState,
  playerId: _playerId,
  isCurrentTurn,
  callOpportunity,
  onClose,
  onActionRecommendation
}) => {
  return (
    <div className="enhanced-intelligence-panel bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-purple-200/50 max-h-[80vh] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-purple-800">🧠 Enhanced AI Co-Pilot</h2>
        <Button variant="ghost" size="sm" onClick={onClose}>
          ✕
        </Button>
      </div>

      {/* Turn-Aware Recommendations Section */}
      {isCurrentTurn && analysis?.turnIntelligence && (
        <TurnRecommendationsSection 
          recommendations={analysis.turnIntelligence}
          onAction={onActionRecommendation}
        />
      )}
      
      {/* Call Opportunity Section */}
      {callOpportunity && analysis?.currentCallRecommendation && (
        <CallOpportunitySection
          opportunity={callOpportunity}
          recommendation={analysis.currentCallRecommendation}
          onCallAction={onActionRecommendation}
        />
      )}
      
      {/* Opponent Analysis Section */}
      {analysis?.opponentAnalysis && analysis.opponentAnalysis.length > 0 && (
        <OpponentInsightsSection
          opponents={analysis.opponentAnalysis}
          dangerousTiles={analysis.dangerousTiles}
        />
      )}
      
      {/* Defensive Analysis Section */}
      {analysis?.defensiveAnalysis && (
        <DefensivePlaySection
          defensiveAnalysis={analysis.defensiveAnalysis}
          patternSwitchSuggestions={analysis.patternSwitchSuggestions}
        />
      )}
      
      {/* Existing Pattern Analysis - Basic fallback */}
      {analysis && (
        <div className="pattern-analysis">
          <h3 className="section-title text-lg font-bold text-purple-800 mb-4 flex items-center gap-2">
            📋 Pattern Analysis
          </h3>
          
          {/* Overall Score */}
          {analysis.overallScore && (
            <div className="overall-score p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg mb-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-green-800">Overall Hand Score</div>
                <div className="text-xl font-bold text-green-600">
                  {Math.round(analysis.overallScore)}/100
                </div>
              </div>
            </div>
          )}

          {/* Top Recommended Patterns */}
          {analysis.recommendedPatterns && analysis.recommendedPatterns.length > 0 && (
            <div className="recommended-patterns space-y-2">
              <div className="text-sm font-medium text-gray-700">Top Patterns</div>
              {analysis.recommendedPatterns.slice(0, 3).map((rec, idx) => (
                <div key={rec.pattern.id} className="pattern-card p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{rec.pattern.displayName}</div>
                      <div className="text-sm text-gray-600">
                        {Math.round(rec.completionPercentage)}% complete • {rec.pattern.points} pts
                      </div>
                    </div>
                    {idx === 0 && (
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                        Primary
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Strategic Advice */}
          {analysis.strategicAdvice && analysis.strategicAdvice.length > 0 && (
            <div className="strategic-advice mt-4 p-3 bg-blue-50 rounded-lg">
              <div className="text-sm font-medium text-blue-800 mb-2">💡 Strategic Advice</div>
              <div className="space-y-1">
                {analysis.strategicAdvice.map((advice, idx) => (
                  <div key={idx} className="text-sm text-blue-700">• {advice}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* No Analysis Available */}
      {!analysis && (
        <div className="text-center text-gray-500 py-8">
          <div className="text-2xl mb-2">🤔</div>
          <p className="text-sm">No intelligence data available</p>
          <p className="text-xs text-gray-400 mt-1">Analysis will appear during gameplay</p>
        </div>
      )}
    </div>
  )
}