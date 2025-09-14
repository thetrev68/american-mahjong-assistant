import React from 'react'
import { AnimatedTile } from '../../ui-components/tiles/AnimatedTile'

interface DiscardEntry {
  tile: TileType
  playerId: string
  timestamp: Date
}

interface DiscardPileProps {
  discards: DiscardEntry[]
  maxVisible?: number
  className?: string
}

const DiscardPile: React.FC<DiscardPileProps> = ({
  discards,
  maxVisible = 12,
  className = '',
}) => {
  const recentDiscards = discards
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, maxVisible)

  const getOpacityForAge = (timestamp: Date): number => {
    if (recentDiscards.length === 0) return 1

    const now = Date.now()
    const tileAge = now - timestamp.getTime()
    const maxAge = recentDiscards.length > 1 
      ? now - recentDiscards[recentDiscards.length - 1].timestamp.getTime()
      : 0

    if (maxAge === 0) return 1

    const opacity = 1 - (tileAge / maxAge) * 0.7
    return Math.max(0.3, Math.min(1, opacity))
  }

  const getPlayerColor = (playerId: string): string => {
    const colors = {
      east: 'border-red-400',
      south: 'border-blue-400', 
      west: 'border-green-400',
      north: 'border-yellow-400',
    }
    return colors[playerId as keyof typeof colors] || 'border-gray-400'
  }

  if (recentDiscards.length === 0) {
    return (
      <div className={`bg-white/10 backdrop-blur-sm rounded-xl p-4 ${className}`}>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Discard Pile</h3>
        <p className="text-sm text-gray-500 text-center">No discards yet</p>
      </div>
    )
  }

  return (
    <div className={`bg-white/10 backdrop-blur-sm rounded-xl p-4 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-800 mb-2">
        Recent Discards ({recentDiscards.length})
      </h3>
      
      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 justify-items-center">
        {recentDiscards.map((discard, index) => {
          const opacity = getOpacityForAge(discard.timestamp)
          const isRecent = index < 3
          
          return (
            <div
              key={`${discard.tile.id}-${discard.timestamp.getTime()}`}
              className={`relative ${getPlayerColor(discard.playerId)} border-2 rounded-lg ${
                isRecent ? 'ring-2 ring-purple-300 ring-opacity-50' : ''
              }`}
              style={{ opacity }}
            >
              <AnimatedTile
                tile={{ 
                  ...discard.tile, 
                  instanceId: `discard-${discard.timestamp.getTime()}`, 
                  isSelected: false 
                }}
                size="sm"
                interactive={false}
                context="gameplay"
                className="pointer-events-none"
              />
              
              <div className="absolute -bottom-1 -right-1 bg-gray-800 text-white text-xs px-1 rounded">
                {discard.playerId.charAt(0).toUpperCase()}
              </div>
              
              {isRecent && (
                <div className="absolute -top-1 -left-1 w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
              )}
            </div>
          )
        })}
      </div>
      
      <div className="mt-2 text-xs text-gray-500 text-center">
        Most recent tiles highlighted • Older tiles fade
      </div>
    </div>
  )
}

export default DiscardPile