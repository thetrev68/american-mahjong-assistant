import React from 'react'
import { Card } from '../../ui-components/Card'
import { AnimatedTile } from '../../ui-components/tiles/AnimatedTile'
import type { Tile as TileType } from '../../types/tile-types'

interface DiscardPileZoneProps {
  discardPile: Array<{
    tile: TileType
    playerId: string
    timestamp: Date
  }>
}

const DiscardPileZone: React.FC<DiscardPileZoneProps> = ({ discardPile }) => {
  
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
    </Card>
  )
}

export default DiscardPileZone