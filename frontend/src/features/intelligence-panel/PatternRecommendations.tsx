// Pattern Recommendations Component
// Shows AI's recommended patterns with user override capability

import { useState } from 'react'
import { usePatternStore } from '../../stores/pattern-store'
import { Button } from '../../ui-components/Button'
import { Card } from '../../ui-components/Card'
import { getColoredPatternParts, getColorClasses } from '../../utils/pattern-color-utils'
import type { PatternRecommendation } from '../../stores/intelligence-store'

interface PatternRecommendationsProps {
  recommendations: PatternRecommendation[]
  className?: string
}

export function PatternRecommendations({ recommendations, className = '' }: PatternRecommendationsProps) {
  const { selectedPatterns, addPattern, removePattern, clearPatterns } = usePatternStore()
  const [showOverride, setShowOverride] = useState(false)
  
  const acceptRecommendations = () => {
    clearPatterns()
    recommendations.forEach(rec => addPattern(rec.pattern))
  }
  
  const isPatternSelected = (patternId: string) => {
    return selectedPatterns.some(p => p.id === patternId)
  }
  
  const togglePattern = (pattern: PatternRecommendation['pattern']) => {
    if (isPatternSelected(pattern.id)) {
      removePattern(pattern.id)
    } else {
      addPattern(pattern)
    }
  }
  
  return (
    <Card variant="elevated" className={`space-y-4 ${className}`}>
      <div className="p-4 pb-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <span className="text-2xl">🤖</span>
              AI Pattern Recommendations
            </h3>
            <p className="text-sm text-gray-600">
              Based on your current hand analysis
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            {selectedPatterns.length === 0 && (
              <Button
                variant="primary"
                size="sm"
                onClick={acceptRecommendations}
              >
                Accept All
              </Button>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowOverride(!showOverride)}
            >
              {showOverride ? 'Hide Override' : 'Override'}
            </Button>
          </div>
        </div>
        
        {selectedPatterns.length > 0 && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2">
              <span className="text-green-600">✓</span>
              <span className="text-green-800 font-medium">
                {selectedPatterns.length} pattern{selectedPatterns.length > 1 ? 's' : ''} selected
              </span>
            </div>
          </div>
        )}
      </div>
      
      <div className="p-4 pt-0 space-y-3">
        {recommendations.map((rec, index) => (
          <PatternRecommendationCard
            key={rec.pattern.id}
            recommendation={rec}
            rank={index + 1}
            isSelected={isPatternSelected(rec.pattern.id)}
            onToggle={() => togglePattern(rec.pattern)}
            showControls={showOverride || selectedPatterns.length > 0}
          />
        ))}
        
        {showOverride && (
          <div className="pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600 mb-2">
              Want different patterns? Visit the{' '}
              <a 
                href="/patterns" 
                className="text-indigo-600 hover:text-indigo-800 underline"
              >
                Pattern Selection page
              </a>{' '}
              to browse all 71 NMJL patterns.
            </p>
          </div>
        )}
      </div>
    </Card>
  )
}

interface PatternRecommendationCardProps {
  recommendation: PatternRecommendation
  rank: number
  isSelected: boolean
  onToggle: () => void
  showControls: boolean
}

function PatternRecommendationCard({ 
  recommendation, 
  rank, 
  isSelected, 
  onToggle, 
  showControls 
}: PatternRecommendationCardProps) {
  const { pattern, confidence, completionPercentage, reasoning, isPrimary } = recommendation
  const coloredParts = getColoredPatternParts(pattern.pattern, pattern.groups)
  
  return (
    <div className={`border rounded-lg p-4 transition-all ${
      isPrimary 
        ? 'border-indigo-300 bg-indigo-50' 
        : isSelected
        ? 'border-green-300 bg-green-50'
        : 'border-gray-200 bg-white hover:border-gray-300'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
            isPrimary 
              ? 'bg-indigo-500 text-white'
              : 'bg-gray-300 text-gray-600'
          }`}>
            {rank}
          </div>
          
          <div>
            <div className="text-sm font-medium text-gray-900">
              Section {pattern.section} #{pattern.line}
            </div>
            <div className="text-xs text-gray-500 uppercase">
              {pattern.description}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {isPrimary && (
            <span className="px-2 py-1 text-xs font-medium bg-indigo-100 text-indigo-800 rounded">
              Primary
            </span>
          )}
          
          <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded">
            {pattern.points} pts
          </span>
          
          {showControls && (
            <Button
              variant={isSelected ? 'primary' : 'outline'}
              size="sm"
              onClick={onToggle}
            >
              {isSelected ? '✓ Selected' : 'Select'}
            </Button>
          )}
        </div>
      </div>
      
      {/* Colorized Pattern */}
      <div className="font-mono text-base tracking-wide mb-3">
        {coloredParts.map((part, index) => (
          <span key={index} className={getColorClasses(part.color)}>
            {part.text}
            {index < coloredParts.length - 1 && <span className="text-gray-400"> </span>}
          </span>
        ))}
      </div>
      
      {/* AI Analysis */}
      <div className="space-y-2">
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            <span className="text-gray-600">Confidence:</span>
            <span className="font-medium text-indigo-600">{confidence}%</span>
          </div>
          
          <div className="flex items-center gap-1">
            <span className="text-gray-600">Completion:</span>
            <span className="font-medium text-green-600">{completionPercentage}%</span>
          </div>
          
          <div className="flex items-center gap-1">
            <span className="text-gray-600">Difficulty:</span>
            <span className={`font-medium ${
              pattern.difficulty === 'hard' ? 'text-red-600' : 
              pattern.difficulty === 'medium' ? 'text-yellow-600' : 'text-green-600'
            }`}>
              {pattern.difficulty}
            </span>
          </div>
        </div>
        
        <p className="text-sm text-gray-700 italic">
          💡 {reasoning}
        </p>
      </div>
    </div>
  )
}