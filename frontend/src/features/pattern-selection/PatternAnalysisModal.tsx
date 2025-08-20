// Pattern Analysis Modal
// Shows detailed intelligence calculations and strategic analysis

import React from 'react'
import { Button } from '../../ui-components/Button'
import type { PatternRecommendation } from '../../stores/intelligence-store'

interface PatternAnalysisModalProps {
  isOpen: boolean
  onClose: () => void
  analysis: PatternRecommendation | null
}

export const PatternAnalysisModal: React.FC<PatternAnalysisModalProps> = ({
  isOpen,
  onClose,
  analysis
}) => {
  if (!isOpen || !analysis) return null

  // Derive recommendation level from completion percentage
  const recommendationLevel = analysis.completionPercentage >= 80 ? 'excellent' :
                              analysis.completionPercentage >= 65 ? 'good' :
                              analysis.completionPercentage >= 45 ? 'fair' :
                              analysis.completionPercentage >= 25 ? 'poor' : 'impossible'

  // Check if we have detailed analysis data
  const hasDetailedAnalysis = !!analysis.analysis!
  const hasScoreBreakdown = !!analysis.scoreBreakdown

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 65) return 'text-blue-600'
    if (score >= 45) return 'text-yellow-600'
    if (score >= 25) return 'text-orange-600'
    return 'text-red-600'
  }

  const getRecommendationBadge = (recommendation: string) => {
    const colors = {
      excellent: 'bg-green-100 text-green-800 border-green-200',
      good: 'bg-blue-100 text-blue-800 border-blue-200',
      fair: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      poor: 'bg-orange-100 text-orange-800 border-orange-200',
      impossible: 'bg-red-100 text-red-800 border-red-200'
    }
    
    return colors[recommendation as keyof typeof colors] || colors.fair
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">{analysis.pattern.displayName || analysis.pattern.pattern}</h2>
              <p className="text-indigo-100 mt-1">{analysis.pattern.pattern}</p>
            </div>
            <div className="text-right">
              <div className={`text-3xl font-bold ${getScoreColor(analysis.completionPercentage)}`}>
                {analysis.completionPercentage.toFixed(1)}
              </div>
              <div className="text-sm text-indigo-200">Completion Score</div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="p-6 space-y-6">
            
            {/* Quick Summary */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">Analysis Summary</h3>
                <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getRecommendationBadge(recommendationLevel)}`}>
                  {recommendationLevel.toUpperCase()}
                </span>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600">
                    {hasDetailedAnalysis ? (analysis.analysis!!.currentTiles?.count ?? 0) : '—'}
                  </div>
                  <div className="text-sm text-gray-600">Current Tiles</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-600">
                    {hasDetailedAnalysis ? (analysis.analysis!!.missingTiles?.total ?? 0) : '—'}
                  </div>
                  <div className="text-sm text-gray-600">Missing Tiles</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-600">
                    {hasDetailedAnalysis ? (analysis.analysis!!.jokerSituation?.available ?? 0) : '—'}
                  </div>
                  <div className="text-sm text-gray-600">Jokers Available</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {analysis.confidence.toFixed(0)}%
                  </div>
                  <div className="text-sm text-gray-600">Confidence</div>
                </div>
              </div>
            </div>

            {/* Score Breakdown */}
            <div className="bg-white border rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-4">Score Breakdown</h3>
              
              <div className="space-y-3">
                <ScoreBar 
                  label="Current Tiles" 
                  score={hasScoreBreakdown ? analysis.scoreBreakdown!.currentTileScore : 0} 
                  maxScore={40}
                  color="blue"
                />
                <ScoreBar 
                  label="Tile Availability" 
                  score={hasScoreBreakdown ? analysis.scoreBreakdown!.availabilityScore : 0} 
                  maxScore={30}
                  color="green"
                />
                <ScoreBar 
                  label="Joker Situation" 
                  score={hasScoreBreakdown ? analysis.scoreBreakdown!.jokerScore : 0} 
                  maxScore={20}
                  color="purple"
                />
                <ScoreBar 
                  label="Strategic Priority" 
                  score={hasScoreBreakdown ? analysis.scoreBreakdown!.priorityScore : 0} 
                  maxScore={10}
                  color="indigo"
                />
              </div>
            </div>

            {/* Current Hand Analysis */}
            {hasDetailedAnalysis && (
            <div className="bg-white border rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-4">Current Hand Analysis</h3>
              
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Pattern Completion</span>
                  <span className="text-sm font-bold text-blue-600">
                    {analysis.analysis!!.currentTiles.percentage.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${analysis.analysis!!.currentTiles.percentage}%` }}
                  />
                </div>
              </div>

              {analysis.analysis!!.currentTiles.matchingGroups.length > 0 && (
                <div>
                  <p className="text-sm text-gray-600 mb-2">Groups with matches:</p>
                  <div className="flex flex-wrap gap-2">
                    {analysis.analysis!!.currentTiles.matchingGroups.map(group => (
                      <span key={group} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                        {group}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            )}

            {/* Missing Tiles Analysis */}
            {hasDetailedAnalysis && (
            <div className="bg-white border rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-4">Missing Tiles Analysis</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <TileAvailabilityCard
                  title="Easy to Get"
                  tiles={analysis.analysis!.missingTiles.byAvailability.easy}
                  color="green"
                  description="3+ tiles remaining"
                />
                <TileAvailabilityCard
                  title="Moderate Risk"
                  tiles={analysis.analysis!.missingTiles.byAvailability.moderate}
                  color="yellow"
                  description="1-2 tiles remaining"
                />
                <TileAvailabilityCard
                  title="Need Jokers"
                  tiles={analysis.analysis!.missingTiles.byAvailability.difficult}
                  color="orange"
                  description="Must use jokers"
                />
                <TileAvailabilityCard
                  title="Impossible"
                  tiles={analysis.analysis!.missingTiles.byAvailability.impossible}
                  color="red"
                  description="No tiles available"
                />
              </div>
            </div>
            )}

            {/* Joker Strategy */}
            {hasDetailedAnalysis && (
            <div className="bg-white border rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-4">Joker Strategy</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {analysis.analysis!.jokerSituation.available}
                  </div>
                  <div className="text-sm text-purple-700">Available</div>
                </div>
                <div className="text-center p-3 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">
                    {analysis.analysis!.jokerSituation.needed}
                  </div>
                  <div className="text-sm text-orange-700">Needed</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {analysis.analysis!.jokerSituation.canComplete ? '✓' : '✗'}
                  </div>
                  <div className="text-sm text-green-700">Can Complete</div>
                </div>
              </div>

              {Object.keys(analysis.analysis!.jokerSituation.substitutionPlan).length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Joker Substitution Plan:</p>
                  <div className="space-y-1">
                    {Object.entries(analysis.analysis!.jokerSituation.substitutionPlan).map(([tile, canUse]) => (
                      <div key={tile} className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">{tile}</span>
                        <span className={`px-2 py-1 rounded text-xs ${
                          canUse 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {canUse ? 'Can use joker' : 'No joker allowed'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            )}

            {/* Strategic Recommendations */}
            <div className="bg-white border rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-4">Strategic Recommendations</h3>
              
              {(analysis.recommendations?.strategicNotes?.length ?? 0) > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Strategy Notes:</h4>
                  <ul className="space-y-1">
                    {(analysis.recommendations?.strategicNotes ?? []).map((note, index) => (
                      <li key={index} className="text-sm text-gray-600 flex items-start">
                        <span className="text-blue-500 mr-2">•</span>
                        {note}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {(analysis.recommendations?.riskFactors?.length ?? 0) > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Risk Factors:</h4>
                  <ul className="space-y-1">
                    {(analysis.recommendations?.riskFactors ?? []).map((risk, index) => (
                      <li key={index} className="text-sm text-red-600 flex items-start">
                        <span className="text-red-500 mr-2">⚠</span>
                        {risk}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Game State */}
            <div className="bg-white border rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-4">Game State Analysis</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-xl font-bold text-gray-700">
                    {analysis.analysis!.gameState.wallTilesRemaining}
                  </div>
                  <div className="text-sm text-gray-600">Tiles in Wall</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-xl font-bold text-gray-700">
                    {analysis.analysis!.gameState.turnsEstimated}
                  </div>
                  <div className="text-sm text-gray-600">Turns Remaining</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-xl font-bold text-gray-700">
                    {(analysis.analysis!.gameState.drawProbability * 100).toFixed(0)}%
                  </div>
                  <div className="text-sm text-gray-600">Draw Probability</div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="border-t bg-gray-50 p-4 flex justify-end space-x-3">
          <Button variant="secondary" onClick={onClose}>
            Close Analysis
          </Button>
          <Button variant="primary" onClick={onClose}>
            Select This Pattern
          </Button>
        </div>
      </div>
    </div>
  )
}

// Helper Components
const ScoreBar: React.FC<{
  label: string
  score: number
  maxScore: number
  color: string
}> = ({ label, score, maxScore, color }) => {
  const percentage = (score / maxScore) * 100
  
  const colorClasses = {
    blue: 'bg-blue-600',
    green: 'bg-green-600',
    purple: 'bg-purple-600',
    indigo: 'bg-indigo-600'
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-sm font-bold text-gray-900">
          {score.toFixed(1)}/{maxScore}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className={`h-2 rounded-full transition-all duration-500 ${colorClasses[color as keyof typeof colorClasses]}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

const TileAvailabilityCard: React.FC<{
  title: string
  tiles: string[]
  color: string
  description: string
}> = ({ title, tiles, color, description }) => {
  const colorClasses = {
    green: 'border-green-200 bg-green-50',
    yellow: 'border-yellow-200 bg-yellow-50',
    orange: 'border-orange-200 bg-orange-50',
    red: 'border-red-200 bg-red-50'
  }

  const textColorClasses = {
    green: 'text-green-800',
    yellow: 'text-yellow-800',
    orange: 'text-orange-800',
    red: 'text-red-800'
  }

  return (
    <div className={`border rounded-lg p-3 ${colorClasses[color as keyof typeof colorClasses]}`}>
      <div className="text-center mb-2">
        <div className={`text-xl font-bold ${textColorClasses[color as keyof typeof textColorClasses]}`}>
          {tiles.length}
        </div>
        <div className={`text-sm font-medium ${textColorClasses[color as keyof typeof textColorClasses]}`}>
          {title}
        </div>
        <div className="text-xs text-gray-600 mt-1">
          {description}
        </div>
      </div>
      
      {tiles.length > 0 && (
        <div className="space-y-1">
          {tiles.slice(0, 3).map(tile => (
            <div key={tile} className="text-xs text-gray-600 text-center bg-white/50 rounded px-1 py-0.5">
              {tile}
            </div>
          ))}
          {tiles.length > 3 && (
            <div className="text-xs text-gray-500 text-center">
              +{tiles.length - 3} more
            </div>
          )}
        </div>
      )}
    </div>
  )
}