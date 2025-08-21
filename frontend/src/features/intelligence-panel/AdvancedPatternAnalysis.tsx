// Advanced Pattern Analysis Component
// Shows detailed pattern analysis with variations, comparisons, and visual displays

import { useState } from 'react'
import { Card } from '../../ui-components/Card'
import { Button } from '../../ui-components/Button'
import { PatternVariationGrid, PatternComparison } from '../../ui-components/patterns/PatternVariationDisplay'
import type { HandAnalysis } from '../../stores/intelligence-store'

interface AdvancedPatternAnalysisProps {
  analysis: HandAnalysis
  playerTiles: string[]
  gamePhase?: 'charleston' | 'gameplay'
  onPatternSelect?: (patternId: string) => void
  className?: string
}

export const AdvancedPatternAnalysis = ({
  analysis,
  playerTiles,
  gamePhase = 'gameplay',
  onPatternSelect,
  className = ''
}: AdvancedPatternAnalysisProps) => {
  const [activeTab, setActiveTab] = useState<'variations' | 'comparison' | 'details'>('variations')
  const [expandedPattern, setExpandedPattern] = useState<string | null>(null)
  
  // Get patterns with meaningful completion (15% or higher)
  const viablePatterns = analysis.bestPatterns.filter(p => p.completionPercentage >= 15)
  const equivalentPatterns = viablePatterns.filter(p => p.completionPercentage >= 35) // Top tier patterns
  
  // Get real pattern variations from Engine 1 analysis data
  const getPatternVariationsFromAnalysis = () => {
    try {
      if (!analysis.engine1Facts || analysis.engine1Facts.length === 0) {
        console.warn('No Engine 1 facts available for pattern tile data')
        return []
      }
      
      // Extract pattern variations from Engine 1 facts
      return analysis.engine1Facts.map(fact => {
        const bestVariation = fact.tileMatching.bestVariation
        
        return {
          id: fact.patternId,
          name: fact.patternId, // Use pattern ID as name for now
          tiles: bestVariation.patternTiles || [], // Real tile array from Engine 1!
          sequence: bestVariation.sequence || 1,
          completionRatio: bestVariation.completionRatio || 0
        }
      }).filter(pattern => pattern.completionRatio >= 0.15) // Filter viable patterns
    } catch (error) {
      console.error('Error processing Engine 1 pattern variations:', error)
      return []
    }
  }
  
  const patternVariations = getPatternVariationsFromAnalysis()
  
  const showAllPatterns = gamePhase === 'charleston' || equivalentPatterns.length > 3
  const displayPatterns = showAllPatterns ? viablePatterns : equivalentPatterns.slice(0, 3)
  
  return (
    <Card variant="elevated" className={`space-y-4 ${className}`}>
      <div className="p-4 pb-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <span className="text-2xl">🎯</span>
              Advanced Pattern Analysis
            </h3>
            <p className="text-sm text-gray-600">
              {gamePhase === 'charleston' 
                ? 'All viable patterns (early game flexibility)'
                : `Top ${Math.min(displayPatterns.length, 3)} equivalent patterns`}
            </p>
          </div>
          
          {showAllPatterns && (
            <div className="text-sm text-blue-600 bg-blue-50 px-2 py-1 rounded">
              Showing {displayPatterns.length} patterns
            </div>
          )}
        </div>
        
        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200">
          {[
            { id: 'variations' as const, label: '🧩 Variations', description: 'Visual tile patterns' },
            { id: 'comparison' as const, label: '📊 Comparison', description: 'Side-by-side analysis' },
            { id: 'details' as const, label: '📋 Details', description: 'Full breakdown' }
          ].map(tab => (
            <button
              key={tab.id}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-primary bg-primary/5'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setActiveTab(tab.id)}
              title={tab.description}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      
      <div className="p-4 pt-0">
        {/* Variations Tab */}
        {activeTab === 'variations' && (
          <div>
            {patternVariations.length > 0 ? (
              <PatternVariationGrid
                patterns={patternVariations}
                playerTiles={playerTiles}
                maxPatterns={gamePhase === 'charleston' ? 8 : 4}
                onPatternClick={onPatternSelect}
              />
            ) : (
              <div className="text-center py-8 text-gray-500">
                <div className="text-2xl mb-2">⚠️</div>
                <div className="text-sm font-semibold">Pattern Tile Data Unavailable</div>
                <div className="text-xs mt-1">Engine 1 facts needed for tile visualization</div>
              </div>
            )}
          </div>
        )}
        
        {/* Comparison Tab */}
        {activeTab === 'comparison' && (
          <div>
            {patternVariations.length > 0 ? (
              <PatternComparison
                patterns={patternVariations}
                playerTiles={playerTiles}
              />
            ) : (
              <div className="text-center py-8 text-gray-500">
                <div className="text-2xl mb-2">⚠️</div>
                <div className="text-sm font-semibold">Pattern Comparison Unavailable</div>
                <div className="text-xs mt-1">Engine 1 facts needed for pattern comparison</div>
              </div>
            )}
          </div>
        )}
        
        {/* Details Tab */}
        {activeTab === 'details' && (
          <div className="space-y-4">
            <div className="text-sm font-semibold text-gray-700">
              📋 Detailed Analysis
            </div>
            
            {displayPatterns.map((pattern, index) => (
              <div
                key={pattern.patternId}
                className="border rounded-lg overflow-hidden"
              >
                <div
                  className={`p-4 cursor-pointer transition-colors ${
                    expandedPattern === pattern.patternId
                      ? 'bg-indigo-50'
                      : 'bg-white hover:bg-gray-50'
                  }`}
                  onClick={() => setExpandedPattern(
                    expandedPattern === pattern.patternId ? null : pattern.patternId
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        index === 0 ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {pattern.section} #{pattern.line}
                        </div>
                        <div className="text-sm text-gray-600">
                          {pattern.completionPercentage}% complete • {pattern.tilesNeeded} tiles needed
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">
                        {pattern.riskLevel} risk
                      </span>
                      <span className={`transform transition-transform ${
                        expandedPattern === pattern.patternId ? 'rotate-180' : ''
                      }`}>
                        ↓
                      </span>
                    </div>
                  </div>
                </div>
                
                {expandedPattern === pattern.patternId && (
                  <div className="p-4 border-t bg-gray-50 space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Confidence:</span>
                        <span className="ml-2 font-semibold">{pattern.confidenceScore}%</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Strategic Value:</span>
                        <span className="ml-2 font-semibold">{pattern.strategicValue}/10</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Estimated Turns:</span>
                        <span className="ml-2 font-semibold">{pattern.estimatedTurns}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Difficulty:</span>
                        <span className="ml-2 font-semibold capitalize">{pattern.difficulty}</span>
                      </div>
                    </div>
                    
                    {pattern.missingTiles.length > 0 && (
                      <div className="text-sm">
                        <span className="text-gray-600">Missing tiles:</span>
                        <span className="ml-2 font-mono">
                          {pattern.missingTiles.slice(0, 8).join(', ')}
                          {pattern.missingTiles.length > 8 && ` +${pattern.missingTiles.length - 8} more`}
                        </span>
                      </div>
                    )}
                    
                    <div className="flex gap-2">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => onPatternSelect?.(pattern.patternId)}
                      >
                        Select This Pattern
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                      >
                        View All Variations
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        
        {/* Game Phase Advice */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded">
            <div className="text-sm font-semibold text-blue-800 mb-1">
              💡 {gamePhase === 'charleston' ? 'Charleston Strategy' : 'Gameplay Strategy'}:
            </div>
            <div className="text-sm text-blue-700 leading-relaxed">
              {gamePhase === 'charleston' 
                ? `Keep tiles that work across multiple patterns. Focus on the top ${Math.min(equivalentPatterns.length, 4)} patterns since they're closely matched.`
                : `Commit to your highest completion pattern (${displayPatterns[0]?.completionPercentage}%) but watch for switch opportunities.`
              }
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}