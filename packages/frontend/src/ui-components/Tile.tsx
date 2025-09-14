// Simplified Tile Component
// Interactive tile wrapper for PlayerTile objects with basic functionality

import type { ReactNode } from 'react'
import type { PlayerTile } from 'shared-types';
import type { Tile } from 'shared-types';
import { TileSprite } from './TileSprite'

interface TileProps {
  tile: PlayerTile
  size?: 'sm' | 'md' | 'lg' | 'xl'
  interactive?: boolean
  onClick?: (tile: PlayerTile) => void
  onDoubleClick?: (tile: PlayerTile) => void
  className?: string
  children?: ReactNode
}

export const Tile = ({
  tile,
  size = 'md',
  interactive = true,
  onClick,
  onDoubleClick,
  className = '',
  children
}: TileProps) => {
  // Map size props to TileSprite size system
  const spriteSizeMap = {
    sm: 'sm' as const,
    md: 'md' as const,
    lg: 'lg' as const,
    xl: 'xl' as const
  }
  
  const handleClick = () => {
    if (interactive && onClick) {
      onClick(tile)
    }
  }
  
  const handleDoubleClick = () => {
    if (interactive && onDoubleClick) {
      onDoubleClick(tile)
    }
  }
  
  return (
    <div className={`relative ${className}`}>
      <TileSprite
        tileId={tile.id}
        size={spriteSizeMap[size]}
        selected={tile.isSelected}
        interactive={interactive}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
      />
      
      {/* Custom overlay content */}
      {children && (
        <div className="pointer-events-none">
          {children}
        </div>
      )}
    </div>
  )
}