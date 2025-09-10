// PassingRecommendations Component
// Shows AI recommendations for Charleston tile passing

import { useMemo } from 'react'
import type { CharlestonRecommendation } from '../../utils/charleston-adapter'

interface PassingRecommendationsProps {
  recommendations: CharlestonRecommendation | null
  isLoading?: boolean
  className?: string
}

export function PassingRecommendations({ 
  recommendations, 
  isLoading = false, 
  className = '' 
}: PassingRecommendationsProps) {
  
  const confidenceLevel = useMemo(() => {
    if (!recommendations) return null
    const confidence = recommendations.confidence
    
    if (confidence >= 0.8) return { level: 'high', color: 'green', label: 'High Confidence' }
    if (confidence >= 0.6) return { level: 'medium', color: 'yellow', label: 'Medium Confidence' }
    return { level: 'low', color: 'orange', label: 'Low Confidence' }
  }, [recommendations])
  
  if (isLoading) {
    return (
      <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
        <div className="p-4">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-gray-300 rounded-full animate-pulse"></div>
            <div className="h-4 bg-gray-300 rounded w-32 animate-pulse"></div>
          </div>
          <div className="mt-3 space-y-2">
            <div className="h-3 bg-gray-200 rounded w-full animate-pulse"></div>
            <div className="h-3 bg-gray-200 rounded w-3/4 animate-pulse"></div>
          </div>
        </div>
      </div>
    )
  }
  
  if (!recommendations) {
    return (
      <div className={`bg-gray-50 border border-gray-200 rounded-lg ${className}`}>
        <div className="p-4 text-center">
          <div className="text-gray-400 mb-2">🤔</div>
          <p className="text-sm text-gray-600">Enter your tiles to get AI recommendations</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
      {/* Header with confidence indicator */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">AI Recommendations</h3>
          {confidenceLevel && (
            <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${
              confidenceLevel.color === 'green'
                ? 'bg-green-100 text-green-800'
                : confidenceLevel.color === 'yellow'
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-orange-100 text-orange-800'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                confidenceLevel.color === 'green'
                  ? 'bg-green-500'
                  : confidenceLevel.color === 'yellow'
                  ? 'bg-yellow-500'
                  : 'bg-orange-500'
              }`}></div>
              <span>{confidenceLevel.label}</span>
            </div>
          )}
        </div>
      </div>
      
      <div className="p-4 space-y-4">
        {/* Main Recommendation */}
        <div className="bg-indigo-50 border border-indigo-200 rounded-md p-3">
          <h4 className="font-medium text-indigo-900 mb-2">🎯 Recommended Pass</h4>
          
          {/* Tiles to Pass */}
          <div className="mb-3">
            <p className="text-sm text-indigo-800 mb-1">Pass these tiles:</p>
            <div className="flex flex-wrap gap-2">
              {recommendations.tilesToPass.map(tile => (
                <TileChip key={tile.id} tile={tile} action="pass" />
              ))}
            </div>
          </div>
          
          {/* Keep Priority */}
          <div>
            <p className="text-sm text-indigo-800 mb-1">Keep these tiles:</p>
            <div className="flex flex-wrap gap-2 max-h-20 overflow-y-auto">
              {recommendations.tilesToKeep.slice(0, 8).map(tile => (
                <TileChip key={tile.id} tile={tile} action="keep" />
              ))}
              {recommendations.tilesToKeep.length > 8 && (
                <span className="text-xs text-indigo-600 px-2 py-1 bg-indigo-100 rounded">
                  +{recommendations.tilesToKeep.length - 8} more
                </span>
              )}
            </div>
          </div>
        </div>
        
        {/* Strategic Reasoning */}
        <div>
          <h4 className="font-medium text-gray-900 mb-2">💡 Why This Works</h4>
          <div className="space-y-1">
            {recommendations.reasoning.map((reason, index) => (
              <div key={index} className="text-sm text-gray-600 flex items-start space-x-2">
                <span className="text-gray-400 mt-0.5">•</span>
                <span dangerouslySetInnerHTML={{ __html: reason.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
              </div>
            ))}
          </div>
        </div>
        
        {/* Strategic Advice */}
        {recommendations.strategicAdvice.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-900 mb-2">📋 Strategic Notes</h4>
            <div className="space-y-1">
              {recommendations.strategicAdvice.map((advice, index) => (
                <div key={index} className="text-sm text-gray-600 flex items-start space-x-2">
                  <span className="text-blue-400 mt-0.5">→</span>
                  <span>{advice}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Alternative Options */}
        {recommendations.alternativeOptions.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-900 mb-2">🔄 Alternative Options</h4>
            <div className="space-y-2">
              {recommendations.alternativeOptions.map((alt, index) => (
                <div key={index} className="bg-gray-50 rounded-md p-2">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-xs font-medium text-gray-500">Option {index + 2}:</span>
                    <div className="flex space-x-1">
                      {alt.tilesToPass.map(tile => (
                        <span key={tile.id} className="text-xs px-1 py-0.5 bg-gray-200 text-gray-700 rounded">
                          {tile.id}
                        </span>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-gray-600">{alt.reasoning}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

interface TileChipProps {
  tile: { id: string; isJoker?: boolean; suit?: string }
  action: 'pass' | 'keep'
}

function TileChip({ tile, action }: TileChipProps) {
  const isJoker = tile.isJoker || tile.suit === 'jokers'
  
  return (
    <span className={`inline-flex items-center space-x-1 px-2 py-1 text-xs font-medium rounded ${
      action === 'pass'
        ? isJoker
          ? 'bg-red-100 text-red-800 border border-red-300' // Warning for jokers
          : 'bg-orange-100 text-orange-800'
        : 'bg-green-100 text-green-800'
    }`}>
      <span>{tile.id}</span>
      {isJoker && action === 'pass' && (
        <span className="text-red-600">⚠️</span>
      )}
    </span>
  )
}