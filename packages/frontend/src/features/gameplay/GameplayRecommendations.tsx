// GameplayRecommendations Component
// Shows AI recommendations for tile discarding during gameplay

import { useMemo } from 'react'
import type { AnalysisResult } from '../intelligence-panel/services/turn-intelligence-engine'

interface GameplayRecommendationsProps {
  analysis: AnalysisResult | null
  isLoading?: boolean
  className?: string
}

export function GameplayRecommendations({
  analysis,
  isLoading = false,
  className = ''
}: GameplayRecommendationsProps) {

  const confidenceLevel = useMemo(() => {
    if (!analysis?.confidence) return null
    const confidence = analysis.confidence

    if (confidence >= 0.8) return { level: 'high', color: 'green', label: 'High Confidence' }
    if (confidence >= 0.6) return { level: 'medium', color: 'yellow', label: 'Medium Confidence' }
    return { level: 'low', color: 'orange', label: 'Low Confidence' }
  }, [analysis?.confidence])

  const recommendations = useMemo(() => {
    if (!analysis?.tileRecommendations) return { keep: [], discard: [] }

    const keep = analysis.tileRecommendations.filter(rec => rec.action === 'keep')
    const discard = analysis.tileRecommendations.filter(rec => rec.action === 'discard')

    return { keep, discard }
  }, [analysis?.tileRecommendations])

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

  if (!analysis || (!recommendations.keep.length && !recommendations.discard.length)) {
    return (
      <div className={`bg-gray-50 border border-gray-200 rounded-lg ${className}`}>
        <div className="p-4 text-center">
          <div className="text-gray-400 mb-2">🤔</div>
          <p className="text-sm text-gray-600">Analyzing hand for recommendations...</p>
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
        {/* Discard Recommendations */}
        {recommendations.discard.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <h4 className="font-medium text-red-900 mb-2">🗑️ Recommended Discard</h4>
            <div className="mb-2">
              <p className="text-sm text-red-800 mb-1">Consider discarding:</p>
              <div className="flex flex-wrap gap-1">
                {recommendations.discard.slice(0, 3).map(rec => (
                  <span
                    key={rec.tileId}
                    className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800"
                  >
                    {rec.tileId}
                    {rec.reasoning && (
                      <span className="ml-1 text-red-600">
                        ({rec.reasoning.split(' ').slice(0, 2).join(' ')})
                      </span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Keep Recommendations */}
        {recommendations.keep.length > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-md p-3">
            <h4 className="font-medium text-green-900 mb-2">💎 Priority Keeps</h4>
            <div>
              <p className="text-sm text-green-800 mb-1">Keep for patterns:</p>
              <div className="flex flex-wrap gap-1">
                {recommendations.keep.slice(0, 5).map(rec => (
                  <span
                    key={rec.tileId}
                    className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800"
                  >
                    {rec.tileId}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Primary Pattern Info */}
        {analysis.recommendedPatterns && analysis.recommendedPatterns.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <h4 className="font-medium text-blue-900 mb-2">🎯 Target Pattern</h4>
            <p className="text-sm text-blue-800">
              {analysis.recommendedPatterns[0]?.name || 'Pattern analysis in progress...'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}