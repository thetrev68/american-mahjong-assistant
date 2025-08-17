// Post-Game Analysis View - Main interface for reviewing completed games
// Provides comprehensive analysis, learning insights, and social features

import React, { useState, useEffect } from 'react'
import { useGameHistory } from '../../hooks/useGameHistory'
import { Card } from '../../ui-components/Card'
import { Button } from '../../ui-components/Button'
import { LoadingSpinner } from '../../ui-components/LoadingSpinner'
import { AnimatedTile } from '../../ui-components/tiles/AnimatedTile'
import type { CompletedGame } from '../../stores/history-store'

interface PostGameViewProps {
  gameId?: string
  onClose?: () => void
  onNavigateToHistory?: () => void
}

export const PostGameView: React.FC<PostGameViewProps> = ({
  gameId,
  onClose,
  onNavigateToHistory
}) => {
  const {
    selectedGame,
    learningRecommendations,
    selectGame,
    shareGame,
    setViewMode,
    isLoading,
    error,
    clearError
  } = useGameHistory()

  const [activeTab, setActiveTab] = useState<'overview' | 'detailed' | 'learning' | 'social'>('overview')
  const [isSharing, setIsSharing] = useState(false)

  // Select the game if gameId is provided
  useEffect(() => {
    if (gameId && (!selectedGame || selectedGame.id !== gameId)) {
      selectGame(gameId)
    }
  }, [gameId, selectedGame, selectGame])

  // Handle sharing
  const handleShare = async () => {
    if (!selectedGame) return
    
    setIsSharing(true)
    try {
      const success = await shareGame(selectedGame.id)
      if (success) {
        // Could show a success message
      }
    } catch (error) {
      console.error('Failed to share game:', error)
    } finally {
      setIsSharing(false)
    }
  }

  // Handle navigation
  const handleViewAllHistory = () => {
    setViewMode('overview')
    onNavigateToHistory?.()
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <LoadingSpinner size="lg" />
        <span className="ml-3 text-gray-600">Analyzing game performance...</span>
      </div>
    )
  }

  if (error) {
    return (
      <Card className="p-6 max-w-md mx-auto">
        <div className="text-center">
          <div className="text-red-500 text-lg font-semibold mb-2">Analysis Error</div>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={clearError}>Try Again</Button>
        </div>
      </Card>
    )
  }

  if (!selectedGame) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card className="p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">No Game Selected</h2>
          <p className="text-gray-600 mb-6">
            Select a completed game to view detailed analysis and insights.
          </p>
          <div className="space-y-4">
            <Button onClick={handleViewAllHistory}>
              View Game History
            </Button>
            {onClose && (
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            )}
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Game Analysis</h1>
          <p className="text-gray-600">
            {selectedGame.timestamp.toLocaleDateString()} • 
            {selectedGame.duration} minutes • 
            {selectedGame.difficulty} difficulty
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            onClick={handleShare}
            disabled={isSharing}
            icon={isSharing ? <LoadingSpinner size="sm" /> : '🔗'}
          >
            Share
          </Button>
          {onClose && (
            <Button variant="ghost" onClick={onClose}>
              ✕
            </Button>
          )}
        </div>
      </div>

      {/* Game Outcome Banner */}
      <Card className={`p-6 mb-6 ${
        selectedGame.outcome === 'won' 
          ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200' 
          : selectedGame.outcome === 'lost'
          ? 'bg-gradient-to-r from-red-50 to-rose-50 border-red-200'
          : 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className={`text-4xl ${
              selectedGame.outcome === 'won' ? 'text-green-600' : 
              selectedGame.outcome === 'lost' ? 'text-red-600' : 'text-yellow-600'
            }`}>
              {selectedGame.outcome === 'won' ? '🏆' : 
               selectedGame.outcome === 'lost' ? '💔' : '🤝'}
            </div>
            <div>
              <h2 className="text-2xl font-bold">
                {selectedGame.outcome === 'won' ? 'Victory!' : 
                 selectedGame.outcome === 'lost' ? 'Learning Experience' : 'Draw Game'}
              </h2>
              <p className="text-lg">
                Final Score: <span className="font-bold">{selectedGame.finalScore}</span>
                {selectedGame.winningPattern && (
                  <span className="ml-4">
                    Pattern: <span className="font-semibold">{selectedGame.winningPattern.Hand_Description}</span>
                  </span>
                )}
              </p>
            </div>
          </div>
          
          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-sm text-gray-600">Decision Quality</div>
              <div className="text-lg font-bold">
                {Math.round(
                  ((selectedGame.performance.excellentDecisions + selectedGame.performance.goodDecisions) / 
                   selectedGame.performance.totalDecisions) * 100
                )}%
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Pattern Efficiency</div>
              <div className="text-lg font-bold">{selectedGame.performance.patternEfficiency}%</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Charleston</div>
              <div className="text-lg font-bold">{selectedGame.performance.charlestonSuccess}%</div>
            </div>
          </div>
        </div>
      </Card>

      {/* Final Hand Display */}
      <Card className="p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">Final Hand</h3>
        <div className="flex flex-wrap gap-2 justify-center">
          {selectedGame.finalHand.map((tile, index) => (
            <AnimatedTile
              key={index}
              tile={tile}
              size="lg"
              className={tile.isWinning ? 'ring-2 ring-yellow-400' : ''}
              context="display"
            />
          ))}
        </div>
        {selectedGame.finalHand.length === 0 && (
          <p className="text-gray-500 text-center py-8">No final hand data available</p>
        )}
      </Card>

      {/* Navigation Tabs */}
      <div className="border-b mb-6">
        <nav className="flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: '📊' },
            { id: 'detailed', label: 'Detailed Analysis', icon: '🔍' },
            { id: 'learning', label: 'Learning Insights', icon: '🎓' },
            { id: 'social', label: 'Social', icon: '👥' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-96">
        {activeTab === 'overview' && (
          <OverviewTab game={selectedGame} />
        )}
        {activeTab === 'detailed' && (
          <DetailedAnalysisTab game={selectedGame} />
        )}
        {activeTab === 'learning' && (
          <LearningInsightsTab 
            game={selectedGame} 
            recommendations={learningRecommendations}
          />
        )}
        {activeTab === 'social' && (
          <SocialTab game={selectedGame} />
        )}
      </div>

      {/* Action Footer */}
      <div className="mt-8 pt-6 border-t">
        <div className="flex justify-between items-center">
          <Button variant="outline" onClick={handleViewAllHistory}>
            View All Games
          </Button>
          <div className="flex space-x-3">
            <Button variant="outline">
              Compare Games
            </Button>
            <Button>
              Play Again
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Overview Tab Component
const OverviewTab: React.FC<{ game: CompletedGame }> = ({ game }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Performance Metrics */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Performance Metrics</h3>
        <div className="space-y-4">
          <MetricBar
            label="Decision Quality"
            value={(game.performance.excellentDecisions + game.performance.goodDecisions) / game.performance.totalDecisions * 100}
            total={100}
            color="blue"
          />
          <MetricBar
            label="Pattern Efficiency"
            value={game.performance.patternEfficiency}
            total={100}
            color="green"
          />
          <MetricBar
            label="Charleston Success"
            value={game.performance.charlestonSuccess}
            total={100}
            color="purple"
          />
        </div>
      </Card>

      {/* Selected Patterns */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Selected Patterns</h3>
        <div className="space-y-3">
          {game.selectedPatterns.map((pattern, index) => (
            <div 
              key={index}
              className={`p-3 rounded-lg border ${
                game.winningPattern?.Hands_Key === pattern.Hands_Key
                  ? 'bg-green-50 border-green-200'
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-medium">{pattern.Hand_Description}</div>
                  <div className="text-sm text-gray-600">
                    {pattern.Hand_Points} points • {pattern.Hand_Difficulty} difficulty
                  </div>
                </div>
                {game.winningPattern?.Hands_Key === pattern.Hands_Key && (
                  <span className="text-green-600 font-semibold">✓ Won</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Key Insights */}
      <Card className="p-6 lg:col-span-2">
        <h3 className="text-lg font-semibold mb-4">Key Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-green-600 mb-2">Strengths</h4>
            <ul className="space-y-1">
              {game.insights.strengthAreas.map((strength, index) => (
                <li key={index} className="text-sm text-gray-600 flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  {strength}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-amber-600 mb-2">Areas for Improvement</h4>
            <ul className="space-y-1">
              {game.insights.improvementAreas.map((area, index) => (
                <li key={index} className="text-sm text-gray-600 flex items-center">
                  <span className="text-amber-500 mr-2">→</span>
                  {area}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Card>
    </div>
  )
}

// Detailed Analysis Tab Component
const DetailedAnalysisTab: React.FC<{ game: CompletedGame }> = ({ game }) => {
  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Decision Timeline</h3>
        <div className="space-y-3">
          {game.decisions.map((decision) => (
            <div key={decision.id} className="border-l-4 border-gray-200 pl-4">
              <div className="flex justify-between items-start">
                <div>
                  <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                    decision.quality === 'excellent' ? 'bg-green-100 text-green-800' :
                    decision.quality === 'good' ? 'bg-blue-100 text-blue-800' :
                    decision.quality === 'fair' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {decision.quality}
                  </span>
                  <div className="mt-1 font-medium">{decision.type} decision</div>
                  <div className="text-sm text-gray-600">{decision.reasoning}</div>
                </div>
                <div className="text-xs text-gray-500">
                  {decision.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
        </div>
        {game.decisions.length === 0 && (
          <p className="text-gray-500 text-center py-8">No decision data available</p>
        )}
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Pattern Analysis</h3>
        <div className="space-y-4">
          {game.patternAnalyses.map((analysis, index) => (
            <div key={index} className="border rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-medium">{analysis.pattern.Hand_Description}</h4>
                <span className="text-sm text-gray-600">
                  {analysis.completionPercentage.toFixed(1)}% complete
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${analysis.completionPercentage}%` }}
                />
              </div>
              {analysis.timeToCompletion && (
                <div className="mt-2 text-sm text-gray-600">
                  Completed in {Math.round(analysis.timeToCompletion / 60)} minutes
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

// Learning Insights Tab Component  
const LearningInsightsTab: React.FC<{ 
  game: CompletedGame
  recommendations: Array<{
    id: string
    type: string
    priority: string
    title: string
    description: string
    actionable: string
    estimatedImpact: string
  }>
}> = ({ game, recommendations }) => {
  const gameRecommendations = recommendations.filter(rec => 
    (rec as any).relatedGames?.includes(game.id)
  )

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Learning Opportunities</h3>
        <div className="space-y-3">
          {game.insights.learningOpportunities.map((opportunity, index) => (
            <div key={index} className="flex items-start space-x-3">
              <span className="text-blue-500 mt-1">💡</span>
              <span className="text-gray-700">{opportunity}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Recommended Patterns</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {game.insights.recommendedPatterns.map((pattern, index) => (
            <div key={index} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="font-medium text-blue-800">{pattern}</div>
              <div className="text-sm text-blue-600">Practice this pattern next</div>
            </div>
          ))}
        </div>
      </Card>

      {gameRecommendations.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Personalized Recommendations</h3>
          <div className="space-y-4">
            {gameRecommendations.map((rec) => (
              <div key={rec.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium">{rec.title}</h4>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    rec.priority === 'high' ? 'bg-red-100 text-red-800' :
                    rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {rec.priority} priority
                  </span>
                </div>
                <p className="text-gray-600 text-sm mb-2">{rec.description}</p>
                <p className="text-blue-600 text-sm font-medium mb-2">{rec.actionable}</p>
                <p className="text-gray-500 text-xs">{rec.estimatedImpact}</p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

// Social Tab Component
const SocialTab: React.FC<{ game: CompletedGame }> = ({ game }) => {
  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Share This Game</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span>Share with community</span>
            <Button size="sm" disabled={game.shared}>
              {game.shared ? 'Shared ✓' : 'Share'}
            </Button>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span>Export analysis</span>
            <Button size="sm" variant="outline">
              Export
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Community Feedback</h3>
        {game.votes > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <span className="text-green-600">👍</span>
              <span>{game.votes} people found this game helpful</span>
            </div>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">
            Share this game to receive community feedback
          </p>
        )}
      </Card>
    </div>
  )
}

// Helper Component for Progress Bars
const MetricBar: React.FC<{
  label: string
  value: number
  total: number
  color: 'blue' | 'green' | 'purple'
}> = ({ label, value, total, color }) => {
  const percentage = (value / total) * 100
  const colorClasses = {
    blue: 'bg-blue-600',
    green: 'bg-green-600', 
    purple: 'bg-purple-600'
  }

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-600">{label}</span>
        <span className="font-medium">{value.toFixed(1)}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className={`h-2 rounded-full ${colorClasses[color]}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  )
}