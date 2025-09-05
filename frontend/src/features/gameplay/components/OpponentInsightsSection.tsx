import React from 'react'
import { TileSprite } from '../../../ui-components/TileSprite'
import { ThreatBadge } from '../../../ui-components/ThreatBadge'
import type { OpponentProfile, DangerousTileAnalysis } from '../../../services/opponent-analysis-engine'

interface OpponentInsightsSectionProps {
  opponents: OpponentProfile[]
  dangerousTiles?: DangerousTileAnalysis[]
}

export const OpponentInsightsSection: React.FC<OpponentInsightsSectionProps> = ({
  opponents,
  dangerousTiles
}) => {
  return (
    <div className="opponent-insights mb-6">
      <h3 className="section-title text-lg font-bold text-purple-800 mb-4 flex items-center gap-2">
        👥 Opponent Analysis
      </h3>
      
      {/* Opponent Threat Summary */}
      <div className="threat-overview space-y-3 mb-4">
        {opponents.map(opponent => (
          <div key={opponent.playerId} className={`
            opponent-card p-3 rounded-lg border-l-4
            ${opponent.threatLevel === 'low' ? 'bg-green-50 border-l-green-400' : ''}
            ${opponent.threatLevel === 'medium' ? 'bg-yellow-50 border-l-yellow-400' : ''}
            ${opponent.threatLevel === 'high' ? 'bg-orange-50 border-l-orange-400' : ''}
            ${opponent.threatLevel === 'critical' ? 'bg-red-50 border-l-red-400' : ''}
          `}>
            <div className="opponent-header flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-bold text-purple-700">
                  {opponent.playerId.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="player-name font-medium text-gray-800">{opponent.playerId}</span>
              <ThreatBadge level={opponent.threatLevel} />
            </div>
            
            <div className="opponent-insights-list space-y-1">
              {opponent.suspectedPatterns.length > 0 && (
                <div className="insight flex items-center gap-2 text-sm text-gray-700">
                  <span className="text-purple-500">🎯</span>
                  <span>Likely targeting: {opponent.suspectedPatterns[0].pattern.Hand_Description}</span>
                </div>
              )}
              
              {opponent.callBehavior.aggressiveness > 0.7 && (
                <div className="insight warning flex items-center gap-2 text-sm text-orange-700">
                  <span className="text-orange-500">⚠</span>
                  <span>Aggressive calling behavior</span>
                </div>
              )}
              
              {/* Show discard pattern info */}
              <div className="insight flex items-center gap-2 text-sm text-gray-700">
                <span className="text-blue-500">👁</span>
                <span>Risk tolerance: {opponent.discardPatterns.riskTolerance}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Dangerous Tiles Warning */}
      {dangerousTiles && dangerousTiles.length > 0 && (
        <div className="dangerous-tiles mt-4 p-3 bg-red-50 rounded-lg border border-red-200">
          <h4 className="warning-title text-red-800 font-semibold mb-2">⚠️ High-Risk Tiles</h4>
          <div className="dangerous-tile-grid grid grid-cols-3 gap-2">
            {dangerousTiles.slice(0, 6).map((analysis, idx) => (
              <div key={idx} className="dangerous-tile flex flex-col items-center text-center">
                <TileSprite tileId={analysis.tile.id} size="sm" />
                <div className="danger-info mt-1">
                  <div className={`
                    danger-level text-xs font-medium
                    ${analysis.dangerLevel > 0.7 ? 'text-red-600' : ''}
                    ${analysis.dangerLevel > 0.4 && analysis.dangerLevel <= 0.7 ? 'text-orange-600' : ''}
                    ${analysis.dangerLevel <= 0.4 ? 'text-yellow-600' : ''}
                  `}>
                    {analysis.dangerLevel > 0.7 ? 'high' : analysis.dangerLevel > 0.4 ? 'medium' : 'low'} risk
                  </div>
                  <div className="danger-reason text-xs text-gray-600">
                    {analysis.reasons[0]}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}