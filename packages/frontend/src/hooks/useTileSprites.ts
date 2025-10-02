// Tile Sprites Hook - Loads and manages the authentic mahjong tile sprites
// Uses the TexturePacker sprite sheet with 52x69 native tile resolution

import { useState, useEffect, useMemo } from 'react'
import tilesData from '../assets/tiles.json'

interface TileFrame {
  filename: string
  description: string // Added description field
  unicodeSymbol: string
  frame: { x: number; y: number; w: number; h: number }
  rotated: boolean
  trimmed: boolean
  spriteSourceSize: { x: number; y: number; w: number; h: number }
  sourceSize: { w: number; h: number }
}

interface TileSprite {
  id: string
  description: string // Added description field
  unicodeSymbol: string
  x: number
  y: number
  width: number
  height: number
}

interface TileSpriteMap {
  [tileId: string]: TileSprite
}

// Global singleton state for sprite loading - prevents race conditions
let globalIsLoaded = false
let globalError: string | null = null
const loadListeners: Set<(loaded: boolean) => void> = new Set()

// Preload sprites immediately when module loads (before any component mounts)
const preloadImage = new Image()
preloadImage.onload = () => {
  console.log('✅ Tile sprites loaded successfully (global singleton)!')
  globalIsLoaded = true
  globalError = null
  // Notify all waiting listeners
  loadListeners.forEach(listener => listener(true))
  loadListeners.clear()
}
preloadImage.onerror = (e) => {
  console.error('❌ Failed to load tile sprites from /tiles.png (global):', e)
  globalError = 'Failed to load tile sprites'
  globalIsLoaded = false
  loadListeners.forEach(listener => listener(false))
  loadListeners.clear()
}
console.log('🎴 Starting global sprite preload from /tiles.png')
preloadImage.src = '/tiles.png'

export const useTileSprites = () => {
  const [isLoaded, setIsLoaded] = useState(globalIsLoaded)
  const [error, setError] = useState<string | null>(globalError)

  // Parse the sprite data once
  const spriteMap: TileSpriteMap = useMemo(() => {
    const map: TileSpriteMap = {}

    tilesData.frames.forEach((frame: TileFrame) => {
      // Convert filename to tile ID (remove .png extension)
      const tileId = frame.filename.replace('.png', '')

      map[tileId] = {
        id: tileId,
        description: frame.description, // Store the description
        unicodeSymbol: frame.unicodeSymbol,
        x: frame.frame.x,
        y: frame.frame.y,
        width: frame.frame.w,
        height: frame.frame.h
      }
    })

    return map
  }, [])

  // Subscribe to global sprite loading state
  useEffect(() => {
    if (globalIsLoaded) {
      setIsLoaded(true)
      setError(null)
      return
    }

    if (globalError) {
      setError(globalError)
      setIsLoaded(false)
      return
    }

    // Still loading - subscribe to completion
    const listener = (loaded: boolean) => {
      setIsLoaded(loaded)
      setError(loaded ? null : globalError)
    }

    loadListeners.add(listener)
    return () => {
      loadListeners.delete(listener)
    }
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

  // Get the description for a specific tile
  const getTileDescription = (tileId: string): string | null => {
    const sprite = getTileSprite(tileId)
    return sprite ? sprite.description : null
  }

  // Get the unicode Symbol for a specific tile
  const getUnicodeSymbol = (tileId: string): string | null => {
    const sprite = getTileSprite(tileId)
    return sprite ? sprite.unicodeSymbol : null
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
    getTileDescription, // Added new function to return description
    getUnicodeSymbol, // Added new function to return unicode symbol
    
    // Constants
    NATIVE_TILE_WIDTH: 52,
    NATIVE_TILE_HEIGHT: 69,
    SPRITE_SHEET_URL: '/tiles.png'
  }
}