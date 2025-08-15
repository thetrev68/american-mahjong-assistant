// Expandable Layer - Detailed analysis with pattern progress and threats
// Pattern breakdowns, threat analysis, and detailed recommendations

import type { HandAnalysis } from '../../stores/intelligence-store'
import { PatternProgressRing, ThreatIndicator } from '../../ui-components/analysis'

interface ExpandableLayerProps {
  analysis: HandAnalysis
  isExpanded: boolean
  isActive: boolean
  onToggle: () => void
  onExpand: () => void
}

export const ExpandableLayer = ({
  analysis,
  isExpanded,
  isActive,
  onToggle,
  onExpand
}: ExpandableLayerProps) => {
  // Get top patterns for display
  const topPatterns = analysis.bestPatterns.slice(0, 4)
  
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
              📊 Detailed Analysis
            </div>
            <div className="px-2 py-1 bg-primary/10 text-primary text-xs font-semibold rounded-full">
              Layer 2
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onExpand()
              }}
              className="text-xs text-primary hover:text-primary/80 transition-colors px-2 py-1"
            >
              Advanced Stats
            </button>
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
      </div>
      
      {/* Layer Content */}
      {isExpanded && (
        <div className="p-4 space-y-6">
          {/* Pattern Analysis Section */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm font-semibold text-gray-700">🎯 Pattern Progress</span>
              <span className="text-xs text-gray-500">({topPatterns.length} patterns)</span>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {topPatterns.map((pattern) => (
                <PatternProgressRing
                  key={pattern.patternId}
                  pattern={pattern}
                  size="md"
                  showLabel={true}
                  showDetails={true}
                  animated={isActive}
                />
              ))}
            </div>
            
            {topPatterns.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">🎲</div>
                <div className="text-sm">No viable patterns identified</div>
                <div className="text-xs text-gray-400 mt-1">Consider different tile combinations</div>
              </div>
            )}
          </div>
          
          {/* Threat Analysis Section */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm font-semibold text-gray-700">⚠️ Threat Analysis</span>
              <span className="text-xs text-gray-500">({analysis.threats.length} threats)</span>
            </div>
            
            <ThreatIndicator
              threats={analysis.threats}
              size="md"
              showMitigation={true}
              interactive={false}
            />
          </div>
          
          {/* Strategic Advice Section */}
          {analysis.strategicAdvice.length > 1 && (
            <div>
              <div className="text-sm font-semibold text-gray-700 mb-3">
                💡 Strategic Insights
              </div>
              
              <div className="space-y-2">
                {analysis.strategicAdvice.slice(1).map((advice, index) => (
                  <div
                    key={index}
                    className="p-3 bg-gray-50 rounded-lg border-l-3 border-primary text-sm text-gray-700 leading-relaxed"
                  >
                    {advice}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Performance Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 pt-4 border-t border-gray-100">
            <div className="text-center">
              <div className="text-lg font-bold text-primary">
                {Math.round(analysis.overallScore)}%
              </div>
              <div className="caption-text">Overall Score</div>
            </div>
            
            <div className="text-center">
              <div className="text-lg font-bold text-accent">
                {topPatterns[0]?.strategicValue || 0}/10
              </div>
              <div className="caption-text">Strategic Value</div>
            </div>
            
            <div className="text-center">
              <div className="text-lg font-bold text-warning">
                {topPatterns[0]?.estimatedTurns || '?'}
              </div>
              <div className="caption-text">Est. Turns</div>
            </div>
            
            <div className="text-center">
              <div className={`text-lg font-bold ${
                topPatterns[0]?.riskLevel === 'low' ? 'text-accent' :
                topPatterns[0]?.riskLevel === 'medium' ? 'text-warning' : 'text-red-500'
              }`}>
                {topPatterns[0]?.riskLevel?.charAt(0).toUpperCase() + (topPatterns[0]?.riskLevel?.slice(1) || '') || 'N/A'}
              </div>
              <div className="caption-text">Risk Level</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}