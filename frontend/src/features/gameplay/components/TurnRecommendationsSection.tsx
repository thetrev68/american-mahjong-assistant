import React from 'react'
import { TileSprite } from '../../../ui-components/TileSprite'
import { ConfidenceBadge } from '../../../ui-components/ConfidenceBadge'
import type { TurnRecommendations } from '../../../services/turn-intelligence-engine'

interface TurnRecommendationsSectionProps {
  recommendations: TurnRecommendations
  onAction: (action: string, data: any) => void
}

export const TurnRecommendationsSection: React.FC<TurnRecommendationsSectionProps> = ({
  recommendations,
  onAction
}) => {
  return (
    <div className="turn-recommendations mb-6">
      <h3 className="section-title text-lg font-bold text-purple-800 mb-4 flex items-center gap-2">
        🎯 Turn Recommendations
      </h3>
      
      {/* Draw Recommendations */}
      {recommendations.drawRecommendation && (
        <div className={`recommendation-card draw-rec bg-gradient-to-r p-4 rounded-xl mb-4 border-l-4 ${
          recommendations.drawRecommendation.shouldDraw 
            ? 'from-green-50 to-emerald-50 border-l-green-500' 
            : 'from-yellow-50 to-orange-50 border-l-yellow-500'
        }`}>
          <div className="rec-header flex items-center gap-2 mb-2">
            <span className="text-purple-600">⬇</span>
            <span className="font-semibold text-gray-800">Draw Recommendation</span>
            <ConfidenceBadge confidence={recommendations.drawRecommendation.confidence} />
          </div>
          <div className="rec-content">
            <div className={`recommendation ${
              recommendations.drawRecommendation.shouldDraw ? 'text-green-700' : 'text-yellow-700'
            }`}>
              {recommendations.drawRecommendation.shouldDraw ? '✅ Draw from wall' : '⚠️ Consider passing'}
            </div>
            <div className="reasoning text-gray-700 mt-1">
              {recommendations.drawRecommendation.reasoning}
            </div>
            <div className={`risk-level mt-2 text-sm font-medium ${
              recommendations.drawRecommendation.riskAssessment === 'low' ? 'text-green-600' :
              recommendations.drawRecommendation.riskAssessment === 'moderate' ? 'text-yellow-600' :
              'text-red-600'
            }`}>
              Risk: {recommendations.drawRecommendation.riskAssessment}
            </div>
          </div>
        </div>
      )}
      
      {/* Discard Recommendations */}
      {recommendations.discardRecommendations.length > 0 && (
        <div className="recommendation-card discard-rec bg-gradient-to-r from-blue-50 to-indigo-50 border-l-blue-500 p-4 rounded-xl mb-4 border-l-4">
          <div className="rec-header flex items-center gap-2 mb-2">
            <span className="text-purple-600">⬆</span>
            <span className="font-semibold text-gray-800">Discard Recommendations</span>
          </div>
          <div className="discard-list space-y-2">
            {recommendations.discardRecommendations.slice(0, 3).map((discard) => (
              <div 
                key={discard.tile.instanceId}
                className={`
                  discard-option flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all
                  hover:bg-white/70 hover:shadow-sm
                  ${discard.recommended ? 'bg-green-100/50 border border-green-300' : ''}
                  ${discard.riskLevel === 'safe' ? 'bg-green-50/30' : ''}
                  ${discard.riskLevel === 'moderate' ? 'bg-yellow-50/30' : ''}
                  ${discard.riskLevel === 'dangerous' ? 'bg-red-50/30' : ''}
                `}
                onClick={() => onAction('discard-suggestion', { tile: discard.tile })}
              >
                <TileSprite tileId={discard.tile.id} size="sm" />
                <div className="discard-info flex-1">
                  <div className="pattern-impact font-medium text-gray-800">
                    {discard.patternProgress.description}
                  </div>
                  <div className="risk-reason text-sm text-gray-600">
                    {discard.reasoning}
                  </div>
                </div>
                <ConfidenceBadge confidence={discard.confidence} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}