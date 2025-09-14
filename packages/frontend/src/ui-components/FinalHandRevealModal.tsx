// Final Hand Reveal Modal
// Shows all players' hands at game end with pattern analysis

import React from 'react'
import { Button } from './Button'
import { Card } from './Card'
import { AnimatedTile } from './tiles/AnimatedTile'
import type { PlayerTile } from 'shared-types'
import type { NMJL2025Pattern } from 'shared-types'

export interface FinalHandRevealData {
  allPlayerHands: Record<string, PlayerTile[]>
  playerNames: Record<string, string>
  winnerDetails?: {
    playerId: string
    winningPattern?: NMJL2025Pattern
    score: number
  }
  gameStatistics: {
    totalTurns: number
    gameDuration: string
    wallTilesRemaining: number
  }
}

interface FinalHandRevealModalProps {
  isOpen: boolean
  onClose: () => void
  data: FinalHandRevealData
  onContinueToPostGame: () => void
}

export const FinalHandRevealModal: React.FC<FinalHandRevealModalProps> = ({
  isOpen,
  onClose,
  data,
  onContinueToPostGame
}) => {
  if (!isOpen) return null

  const { allPlayerHands, playerNames, winnerDetails, gameStatistics } = data

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        <div className="space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-purple-600">Game Complete!</h2>
            {winnerDetails && (
              <div className="space-y-1">
                <p className="text-lg font-semibold text-green-600">
                  🏆 {playerNames[winnerDetails.playerId]} Wins!
                </p>
                {winnerDetails.winningPattern && (
                  <p className="text-sm text-gray-600">
                    {winnerDetails.winningPattern.Hand_Description} • {winnerDetails.score} points
                  </p>
                )}
              </div>
            )}
            
            {/* Game Statistics */}
            <div className="flex justify-center gap-6 text-sm text-gray-500">
              <span>Turns: {gameStatistics.totalTurns}</span>
              <span>Duration: {gameStatistics.gameDuration}</span>
              <span>Wall: {gameStatistics.wallTilesRemaining} tiles left</span>
            </div>
          </div>

          {/* All Player Hands */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-center">Final Hands</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(allPlayerHands).map(([playerId, tiles]) => (
                <Card key={playerId} className="p-4">
                  <div className="space-y-3">
                    {/* Player Name and Status */}
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">
                        {playerNames[playerId] || playerId}
                        {winnerDetails?.playerId === playerId && (
                          <span className="ml-2 text-green-600 text-sm">👑 Winner</span>
                        )}
                      </h4>
                      <span className="text-sm text-gray-500">
                        {tiles.length} tiles
                      </span>
                    </div>

                    {/* Player's Hand */}
                    <div className="flex flex-wrap gap-1">
                      {tiles.map((tile, index) => (
                        <div key={`${playerId}-${tile.id}-${index}`}>
                          <AnimatedTile
                            tile={tile}
                            onClick={() => {}}
                            size="sm"
                            context="analysis"
                            recommendationType={winnerDetails?.playerId === playerId ? 'keep' : undefined}
                          />
                        </div>
                      ))}
                    </div>

                    {/* Winner's Pattern Analysis */}
                    {winnerDetails?.playerId === playerId && winnerDetails.winningPattern && (
                      <div className="mt-2 p-2 bg-green-50 rounded border border-green-200">
                        <p className="text-xs text-green-700 font-medium">
                          Winning Pattern: {winnerDetails.winningPattern.Hand_Description}
                        </p>
                        <p className="text-xs text-green-600">
                          Points: {winnerDetails.score} • Difficulty: {winnerDetails.winningPattern.Hand_Difficulty}
                        </p>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-center gap-4">
            <Button
              variant="secondary"
              onClick={onClose}
            >
              Close Reveal
            </Button>
            <Button
              variant="primary"
              onClick={onContinueToPostGame}
            >
              View Full Analysis
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}