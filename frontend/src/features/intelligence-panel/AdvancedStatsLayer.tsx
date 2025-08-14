// Advanced Stats Layer - Complete analytics and What If exploration
// Full statistics, historical data, and scenario analysis

import { useState } from 'react'
import type { HandAnalysis } from '../../stores/intelligence-store'
import { useIntelligenceStore } from '../../stores/intelligence-store'
import { RecommendationBadge } from '../../ui-components/analysis'

interface AdvancedStatsLayerProps {
  analysis: HandAnalysis
  isExpanded: boolean
  isActive: boolean
  onToggle: () => void
}

export const AdvancedStatsLayer = ({
  analysis,
  isExpanded,
  isActive,
  onToggle
}: AdvancedStatsLayerProps) => {
  const {
    whatIfMode,
    whatIfScenarios,
    enableWhatIfMode,
    disableWhatIfMode,
    createWhatIfScenario,
    removeWhatIfScenario,
    setActiveScenario,
    activeScenario
  } = useIntelligenceStore()
  
  const [newScenarioName, setNewScenarioName] = useState('')
  
  // All recommendations sorted by confidence
  const allRecommendations = analysis.tileRecommendations
    .sort((a, b) => b.confidence - a.confidence)
  
  // Group recommendations by action
  const groupedRecommendations = {
    keep: allRecommendations.filter(r => r.action === 'keep'),
    pass: allRecommendations.filter(r => r.action === 'pass'),
    discard: allRecommendations.filter(r => r.action === 'discard'),
    neutral: allRecommendations.filter(r => r.action === 'neutral')
  }
  
  const handleCreateScenario = async () => {
    if (!newScenarioName.trim()) return
    
    // Mock scenario creation
    await createWhatIfScenario(newScenarioName, [
      { remove: 'sample', add: 'sample' }
    ])
    setNewScenarioName('')
  }
  
  return (
    <div className={`
      border-2 rounded-xl transition-all duration-300
      ${isActive ? 'border-primary/30 bg-primary/5' : 'border-gray-200 bg-white'}
    `}>
      {/* Layer Header */}
      <div 
        className="p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-sm font-semibold text-gray-700">
              🔬 Advanced Analytics
            </div>
            <div className="px-2 py-1 bg-secondary/10 text-secondary text-xs font-semibold rounded-full">
              Layer 3
            </div>
          </div>
          
          <div className={`
            transition-transform duration-200
            ${isExpanded ? 'rotate-180' : 'rotate-0'}
          `}>
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>
      
      {/* Layer Content */}
      {isExpanded && (
        <div className="p-4 space-y-6">
          {/* Complete Recommendations Breakdown */}
          <div>
            <div className="text-sm font-semibold text-gray-700 mb-4">
              📋 Complete Recommendation Analysis
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Object.entries(groupedRecommendations).map(([action, recommendations]) => (
                <div key={action} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      {action} ({recommendations.length})
                    </span>
                  </div>
                  
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {recommendations.map((rec, index) => (
                      <RecommendationBadge
                        key={`${rec.tileId}-${index}`}
                        recommendation={rec}
                        size="sm"
                        showConfidence={true}
                        interactive={true}
                      />
                    ))}
                  </div>
                  
                  {recommendations.length === 0 && (
                    <div className="text-xs text-gray-400 italic">
                      No {action} recommendations
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          {/* What If Analysis Section */}
          <div className="border-t border-gray-100 pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-semibold text-gray-700">
                🔮 What If Analysis
              </div>
              
              <button
                onClick={whatIfMode ? disableWhatIfMode : enableWhatIfMode}
                className={`
                  px-3 py-1 text-xs font-medium rounded-full transition-colors
                  ${whatIfMode 
                    ? 'bg-primary text-white hover:bg-primary/80' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }
                `}
              >
                {whatIfMode ? 'Exit What If' : 'Enter What If'}
              </button>
            </div>
            
            {whatIfMode ? (
              <div className="space-y-4">
                {/* Create New Scenario */}
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Scenario name (e.g., 'Remove 2B, add joker')"
                      value={newScenarioName}
                      onChange={(e) => setNewScenarioName(e.target.value)}
                      className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      onKeyPress={(e) => e.key === 'Enter' && handleCreateScenario()}
                    />
                    <button
                      onClick={handleCreateScenario}
                      disabled={!newScenarioName.trim()}
                      className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Create
                    </button>
                  </div>
                </div>
                
                {/* Existing Scenarios */}
                {whatIfScenarios.length > 0 && (
                  <div className="space-y-2">
                    {whatIfScenarios.map((scenario) => (
                      <div
                        key={scenario.id}
                        className={`
                          p-3 border rounded-lg cursor-pointer transition-colors
                          ${activeScenario === scenario.id 
                            ? 'border-primary bg-primary/5' 
                            : 'border-gray-200 hover:border-gray-300'
                          }
                        `}
                        onClick={() => setActiveScenario(scenario.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium text-gray-700">
                              {scenario.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              Score change: {scenario.comparisonScore > 0 ? '+' : ''}{scenario.comparisonScore}
                            </div>
                          </div>
                          
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              removeWhatIfScenario(scenario.id)
                            }}
                            className="text-red-400 hover:text-red-600 transition-colors"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {whatIfScenarios.length === 0 && (
                  <div className="text-center py-6 text-gray-500">
                    <div className="text-2xl mb-2">🎯</div>
                    <div className="text-sm">No scenarios created yet</div>
                    <div className="text-xs text-gray-400 mt-1">Create scenarios to explore different strategies</div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500">
                <div className="text-2xl mb-2">🔮</div>
                <div className="text-sm">What If mode disabled</div>
                <div className="text-xs text-gray-400 mt-1">Enable to explore hypothetical tile changes</div>
              </div>
            )}
          </div>
          
          {/* Analysis Metadata */}
          <div className="border-t border-gray-100 pt-6">
            <div className="text-sm font-semibold text-gray-700 mb-3">
              📊 Analysis Metadata
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-xs text-gray-500 font-medium">Version</div>
                <div className="text-sm font-mono text-gray-700">
                  {analysis.analysisVersion}
                </div>
              </div>
              
              <div>
                <div className="text-xs text-gray-500 font-medium">Last Updated</div>
                <div className="text-sm font-mono text-gray-700">
                  {new Date(analysis.lastUpdated).toLocaleTimeString()}
                </div>
              </div>
              
              <div>
                <div className="text-xs text-gray-500 font-medium">Patterns Analyzed</div>
                <div className="text-sm font-mono text-gray-700">
                  {analysis.bestPatterns.length}
                </div>
              </div>
              
              <div>
                <div className="text-xs text-gray-500 font-medium">Recommendations</div>
                <div className="text-sm font-mono text-gray-700">
                  {analysis.tileRecommendations.length}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}