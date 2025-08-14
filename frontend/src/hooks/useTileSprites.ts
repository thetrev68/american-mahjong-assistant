// Tile Sprites Hook - Loads and manages the authentic mahjong tile sprites
// Uses the TexturePacker sprite sheet with 52x69 native tile resolution

import { useState, useEffect, useMemo } from 'react'
import tilesData from '../assets/tiles.json'

interface TileFrame {
  filename: string
  frame: { x: number; y: number; w: number; h: number }
  rotated: boolean
  trimmed: boolean
  spriteSourceSize: { x: number; y: number; w: number; h: number }
  sourceSize: { w: number; h: number }
}

interface TileSprite {
  id: string
  x: number
  y: number
  width: number
  height: number
}

interface TileSpriteMap {
  [tileId: string]: TileSprite
}

export const useTileSprites = () => {
  const [isLoaded, setIsLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Parse the sprite data once
  const spriteMap: TileSpriteMap = useMemo(() => {
    const map: TileSpriteMap = {}
    
    tilesData.frames.forEach((frame: TileFrame) => {
      // Convert filename to tile ID (remove .png extension)
      const tileId = frame.filename.replace('.png', '')
      
      map[tileId] = {
        id: tileId,
        x: frame.frame.x,
        y: frame.frame.y,
        width: frame.frame.w,
        height: frame.frame.h
      }
    })
    
    return map
  }, [])
  
  // Preload the sprite image
  useEffect(() => {
    const img = new Image()
    
    img.onload = () => {
      setIsLoaded(true)
      setError(null)
    }
    
    img.onerror = () => {
      setError('Failed to load tile sprites')
      setIsLoaded(false)
    }
    
    img.src = '/tiles.png'
  }, [])
  
  // Get sprite data for a specific tile
  const getTileSprite = (tileId: string): TileSprite | null => {
    return spriteMap[tileId] || null
  }
  
  // Get CSS background position for a tile
  const getTileBackgroundPosition = (tileId: string): string => {
    const sprite = getTileSprite(tileId)
    if (!sprite) return '0 0'
    
    return `-${sprite.x}px -${sprite.y}px`
  }
  
  // Get style object for displaying a tile sprite
  const getTileStyle = (
    tileId: string, 
    scale: number = 1,
    additionalStyles: React.CSSProperties = {}
  ): React.CSSProperties => {
    const sprite = getTileSprite(tileId)
    if (!sprite) return additionalStyles
    
    return {
      backgroundImage: 'url(/tiles.png)',
      backgroundPosition: getTileBackgroundPosition(tileId),
      backgroundRepeat: 'no-repeat',
      backgroundSize: `${tilesData.meta.size.w}px ${tilesData.meta.size.h}px`, // Keep original size
      width: `${sprite.width}px`, // Native width
      height: `${sprite.height}px`, // Native height
      transform: `scale(${scale})`, // Scale via transform instead
      transformOrigin: 'center',
      imageRendering: 'pixelated', // Keep crisp edges when scaling
      ...additionalStyles
    }
  }
  
  // Get responsive sizing options - use native 1.0x scale for crisp resolution
  const getSizeOptions = () => ({
    // All sizes use native 1.0x scale to maintain perfect crisp resolution
    native: { scale: 1.0, width: 52, height: 69 },
    xs: { scale: 1.0, width: 52, height: 69 },
    sm: { scale: 1.0, width: 52, height: 69 },
    md: { scale: 1.0, width: 52, height: 69 },
    lg: { scale: 1.0, width: 52, height: 69 },
    xl: { scale: 1.0, width: 52, height: 69 }
  })
  
  // Check if tile exists in sprite sheet
  const hasTileSprite = (tileId: string): boolean => {
    return tileId in spriteMap
  }
  
  // Get all available tile IDs
  const getAllTileIds = (): string[] => {
    return Object.keys(spriteMap)
  }
  
  // Get sprite metadata
  const getMetadata = () => ({
    totalTiles: Object.keys(spriteMap).length,
    sheetWidth: tilesData.meta.size.w,
    sheetHeight: tilesData.meta.size.h,
    tileWidth: 52,
    tileHeight: 69,
    format: tilesData.meta.format,
    isLoaded,
    error
  })
  
  return {
    // State
    isLoaded,
    error,
    
    // Core functions
    getTileSprite,
    getTileBackgroundPosition,
    getTileStyle,
    
    // Utility functions
    getSizeOptions,
    hasTileSprite,
    getAllTileIds,
    getMetadata,
    
    // Constants
    NATIVE_TILE_WIDTH: 52,
    NATIVE_TILE_HEIGHT: 69,
    SPRITE_SHEET_URL: '/tiles.png'
  }
}