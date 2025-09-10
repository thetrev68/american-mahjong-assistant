import React from 'react'
import { TileSprite } from '../../../ui-components/TileSprite'
import { ConfidenceBadge } from '../../../ui-components/ConfidenceBadge'
import { CountdownTimer } from '../../../ui-components/CountdownTimer'
import type { CallOpportunity, CallRecommendation } from '../../../services/call-opportunity-analyzer'

interface CallOpportunitySectionProps {
  opportunity: CallOpportunity
  recommendation: CallRecommendation
  onCallAction: (action: string, data: Record<string, unknown>) => void
}

export const CallOpportunitySection: React.FC<CallOpportunitySectionProps> = ({
  opportunity,
  recommendation,
  onCallAction
}) => {
  const timeRemaining = opportunity.timeRemaining
  const isExpiring = timeRemaining < 2000 // Less than 2 seconds
  
  return (
    <div className={`call-opportunity mb-6 p-4 rounded-xl border-2 ${
      recommendation.shouldCall 
        ? 'bg-green-50 border-green-300' 
        : 'bg-red-50 border-red-300'
    }`}>
      <div className="call-header flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-purple-600">☝</span>
          <span className="font-semibold text-gray-800">Call Opportunity</span>
        </div>
        <CountdownTimer 
          timeRemaining={timeRemaining}
          className={`countdown bg-gray-100 px-2 py-1 rounded text-sm font-mono ${
            isExpiring ? 'bg-red-100 text-red-700 animate-pulse' : ''
          }`}
        />
      </div>
      
      <div className="call-content">
        <div className="called-tile flex items-center gap-3 mb-3">
          <TileSprite tileId={opportunity.tile.id} size="md" />
          <div>
            <div className="tile-source text-sm text-gray-600">
              from {opportunity.discardingPlayer}
            </div>
          </div>
        </div>
        
        <div className="call-recommendation mb-3">
          <div className={`rec-main text-lg font-semibold ${
            recommendation.shouldCall ? 'text-green-700' : 'text-red-700'
          }`}>
            {recommendation.shouldCall 
              ? `✅ Call ${recommendation.recommendedCallType?.toUpperCase()}` 
              : '❌ Pass recommended'
            }
          </div>
          
          <div className="net-value text-sm text-gray-600 mt-1">
            Net Value: {(recommendation.netValue * 100).toFixed(1)}%
          </div>
          
          <ConfidenceBadge confidence={recommendation.confidence} className="mt-2" />
        </div>
        
        {/* Action Buttons */}
        <div className="call-actions flex gap-2 mb-3">
          {recommendation.shouldCall && opportunity.availableCallTypes.map(callType => (
            <button
              key={callType}
              className={`
                call-btn px-4 py-2 rounded-lg font-medium transition-all
                bg-purple-100 text-purple-800 hover:bg-purple-200
                ${callType === recommendation.recommendedCallType ? 'bg-purple-600 text-white hover:bg-purple-700' : ''}
              `}
              onClick={() => onCallAction('call', { type: callType, tile: opportunity.tile })}
            >
              {callType.toUpperCase()}
            </button>
          ))}
          <button 
            className="pass-btn px-4 py-2 rounded-lg font-medium bg-gray-100 text-gray-700 hover:bg-gray-200"
            onClick={() => onCallAction('pass', {})}
          >
            Pass
          </button>
        </div>
        
        {/* Risk/Benefit Summary */}
        {(recommendation.benefits.length > 0 || recommendation.riskFactors.length > 0) && (
          <div className="call-analysis-summary grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            {recommendation.benefits.length > 0 && (
              <div className="benefits">
                <h4 className="font-semibold text-green-700 mb-1">Benefits:</h4>
                {recommendation.benefits.map((benefit, idx) => (
                  <div key={idx} className={`benefit text-green-600 ${benefit.type}`}>
                    • {benefit.description}
                  </div>
                ))}
              </div>
            )}
            
            {recommendation.riskFactors.length > 0 && (
              <div className="risks">
                <h4 className="font-semibold text-red-700 mb-1">Risks:</h4>
                {recommendation.riskFactors.map((risk, idx) => (
                  <div key={idx} className={`risk text-red-600 ${risk.severity}`}>
                    • {risk.description}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}