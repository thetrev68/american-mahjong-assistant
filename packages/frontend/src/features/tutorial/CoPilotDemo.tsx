// Co-Pilot Demo Component
// Interactive demonstration of AI assistant features

import React, { useState, useMemo } from 'react'
import { Card } from '../../ui-components/Card'
import { Button } from '../../ui-components/Button'
import { AnimatedTile } from '../../ui-components/tiles/AnimatedTile'
import { tileService } from '../../lib/services/tile-service'
import type { CoPilotDemoProps } from './types'
import type { PlayerTile } from 'shared-types'

// Simple helper to create mock tiles for the demo
const createMockTile = (id: string): PlayerTile => {
  const tileData = tileService.getTileById(id)
  return {
    id: tileData?.id || id,
    suit: tileData?.suit || 'dots',
    value: tileData?.value || '1',
    displayName: tileData?.displayName || id,
    instanceId: `mock_${id}`,
    isSelected: false,
  }
}

// Generate a sample hand using the same logic as TileInputPage
const generateSampleHand = (): PlayerTile[] => {
  // Get all tile IDs from the service
  const tileIds = tileService.getAllTiles().map(tile => tile.id)
  
  // Simple shuffle function  
  const shuffledPool = tileIds.sort(() => Math.random() - 0.5)
  
  // Select the first 13 tiles for demo
  const randomTileIds = shuffledPool.slice(0, 13)
  
  // Convert to PlayerTile objects
  return randomTileIds.map((tileId, _index) => {
    const tileData = tileService.getTileById(tileId)
    return {
      id: tileId,
      suit: tileData?.suit || 'dots',
      value: tileData?.value || '1',
      displayName: tileData?.displayName || tileId,
      instanceId: `demo_${tileId}`,
      isSelected: false,
    }
  })
}


