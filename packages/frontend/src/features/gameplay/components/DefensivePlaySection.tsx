import React from 'react'
import type { DefensiveAnalysis, PatternSwitchSuggestion } from '../../intelligence-panel/services/turn-intelligence-engine'

interface DefensivePlaySectionProps {
  defensiveAnalysis: DefensiveAnalysis
  patternSwitchSuggestions?: PatternSwitchSuggestion[]
}

export const DefensivePlaySection: React.FC<DefensivePlaySectionProps> = ({
  defensiveAnalysis,
  patternSwitchSuggestions
}) => {
  return (
    <div className="defensive-play mb-6">
      <h3 className="section-title text-lg font-bold text-purple-800 mb-4 flex items-center gap-2">
        🛡️ Defensive Analysis
      </h3>
      
      {/* Threat Level Overview */}
      <div className={`
        threat-overview p-3 rounded-lg border-l-4 mb-4
        ${defensiveAnalysis.threatLevel === 'low' ? 'bg-green-50 border-l-green-400' : ''}
        ${defensiveAnalysis.threatLevel === 'medium' ? 'bg-yellow-50 border-l-yellow-400' : ''}
        ${defensiveAnalysis.threatLevel === 'high' ? 'bg-red-50 border-l-red-400' : ''}
      `}>
        <div className="flex items-center gap-2 mb-2">
          <span className={`
            font-semibold
            ${defensiveAnalysis.threatLevel === 'low' ? 'text-green-700' : ''}
            ${defensiveAnalysis.threatLevel === 'medium' ? 'text-yellow-700' : ''}
            ${defensiveAnalysis.threatLevel === 'high' ? 'text-red-700' : ''}
          `}>
            Overall Threat Level: {defensiveAnalysis.threatLevel.toUpperCase()}
          </span>
        </div>
        
        <div className="recommendations space-y-1">
          {defensiveAnalysis.recommendations.map((rec, idx) => (
            <div key={idx} className="text-sm text-gray-700">
              • {rec}
            </div>
          ))}
        </div>
      </div>

      {/* Safe Tiles */}
      {defensiveAnalysis.safeTiles.length > 0 && (
        <div className="safe-tiles mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
          <h4 className="font-semibold text-green-800 mb-2">✅ Safe Discards</h4>
          <div className="text-sm text-green-700">
            {defensiveAnalysis.safeTiles.length} safe tiles identified for defensive play
          </div>
        </div>
      )}

      {/* Pattern Switch Suggestions */}
      {patternSwitchSuggestions && patternSwitchSuggestions.length > 0 && (
        <div className="pattern-switches">
          <h4 className="font-semibold text-purple-700 mb-2">🔄 Pattern Switch Options</h4>
          <div className="space-y-2">
            {patternSwitchSuggestions.slice(0, 2).map((suggestion, idx) => (
              <div key={idx} className="pattern-switch p-2 bg-purple-50 rounded border border-purple-200">
                <div className="text-sm font-medium text-purple-800">
                  Switch to: {suggestion.toPattern.Hand_Description}
                </div>
                <div className="text-xs text-purple-600 mt-1">
                  +{(suggestion.improvement * 100).toFixed(1)}% improvement • {suggestion.reasoning}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}