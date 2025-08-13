// Animated Tile Component
// Interactive tile with animations, selection states, and recommendations

import type { ReactNode } from 'react'
import type { PlayerTile, TileAnimation, TileRecommendation } from '../types/tile-types'
import { useAnimationsEnabled } from '../stores'

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
  
  const sizeClasses = {
    sm: 'w-8 h-12 text-xs',
    md: 'w-12 h-16 text-sm',
    lg: 'w-16 h-20 text-base',
    xl: 'w-20 h-24 text-lg'
  }
  
  const getSuitColor = (suit: string): string => {
    switch (suit) {
      case 'dots': return 'text-red-600'
      case 'bams': return 'text-green-600'
      case 'cracks': return 'text-blue-600'
      case 'winds': return 'text-gray-700'
      case 'dragons': return 'text-purple-600'
      case 'flowers': return 'text-pink-600'
      case 'jokers': return 'text-yellow-600'
      default: return 'text-gray-600'
    }
  }
  
  const getRecommendationStyle = (recommendation?: TileRecommendation): string => {
    if (!recommendation) return ''
    
    switch (recommendation.action) {
      case 'keep':
        return 'ring-4 ring-accent/30 bg-accent/5 border-accent/50'
      case 'pass':
        return 'ring-4 ring-orange-400/30 bg-orange-50 border-orange-300'
      case 'discard':
        return 'ring-4 ring-red-400/30 bg-red-50 border-red-300'
      default:
        return ''
    }
  }
  
  const getAnimationClass = (animation?: TileAnimation): string => {
    if (!animation || !animationsEnabled) return ''
    
    switch (animation.type) {
      case 'keep':
        return 'animate-keep-float'
      case 'pass':
        return 'animate-pass-wiggle'
      case 'select':
        return 'animate-select scale-110'
      case 'deselect':
        return 'animate-bounce-out scale-95'
      case 'joker':
        return 'animate-pulse ring-4 ring-yellow-400/50'
      case 'dragon':
        return 'animate-pulse ring-4 ring-purple-400/50'
      default:
        return ''
    }
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
  
  // Long press handling for mobile
  let pressTimer: ReturnType<typeof setTimeout>
  
  const handleTouchStart = () => {
    if (interactive && onLongPress) {
      pressTimer = setTimeout(() => {
        onLongPress(tile)
      }, 500)
    }
  }
  
  const handleTouchEnd = () => {
    if (pressTimer) {
      clearTimeout(pressTimer)
    }
  }
  
  return (
    <div
      className={`
        tile-component
        ${sizeClasses[size]}
        ${tile.isSelected ? 'selected ring-4 ring-primary/50 scale-105' : ''}
        ${interactive ? 'cursor-pointer hover:scale-105 hover:shadow-lg' : 'cursor-default'}
        ${showRecommendation ? getRecommendationStyle(tile.recommendation) : ''}
        ${getAnimationClass(tile.animation)}
        bg-white border-2 border-gray-300 rounded-lg
        flex flex-col items-center justify-center
        font-semibold shadow-md
        transition-all duration-300 ease-out
        relative overflow-hidden
        ${className}
      `}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      role={interactive ? 'button' : 'presentation'}
      tabIndex={interactive ? 0 : -1}
      aria-label={`${tile.displayName}${tile.isSelected ? ' (selected)' : ''}`}
    >
      {/* Tile Content */}
      <div className={`${getSuitColor(tile.suit)} text-center leading-tight`}>
        {/* Unicode Symbol or Custom Display */}
        {tile.unicodeSymbol ? (
          <div className="text-lg leading-none mb-1">
            {tile.unicodeSymbol}
          </div>
        ) : (
          <div className="font-bold text-lg leading-none mb-1">
            {tile.value.toUpperCase()}
          </div>
        )}
        
        {/* Tile ID for reference */}
        <div className="text-xs opacity-75 font-mono">
          {tile.id}
        </div>
      </div>
      
      {/* Selection Indicator */}
      {tile.isSelected && (
        <div className="absolute top-1 right-1 w-3 h-3 bg-primary rounded-full flex items-center justify-center">
          <span className="text-white text-xs font-bold">✓</span>
        </div>
      )}
      
      {/* Recommendation Indicator */}
      {showRecommendation && tile.recommendation && (
        <div className="absolute bottom-1 left-1 text-xs font-bold">
          {tile.recommendation.action === 'keep' && '👍'}
          {tile.recommendation.action === 'pass' && '➡️'}
          {tile.recommendation.action === 'discard' && '🗑️'}
        </div>
      )}
      
      {/* Special Indicators */}
      {tile.suit === 'jokers' && (
        <div className="absolute top-1 left-1 text-xs">🃏</div>
      )}
      
      {tile.suit === 'dragons' && (
        <div className="absolute top-1 left-1 text-xs">🐉</div>
      )}
      
      {/* Custom Children */}
      {children}
      
      {/* Animation Overlay */}
      {tile.animation && animationsEnabled && (
        <div className="absolute inset-0 pointer-events-none">
          {tile.animation.type === 'keep' && (
            <div className="absolute inset-0 bg-accent/10 rounded-lg animate-pulse" />
          )}
          {tile.animation.type === 'pass' && (
            <div className="absolute inset-0 bg-orange-300/10 rounded-lg animate-pulse" />
          )}
        </div>
      )}
    </div>
  )
}