export const CoPilotDemo: React.FC<CoPilotDemoProps> = ({
  feature,
  onComplete,
}) => {
  const [selectedTile, setSelectedTile] = useState<string | null>(null)
  const [showRecommendations, setShowRecommendations] = useState(false)
  
  // Generate a sample hand for the demo using the same logic as TileInputPage
  const sampleHand = useMemo(() => generateSampleHand(), [])

  const handleTileClick = (tile: PlayerTile) => {
    setSelectedTile(tile.id)
    setShowRecommendations(true)
  }

  const getDemoContent = () => {
    switch (feature) {
      case 'pattern-selection':
        return {
          title: 'Smart Pattern Selection',
          icon: '🎯',
          description: 'See how AI helps you choose the best patterns for your hand',
          content: (
            <div className="space-y-6">
              <Card variant="default" className="p-4 bg-green-50 border-green-200">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-green-900">Recommended Patterns</h4>
                    <div className="text-green-700 text-sm">95% confidence</div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 bg-white rounded border">
                      <span className="font-mono text-sm">#23 Like Numbers</span>
                      <span className="text-green-600 font-medium">25 pts</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-white rounded border">
                      <span className="font-mono text-sm">#15 Consecutive</span>
                      <span className="text-blue-600 font-medium">30 pts</span>
                    </div>
                  </div>
                  <p className="text-sm text-green-800">
                    💡 Your current tiles work well with these patterns. Keep collecting 1s, 2s, and 3s.
                  </p>
                </div>
              </Card>
            </div>
          )
        }

      case 'tile-analysis':
        return {
          title: 'Intelligent Tile Analysis',
          icon: '🧠',
          description: 'Click any tile to see detailed AI recommendations',
          content: (
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-gray-600 mb-4">Click on any tile below to see AI analysis:</p>
                <div className="flex flex-wrap justify-center gap-3 p-6 bg-gray-50 rounded-lg">
                  {sampleHand.slice(0, 8).map(tile => (
                    <div key={tile.instanceId} className="transform hover:scale-110 transition-transform">
                      <AnimatedTile
                        tile={tile}
                        size="md"
                        onClick={handleTileClick}
                        animateOnSelect={true}
                        context="selection"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {showRecommendations && selectedTile && (
                <Card variant="elevated" className="p-4 border-blue-200 bg-blue-50">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-blue-900">
                        AI Analysis: {selectedTile}
                      </h4>
                      <div className="text-blue-700 text-sm">Strong Keep</div>
                    </div>
                    <div className="space-y-2 text-sm text-blue-800">
                      <p>✅ <strong>Keep this tile:</strong> Essential for consecutive pattern</p>
                      <p>📈 <strong>Pattern fit:</strong> Works with 3 of your target patterns</p>
                      <p>🎲 <strong>Probability:</strong> 73% chance of completing sequence</p>
                      <p>💰 <strong>Value:</strong> Could lead to 30-point hand</p>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          )
        }

      case 'charleston':
        return {
          title: 'Charleston Strategy',
          icon: '🔄',
          description: 'Learn optimal tile exchanges with AI guidance',
          content: (
            <div className="space-y-6">
              <div className="text-center space-y-4">
                <h4 className="text-lg font-semibold">Charleston Pass Recommendations</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card variant="default" className="p-4 bg-red-50 border-red-200">
                    <div className="text-center space-y-3">
                      <div className="text-red-600 font-medium text-lg">Pass →</div>
                      <div className="flex justify-center py-2">
                        <AnimatedTile
                          tile={createMockTile('east')}
                          size="md"
                          interactive={false}
                        />
                      </div>
                      <div className="text-sm text-red-700 font-medium">Low value, doesn't fit patterns</div>
                    </div>
                  </Card>

                  <Card variant="default" className="p-4 bg-green-50 border-green-200">
                    <div className="text-center space-y-3">
                      <div className="text-green-600 font-medium text-lg">Keep ✓</div>
                      <div className="flex justify-center py-2">
                        <AnimatedTile
                          tile={createMockTile('2D')}
                          size="md"
                          interactive={false}
                        />
                      </div>
                      <div className="text-sm text-green-700 font-medium">Essential for consecutive</div>
                    </div>
                  </Card>

                  <Card variant="default" className="p-4 bg-yellow-50 border-yellow-200">
                    <div className="text-center space-y-3">
                      <div className="text-yellow-600 font-medium text-lg">Maybe</div>
                      <div className="flex justify-center py-2">
                        <AnimatedTile
                          tile={createMockTile('red')}
                          size="md"
                          interactive={false}
                        />
                      </div>
                      <div className="text-sm text-yellow-700 font-medium">Valuable but flexible</div>
                    </div>
                  </Card>
                </div>
              </div>

              <Card variant="default" className="p-4 bg-blue-50 border-blue-200">
                <div className="text-center space-y-2">
                  <h4 className="font-medium text-blue-900">AI Strategy Tip</h4>
                  <p className="text-sm text-blue-800">
                    Pass tiles that don't fit your target patterns, but keep one backup option open.
                    Your consecutive run is looking strong!
                  </p>
                </div>
              </Card>
            </div>
          )
        }

      case 'full-game':
      default:
        return {
          title: 'Complete Co-Pilot Experience',
          icon: '🤖',
          description: 'Experience the full power of AI-assisted mahjong',
          content: (
            <div className="space-y-6 text-center">
              <div className="space-y-4">
                <div className="text-6xl">🎮</div>
                <h3 className="text-xl font-semibold text-gray-900">
                  Your AI Co-Pilot is Ready!
                </h3>
                <p className="text-gray-600 max-w-2xl mx-auto">
                  You now have an intelligent assistant that provides real-time recommendations
                  for pattern selection, tile decisions, and charleston strategy - all while
                  you maintain full control of your game.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card variant="default" className="p-4">
                  <div className="text-center space-y-2">
                    <div className="text-2xl">🎯</div>
                    <h4 className="font-medium">Smart Patterns</h4>
                    <p className="text-sm text-gray-600">AI suggests optimal pattern combinations</p>
                  </div>
                </Card>
                <Card variant="default" className="p-4">
                  <div className="text-center space-y-2">
                    <div className="text-2xl">🧠</div>
                    <h4 className="font-medium">Tile Intelligence</h4>
                    <p className="text-sm text-gray-600">Get keep/pass/discard recommendations</p>
                  </div>
                </Card>
                <Card variant="default" className="p-4">
                  <div className="text-center space-y-2">
                    <div className="text-2xl">📊</div>
                    <h4 className="font-medium">Real-time Analysis</h4>
                    <p className="text-sm text-gray-600">Probability and strategy insights</p>
                  </div>
                </Card>
              </div>
            </div>
          )
        }
    }
  }

  const demo = getDemoContent()

  return (
    <div className="space-y-6">
      {/* Demo Header */}
      <div className="text-center space-y-4">
        <div className="text-4xl">{demo.icon}</div>
        <h2 className="text-2xl font-bold text-gray-900">{demo.title}</h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          {demo.description}
        </p>
      </div>

      {/* Demo Content */}
      <div className="max-w-3xl mx-auto">
        {demo.content}
      </div>

      {/* Demo Controls */}
      <div className="text-center space-y-4">
        <div className="flex justify-center space-x-4">
          <Button variant="outline" onClick={() => setShowRecommendations(!showRecommendations)}>
            {showRecommendations ? 'Hide' : 'Show'} AI Analysis
          </Button>
          {onComplete && (
            <Button variant="primary" onClick={onComplete}>
              Continue Tutorial
            </Button>
          )}
        </div>
        
        <p className="text-sm text-gray-600">
          💡 This is just a preview - the real co-pilot adapts to your actual game!
        </p>
      </div>
    </div>
  )
}