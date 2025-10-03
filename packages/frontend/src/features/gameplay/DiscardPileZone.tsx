import React from 'react'
import { Card } from '../../ui-components/Card'
import { AnimatedTile } from '../../ui-components/tiles/AnimatedTile'
import type { Tile } from 'shared-types'

interface DiscardPileZoneProps {
  discardPile: Array<{
    tile: Tile
    playerId: string
    timestamp: Date
  }>
  playerNames?: string[]
  playerExposedCount?: Record<string, number>
}

const DiscardPileZone: React.FC<DiscardPileZoneProps> = ({
  discardPile,
  playerNames = [],
  playerExposedCount = {}
}) => {
  
  const recentDiscards = discardPile.slice(-8) // Show last 8 discards

  return (
    <Card className="p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-800">Discard Pile</h3>
        <div className="text-sm text-gray-500">
          {discardPile.length} tiles discarded
        </div>
      </div>
      
      <div className="flex flex-wrap gap-1 sm:gap-2 p-3 bg-gray-50 rounded-lg min-h-16">
        {recentDiscards.length > 0 ? recentDiscards.map((discard, index) => (
          <div key={`${discard.tile.id}-${index}`} className="relative">
            <AnimatedTile
              tile={{
                ...discard.tile,
                instanceId: `discard-${discard.tile.id}-${index}`,
                isSelected: false
              }}
              size="sm"
              className="pointer-events-none opacity-80"
              context="gameplay"
            />
            {index === recentDiscards.length - 1 && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            )}
          </div>
        )) : (
          <div className="text-gray-400 text-sm flex items-center justify-center w-full py-4">
            No tiles discarded yet
          </div>
        )}
      </div>

      {discardPile.length > 8 && (
        <div className="text-xs text-gray-500 mt-2 text-center">
          Showing most recent 8 of {discardPile.length} discards
        </div>
      )}

      {/* Opponent Exposed Tiles Section */}
      {playerNames.length > 0 && (
        <>
          <div className="border-t border-gray-200 my-4"></div>
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Opponent Exposed Tiles</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {playerNames.slice(1).map((name, index) => {
                const playerId = `player-${index + 2}`
                const exposedCount = playerExposedCount[playerId] || 0
                return (
                  <div key={playerId} className="p-2 bg-gray-50 rounded">
                    <div className="text-xs font-medium text-gray-600">{name}</div>
                    <div className="text-sm text-gray-500">
                      {exposedCount > 0 ? `${exposedCount} sets exposed` : 'No exposed tiles'}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </Card>
  )
}

export default DiscardPileZone