// GameplayRecommendations Component
// Shows AI recommendations for tile discarding during gameplay

import { useMemo } from 'react'
import type { HandAnalysis, TileRecommendation } from '../../stores/intelligence-store'
import { getTileDisplayChar, getTileCharClasses } from '../../utils/tile-display-utils'

interface GameplayRecommendationsProps {
  analysis: HandAnalysis | null
  isLoading?: boolean
  className?: string
  gamePhase?: 'charleston' | 'gameplay'
}

export function GameplayRecommendations({
  analysis,
  isLoading = false,
  className = '',
  gamePhase = 'gameplay'
}: GameplayRecommendationsProps) {

  const confidenceLevel = useMemo(() => {
    if (!analysis?.turnIntelligence?.confidence) return null
    const confidence = analysis.turnIntelligence.confidence / 100 // Convert 0-100 to 0-1

    if (confidence >= 0.8) return { level: 'high', color: 'green', label: 'High Confidence' }
    if (confidence >= 0.6) return { level: 'medium', color: 'yellow', label: 'Medium Confidence' }
    return { level: 'low', color: 'orange', label: 'Low Confidence' }
  }, [analysis?.turnIntelligence?.confidence])

  const recommendations = useMemo(() => {
    console.log('🎯 GameplayRecommendations - analysis:', !!analysis)
    console.log('🎯 GameplayRecommendations - tileRecommendations:', analysis?.tileRecommendations?.length)
    console.log('🎯 GameplayRecommendations - tileRecommendations:', analysis?.tileRecommendations)

    if (!analysis?.tileRecommendations) return { keep: [], discard: [], pass: [] }

    const keep = analysis.tileRecommendations.filter((rec: TileRecommendation) => rec.action === 'keep')
    const discard = analysis.tileRecommendations.filter((rec: TileRecommendation) => rec.action === 'discard')
    const pass = analysis.tileRecommendations.filter((rec: TileRecommendation) => rec.action === 'pass')

    console.log('🎯 Filtered recommendations:', { keep: keep.length, discard: discard.length, pass: pass.length })

    return { keep, discard, pass }
  }, [analysis])

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

  if (!analysis || (!recommendations.keep.length && !recommendations.discard.length && !recommendations.pass.length)) {
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
        {/* Charleston Pass Recommendations */}
        {gamePhase === 'charleston' && recommendations.pass.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <h4 className="font-medium text-red-900 mb-2">Recommended Charleston Pass</h4>
            <div className="mb-2">
              <p className="text-sm text-red-800 mb-1">Consider passing:</p>
              <div className="flex flex-wrap gap-1">
                {recommendations.pass.slice(0, 3).map((rec: TileRecommendation) => {
                  const tileChar = getTileDisplayChar(rec.tileId)
                  return (
                    <span
                      key={rec.tileId}
                      className={getTileCharClasses(tileChar, false)}
                    >
                      {tileChar.char}
                    </span>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Gameplay Discard Recommendations */}
        {gamePhase === 'gameplay' && recommendations.discard.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <h4 className="font-medium text-red-900 mb-2">Recommended Discard</h4>
            <div className="mb-2">
              <p className="text-sm text-red-800 mb-1">Consider discarding:</p>
              <div className="flex flex-wrap gap-1">
                {recommendations.discard.slice(0, 3).map((rec: TileRecommendation) => {
                  const tileChar = getTileDisplayChar(rec.tileId)
                  return (
                    <span
                      key={rec.tileId}
                      className={getTileCharClasses(tileChar, false)}
                    >
                      {tileChar.char}
                    </span>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Keep Recommendations */}
        {recommendations.keep.length > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-md p-3">
            <h4 className="font-medium text-green-900 mb-2">Priority Keeps</h4>
            <div>
              <p className="text-sm text-green-800 mb-1">Keep for patterns:</p>
              <div className="flex flex-wrap gap-1">
                {recommendations.keep.slice(0, 5).map((rec: TileRecommendation) => {
                  const tileChar = getTileDisplayChar(rec.tileId)
                  return (
                    <span
                      key={rec.tileId}
                      className={getTileCharClasses(tileChar, false)}
                    >
                      {tileChar.char}
                    </span>
                  )
                })}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}