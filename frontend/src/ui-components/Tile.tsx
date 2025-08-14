// Animated Tile Component
// Interactive tile with animations, selection states, and recommendations
// Now uses authentic mahjong tile sprites!

import type { ReactNode } from 'react'
import type { PlayerTile, TileAnimation, TileRecommendation } from '../types/tile-types'
import { useAnimationsEnabled } from '../stores'
import { TileSprite } from './TileSprite'

interface TileProps {
  tile: PlayerTile
  size?: 'sm' | 'md' | 'lg' | 'xl'
  interactive?: boolean
  showRecommendation?: boolean
  onClick?: (tile: PlayerTile) => void
  onDoubleClick?: (tile: PlayerTile) => void
  onLongPress?: (tile: PlayerTile) => void
  className?: string
  children?: ReactNode
}

export const Tile = ({
  tile,
  size = 'md',
  interactive = true,
  showRecommendation = false,
  onClick,
  onDoubleClick,
  onLongPress,
  className = '',
  children
}: TileProps) => {
  const animationsEnabled = useAnimationsEnabled()
  
  // Map size props to TileSprite size system
  const spriteSizeMap = {
    sm: 'sm' as const,
    md: 'md' as const,
    lg: 'lg' as const,
    xl: 'xl' as const
  }
  
  const handleClick = (tileId: string) => {
    if (interactive && onClick) {
      onClick(tile)
    }
  }
  
  const handleDoubleClick = (tileId: string) => {
    if (interactive && onDoubleClick) {
      onDoubleClick(tile)
    }
  }
  
  const handleLongPress = (tileId: string) => {
    if (interactive && onLongPress) {
      onLongPress(tile)
    }
  }
  
  return (
    <div className={`relative ${className}`}>
      <TileSprite
        tileId={tile.id}
        size={spriteSizeMap[size]}
        selected={tile.isSelected}
        interactive={interactive}
        showRecommendation={showRecommendation}
        recommendation={tile.recommendation}
        animation={animationsEnabled ? tile.animation : undefined}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onLongPress={handleLongPress}
        className="authentic-tile"
      />
      
      {/* Custom Children Overlay */}
      {children && (
        <div className="pointer-events-none">
          {children}
        </div>
      )}
    </div>
  )
}