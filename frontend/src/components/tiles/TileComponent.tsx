// frontend/src/components/tiles/TileComponent.tsx
// Individual tile rendering with sprite sheet - Using actual tiles.json data

import React from 'react';
import type { Tile } from '../../types';
import tilesData from '../../assets/images/tiles.json';

interface TileComponentProps {
  tile: Tile;
  isSelected?: boolean;
  isDisabled?: boolean;
  showCount?: boolean;
  count?: number;
  size?: 'small' | 'medium' | 'large';
  onClick?: (tile: Tile) => void;
  onDoubleClick?: (tile: Tile) => void;
}

const TileComponent: React.FC<TileComponentProps> = ({
  tile,
  isSelected = false,
  isDisabled = false,
  showCount = false,
  count = 0,
  size = 'medium',
  onClick,
  onDoubleClick
}) => {
  // Use the actual sprite dimensions from tiles.json (52x69px)
  const SPRITE_WIDTH = 52;
  const SPRITE_HEIGHT = 69;
  
  // Size configurations based on actual sprite dimensions
  const sizeClasses = {
    small: 'w-8 h-11',      // ~32x44px (0.6x scale)
    medium: 'w-10 h-14',    // ~40x56px (0.8x scale)  
    large: 'w-13 h-17'      // 52x68px (1.0x scale - matches sprite)
  };

  const handleClick = () => {
    if (!isDisabled && onClick) {
      console.log('TileComponent: Tile clicked', tile);
      onClick(tile);
    }
  };

  const handleDoubleClick = () => {
    if (!isDisabled && onDoubleClick) {
      onDoubleClick(tile);
    }
  };

  // Map our tile IDs to the sprite filenames in tiles.json
  const getTileFilename = (tileId: string): string => {
    // Map our internal tile IDs to the sprite filenames
    const filenameMap: { [key: string]: string } = {
      // Dots
      '1D': '1D.png', '2D': '2D.png', '3D': '3D.png', '4D': '4D.png', '5D': '5D.png',
      '6D': '6D.png', '7D': '7D.png', '8D': '8D.png', '9D': '9D.png',
      // Bams  
      '1B': '1B.png', '2B': '2B.png', '3B': '3B.png', '4B': '4B.png', '5B': '5B.png',
      '6B': '6B.png', '7B': '7B.png', '8B': '8B.png', '9B': '9B.png',
      // Cracks
      '1C': '1C.png', '2C': '2C.png', '3C': '3C.png', '4C': '4C.png', '5C': '5C.png',
      '6C': '6C.png', '7C': '7C.png', '8C': '8C.png', '9C': '9C.png',
      // Dragons
      'red': 'DD.png',     // Red Dragon
      'green': 'DB.png',   // Green Dragon (Bai)
      'white': 'DC.png',   // White Dragon (Chung)
      // Winds
      'east': 'E.png',
      'south': 'S.png', 
      'west': 'W.png',
      'north': 'N.png',
      // Flowers
      'f1': 'F1.png',
      'f2': 'F2.png', 
      'f3': 'F3.png',
      'f4': 'F4.png',
      // Joker
      'joker': 'J.png'
    };

    return filenameMap[tileId] || '1D.png'; // Default fallback
  };

  // Get sprite position from tiles.json using the actual data you paid for
  const getSpritePosition = (tileId: string) => {
    const filename = getTileFilename(tileId);
    const frameData = tilesData.frames.find(frame => frame.filename === filename);
    
    if (frameData) {
      return {
        x: frameData.frame.x,
        y: frameData.frame.y,
        width: frameData.frame.w,
        height: frameData.frame.h
      };
    }
    
    // Fallback if not found
    console.warn(`Sprite not found for tile: ${tileId} (${filename})`);
    return { x: 0, y: 0, width: SPRITE_WIDTH, height: SPRITE_HEIGHT };
  };

  const spritePos = getSpritePosition(tile.id);
  
  // Use the actual sprite sheet dimensions from tiles.json meta
  const sheetWidth = tilesData.meta.size.w; // 2028px
  const sheetHeight = tilesData.meta.size.h; // 69px

  return (
    <div className="relative">
      {/* Main tile button */}
      <button
        className={`
          ${sizeClasses[size]}
          relative
          rounded-md
          border-2
          transition-all
          duration-150
          touch-manipulation
          overflow-hidden
          ${isSelected 
            ? 'border-blue-500 bg-blue-100 shadow-lg scale-105' 
            : 'border-gray-300 bg-white shadow-sm hover:shadow-md'
          }
          ${isDisabled 
            ? 'opacity-50 cursor-not-allowed' 
            : 'cursor-pointer hover:border-gray-400 active:scale-95'
          }
          ${!isDisabled ? 'min-h-[44px] min-w-[44px]' : ''} // Mobile touch target
        `}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        disabled={isDisabled}
        aria-label={`${tile.suit} ${tile.value} tile${isSelected ? ' (selected)' : ''}`}
      >
        {/* Using actual sprite data from tiles.json */}
        <div 
          className="w-full h-full bg-no-repeat bg-center"
          style={{
            backgroundImage: `url('/tiles.png')`,
            backgroundPosition: `-${spritePos.x}px -${spritePos.y}px`,
            backgroundSize: `${sheetWidth}px ${sheetHeight}px`, // Use exact dimensions from JSON
            imageRendering: 'crisp-edges'
          }}
        />
        
        {/* Fallback text if sprite fails to load */}
        <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-700 pointer-events-none opacity-0 hover:opacity-100 transition-opacity">
          <span className="bg-white/80 px-1 rounded">
            {tile.id}
          </span>
        </div>
        
        {/* Joker indicator overlay */}
        {tile.isJoker && tile.jokerFor && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full border border-yellow-600 flex items-center justify-center">
            <span className="text-xs text-yellow-800 font-bold">J</span>
          </div>
        )}
      </button>

      {/* Count indicator */}
      {showCount && count > 0 && (
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
          <span className="text-xs text-white font-bold">{count}</span>
        </div>
      )}

      {/* Selection indicator for accessibility */}
      {isSelected && (
        <div className="absolute inset-0 rounded-md ring-2 ring-blue-500 ring-offset-1 pointer-events-none" />
      )}
    </div>
  );
};

export default TileComponent;