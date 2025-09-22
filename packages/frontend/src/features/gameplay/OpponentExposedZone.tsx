import React from 'react'
import { Card } from '../../ui-components/Card'

interface OpponentExposedZoneProps {
  playerNames: string[]
  currentPlayerIndex: number
  playerExposedCount: Record<string, number>
  gameHistory: Array<{
    playerId: string
    action: string
    timestamp: Date
  }>
}

const OpponentExposedZone: React.FC<OpponentExposedZoneProps> = ({
  playerNames,
  currentPlayerIndex,
  playerExposedCount,
  gameHistory: _gameHistory,
  gameRound,
}) => {

  return (
    <Card className="p-3 sm:p-4 mb-4 bg-gradient-to-r from-purple-50 to-blue-50">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">Player Order</h3>
        <div className="text-xs text-gray-500">Turn {gameRound}</div>
      </div>
      <div className="flex items-center justify-center gap-2 sm:gap-4 mt-2 sm:mt-3">
        {playerNames.map((name, index) => (
          <div key={index} className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${
              currentPlayerIndex === index ? 'bg-green-500 animate-pulse' : 
              index === 0 ? 'bg-blue-500' : 'bg-gray-300'
            }`} />
            <span className={`text-xs sm:text-sm font-medium ${
              currentPlayerIndex === index ? 'text-green-600' : 
              index === 0 ? 'text-blue-600' : 'text-gray-500'
            }`}>
              {name}
            </span>
            {playerExposedCount[`player-${index + 1}`] > 0 && (
              <span className="text-xs bg-purple-100 text-purple-600 px-1 rounded">
                {playerExposedCount[`player-${index + 1}`]} sets
              </span>
            )}
          </div>
        ))}
      </div>
    </Card>
  )
}

export default OpponentExposedZone