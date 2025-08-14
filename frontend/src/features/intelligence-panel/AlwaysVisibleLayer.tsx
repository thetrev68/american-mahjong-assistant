// Always Visible Layer - Essential information that's always shown
// Top recommendations, confidence level, and key metrics

import type { HandAnalysis } from '../../stores/intelligence-store'
import { RecommendationBadge, ConfidenceMeter } from '../../ui-components/analysis'

interface AlwaysVisibleLayerProps {
  analysis: HandAnalysis
  isActive: boolean
  onExpand: () => void
}

export const AlwaysVisibleLayer = ({
  analysis,
  isActive,
  onExpand
}: AlwaysVisibleLayerProps) => {
  // Get top 3 recommendations
  const topRecommendations = analysis.tileRecommendations
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 3)
  
  // Calculate average confidence
  const avgConfidence = analysis.tileRecommendations.reduce(
    (acc, rec) => acc + rec.confidence, 0
  ) / analysis.tileRecommendations.length
  
  // Get best pattern
  const bestPattern = analysis.bestPatterns[0]
  
  return (
    <div className={`
      p-4 rounded-xl border-2 transition-all duration-300
      ${isActive ? 'border-primary/30 bg-primary/5' : 'border-gray-200 bg-white'}
    `}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="text-sm font-semibold text-gray-700">
            🎯 Quick Analysis
          </div>
          {bestPattern && (
            <div className="px-2 py-1 bg-gray-100 rounded-lg text-xs font-medium text-gray-600">
              Pattern #{bestPattern.patternId} • {Math.round(bestPattern.completionPercentage)}%
            </div>
          )}
        </div>
        
        <button
          onClick={onExpand}
          className="text-primary hover:text-primary/80 transition-colors"
          aria-label="Expand for more details"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
      
      {/* Main Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Confidence Meter */}
        <div className="flex justify-center">
          <ConfidenceMeter
            confidence={avgConfidence}
            size="md"
            showLabel={true}
            animated={isActive}
          />
        </div>
        
        {/* Top Recommendations */}
        <div className="md:col-span-2 space-y-2">
          <div className="text-xs font-medium text-gray-600 mb-2">
            🎯 Top Recommendations
          </div>
          
          <div className="flex flex-wrap gap-2">
            {topRecommendations.map((rec, index) => (
              <RecommendationBadge
                key={`${rec.tileId}-${rec.action}-${rec.priority}-${index}`}
                recommendation={rec}
                size="sm"
                showConfidence={true}
              />
            ))}
          </div>
          
          {topRecommendations.length === 0 && (
            <div className="text-xs text-gray-500 italic">
              No specific recommendations yet
            </div>
          )}
        </div>
      </div>
      
      {/* Strategic Summary */}
      {analysis.strategicAdvice.length > 0 && (
        <div className="mt-4 pt-3 border-t border-gray-100">
          <div className="text-xs font-medium text-gray-600 mb-2">
            💡 Key Advice
          </div>
          <div className="text-sm text-gray-700 leading-relaxed">
            {analysis.strategicAdvice[0]}
          </div>
        </div>
      )}
      
      {/* Quick Stats */}
      <div className="mt-4 grid grid-cols-3 gap-4">
        <div className="text-center">
          <div className="metric-number text-2xl">
            {analysis.bestPatterns.length}
          </div>
          <div className="caption-text">
            Viable Patterns
          </div>
        </div>
        
        <div className="text-center">
          <div className="metric-number text-2xl">
            {analysis.tileRecommendations.length}
          </div>
          <div className="caption-text">
            Tile Actions
          </div>
        </div>
        
        <div className="text-center">
          <div className="metric-number text-2xl">
            {analysis.threats.length}
          </div>
          <div className="caption-text">
            {analysis.threats.length === 1 ? 'Threat' : 'Threats'}
          </div>
        </div>
      </div>
    </div>
  )
}