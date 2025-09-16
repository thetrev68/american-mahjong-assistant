// Simplified Tile Sprite Component
// Clean tile rendering with sprites, selection, and basic interaction

import { forwardRef, memo } from 'react'
import { useTileSprites } from '../hooks/useTileSprites'

interface TileSpriteProps {
  tileId: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'native'
  scale?: number // Custom scale override
  selected?: boolean
  disabled?: boolean
  interactive?: boolean
  className?: string
  style?: React.CSSProperties
  
  // Event handlers
  onClick?: (tileId: string) => void
  onDoubleClick?: (tileId: string) => void
}

export const TileSprite = memo(forwardRef<HTMLDivElement, TileSpriteProps>(({
  tileId,
  size = 'md',
  scale,
  selected = false,
  disabled = false,
  interactive = true,
  className = '',
  style = {},
  onClick,
  onDoubleClick
}, ref) => {
  const { 
    isLoaded, 
    error, 
    getTileStyle, 
    getSizeOptions, 
    hasTileSprite 
  } = useTileSprites()
  
  // Get size configuration
  const sizeOptions = getSizeOptions()
  const sizeConfig = sizeOptions[size]
  const finalScale = scale || sizeConfig.scale
  
  const handleClick = () => {
    if (!interactive || disabled) return
    onClick?.(tileId)
  }
  
  const handleDoubleClick = () => {
    if (!interactive || disabled) return
    onDoubleClick?.(tileId)
  }
  
  // Error state
  if (error) {
    return (
      <div 
        className={`
          flex items-center justify-center bg-red-100 border border-red-300 rounded
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
  
  // Loading state
  if (!isLoaded) {
    return (
      <div 
        className={`
          flex items-center justify-center bg-gray-100 border border-gray-300 rounded animate-pulse
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
  
  // Missing sprite fallback
  if (!hasTileSprite(tileId)) {
    return (
      <div 
        className={`
          flex items-center justify-center bg-yellow-100 border border-yellow-300 rounded
          ${className}
        `}
        style={{
          width: `${sizeConfig.width}px`,
          height: `${sizeConfig.height}px`,
          ...style
        }}
      >
        <span className="text-xs text-yellow-700 font-mono">{tileId}</span>
      </div>
    )
  }
  
  // Get tile sprite style
  const tileStyle = getTileStyle(tileId, finalScale)
  
  // Build clean class name
  const tileClassNames = [
    'tile-sprite',
    'relative',
    'shadow-sm',
    'transition-all duration-200',
    
    // Interactive states
    interactive && !disabled && 'cursor-pointer hover:shadow-md',
    // Only apply built-in glow if no external className with ring/shadow styling is provided
    selected && !className.includes('ring') && !className.includes('shadow') && 'shadow-[0_0_0_2px_rgba(147,51,234,0.5),0_0_12px_rgba(147,51,234,0.3)]',
    disabled && 'opacity-50 cursor-not-allowed',
    
    className
  ].filter(Boolean).join(' ')
  
  return (
    <div
      className="inline-block"
      style={{
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
        role={interactive ? 'button' : 'img'}
        tabIndex={interactive && !disabled ? 0 : -1}
        aria-label={`Mahjong tile ${tileId}${selected ? ' (selected)' : ''}${disabled ? ' (disabled)' : ''}`}
        data-tile-id={tileId}
        data-selected={selected}
        data-disabled={disabled}
      >
        {/* Simple selected overlay */}
        {selected && (
          <div className="absolute inset-0 bg-primary/10 rounded pointer-events-none" />
        )}
        
        {/* Simple disabled overlay */}
        {disabled && (
          <div className="absolute inset-0 bg-gray-500/20 rounded pointer-events-none" />
        )}
      </div>
    </div>
  )
}))

TileSprite.displayName = 'TileSprite'