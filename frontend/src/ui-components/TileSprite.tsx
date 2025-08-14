// Authentic Tile Sprite Component
// Uses real mahjong tile sprites (52x69) with proper scaling and animations

import { forwardRef, useState } from 'react'
import { useTileSprites } from '../hooks/useTileSprites'
import type { TileAnimation, TileRecommendation } from '../types/tile-types'

interface TileSpriteProps {
  tileId: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'native'
  scale?: number // Custom scale override
  selected?: boolean
  disabled?: boolean
  interactive?: boolean
  showRecommendation?: boolean
  recommendation?: TileRecommendation
  animation?: TileAnimation
  className?: string
  style?: React.CSSProperties
  
  // Event handlers
  onClick?: (tileId: string) => void
  onDoubleClick?: (tileId: string) => void
  onLongPress?: (tileId: string) => void
  onMouseEnter?: (tileId: string) => void
  onMouseLeave?: (tileId: string) => void
}

export const TileSprite = forwardRef<HTMLDivElement, TileSpriteProps>(({
  tileId,
  size = 'md',
  scale,
  selected = false,
  disabled = false,
  interactive = true,
  showRecommendation = false,
  recommendation,
  animation,
  className = '',
  style = {},
  onClick,
  onDoubleClick,
  onLongPress,
  onMouseEnter,
  onMouseLeave
}, ref) => {
  const { 
    isLoaded, 
    error, 
    getTileStyle, 
    getSizeOptions, 
    hasTileSprite 
  } = useTileSprites()
  
  const [isPressed, setIsPressed] = useState(false)
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null)
  
  // Get size configuration
  const sizeOptions = getSizeOptions()
  const sizeConfig = sizeOptions[size]
  const finalScale = scale || sizeConfig.scale
  
  // Handle long press detection
  const handleMouseDown = () => {
    if (!interactive || disabled) return
    
    setIsPressed(true)
    
    if (onLongPress) {
      const timer = setTimeout(() => {
        onLongPress(tileId)
        setIsPressed(false)
      }, 500) // 500ms for long press
      
      setLongPressTimer(timer)
    }
  }
  
  const handleMouseUp = () => {
    setIsPressed(false)
    
    if (longPressTimer) {
      clearTimeout(longPressTimer)
      setLongPressTimer(null)
    }
  }
  
  const handleClick = () => {
    if (!interactive || disabled) return
    onClick?.(tileId)
  }
  
  const handleDoubleClick = () => {
    if (!interactive || disabled) return
    onDoubleClick?.(tileId)
  }
  
  // Error states
  if (error) {
    return (
      <div 
        className={`
          flex items-center justify-center bg-red-100 border border-red-300
          ${className}
        `}
        style={{
          width: `${sizeConfig.width}px`,
          height: `${sizeConfig.height}px`,
          ...style
        }}
      >
        <span className="text-xs text-red-600">Error</span>
      </div>
    )
  }
  
  if (!isLoaded) {
    return (
      <div 
        className={`
          flex items-center justify-center bg-gray-100 border border-gray-300 animate-pulse
          ${className}
        `}
        style={{
          width: `${sizeConfig.width}px`,
          height: `${sizeConfig.height}px`,
          ...style
        }}
      >
        <span className="text-xs text-gray-500">...</span>
      </div>
    )
  }
  
  if (!hasTileSprite(tileId)) {
    return (
      <div 
        className={`
          flex items-center justify-center bg-yellow-100 border border-yellow-300
          ${className}
        `}
        style={{
          width: `${sizeConfig.width}px`,
          height: `${sizeConfig.height}px`,
          ...style
        }}
      >
        <span className="text-xs text-yellow-700">{tileId}</span>
      </div>
    )
  }
  
  // Get tile sprite style
  const tileStyle = getTileStyle(tileId, finalScale)
  
  // Build complete class name
  const tileClassNames = [
    'tile-sprite',
    'relative',
    'cursor-pointer',
    'transition-all duration-300',
    'shadow-lg',
    
    // Interactive states
    interactive && !disabled && 'hover:shadow-xl hover:scale-105',
    selected && 'ring-4 ring-primary ring-offset-2 shadow-[0_0_20px_rgba(99,102,241,0.4)]',
    disabled && 'opacity-50 cursor-not-allowed',
    isPressed && 'scale-95',
    
    // Animation classes
    animation?.type === 'select' && 'animate-select',
    animation?.type === 'keep' && 'animate-keep-float',
    animation?.type === 'pass' && 'animate-pass-wiggle',
    animation?.type === 'joker' && 'animate-pulse',
    animation?.type === 'dragon' && 'animate-bounce',
    
    // Recommendation styling with glow
    recommendation?.action === 'keep' && 'ring-3 ring-accent ring-offset-1 shadow-[0_0_15px_rgba(16,185,129,0.5)]',
    recommendation?.action === 'pass' && 'ring-3 ring-warning ring-offset-1 shadow-[0_0_15px_rgba(249,115,22,0.5)]',
    recommendation?.action === 'discard' && 'ring-3 ring-red-500 ring-offset-1 shadow-[0_0_15px_rgba(239,68,68,0.5)]',
    
    className
  ].filter(Boolean).join(' ')
  
  return (
    <div
      className="inline-block"
      style={{
        // Container needs to account for the scaled size
        width: `${sizeConfig.width}px`,
        height: `${sizeConfig.height}px`,
        ...style
      }}
    >
      <div
        ref={ref}
        className={tileClassNames}
        style={tileStyle}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp} // Cancel long press if mouse leaves
        onMouseEnter={() => onMouseEnter?.(tileId)}
        onTouchStart={handleMouseDown}
        onTouchEnd={handleMouseUp}
        role={interactive ? 'button' : 'img'}
        tabIndex={interactive && !disabled ? 0 : -1}
        aria-label={`Mahjong tile ${tileId}${selected ? ' (selected)' : ''}${disabled ? ' (disabled)' : ''}`}
        data-tile-id={tileId}
        data-selected={selected}
        data-disabled={disabled}
      >
        {/* Recommendation Badge */}
        {showRecommendation && recommendation && (
          <div className="absolute -top-2 -right-2 z-10">
            <div className={`
              w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center ring-1 ring-white shadow-lg
              ${recommendation.action === 'keep' ? 'bg-accent text-white' : ''}
              ${recommendation.action === 'pass' ? 'bg-warning text-white' : ''}
              ${recommendation.action === 'discard' ? 'bg-red-500 text-white' : ''}
            `}>
              {recommendation.action === 'keep' && '✓'}
              {recommendation.action === 'pass' && '→'}
              {recommendation.action === 'discard' && '✕'}
            </div>
          </div>
        )}
        
        {/* Selection Indicator */}
        {selected && (
          <div className="absolute inset-0 bg-primary/20 pointer-events-none" />
        )}
        
        {/* Disabled Overlay */}
        {disabled && (
          <div className="absolute inset-0 bg-gray-500/30 pointer-events-none" />
        )}
      </div>
    </div>
  )
})

TileSprite.displayName = 'TileSprite'