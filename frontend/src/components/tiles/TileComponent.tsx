// frontend/src/components/tiles/TileComponent.tsx
// Individual tile rendering with sprite sheet - FIXED sizing

import React from 'react';
import type { Tile } from '../../types';
import tilesSprite from '../../assets/images/tiles.png';

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
  // FIXED: Proper size configurations for 52x69 tile sprites
  const sizeClasses = {
    small: 'w-8 h-11',      // ~32x44px (scaled down from 52x69)
    medium: 'w-10 h-14',    // ~40x56px (scaled down from 52x69)
    large: 'w-13 h-17'      // 52x68px (close to actual sprite size)
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

  // Updated sprite mapping to match your tiles.json data
  const getSpritePosition = (tileId: string) => {
    // Map our tile IDs to sprite coordinates from tiles.json
    const spritePositions: { [key: string]: { x: number; y: number } } = {
      '1B': { x: 0, y: 0 }, '1C': { x: 52, y: 0 }, '1D': { x: 104, y: 0 },
      '2B': { x: 156, y: 0 }, '2C': { x: 208, y: 0 }, '2D': { x: 260, y: 0 },
      '3B': { x: 312, y: 0 }, '3C': { x: 364, y: 0 }, '3D': { x: 416, y: 0 },
      '4B': { x: 468, y: 0 }, '4C': { x: 520, y: 0 }, '4D': { x: 572, y: 0 },
      '5B': { x: 624, y: 0 }, '5C': { x: 676, y: 0 }, '5D': { x: 728, y: 0 },
      '6B': { x: 780, y: 0 }, '6C': { x: 832, y: 0 }, '6D': { x: 884, y: 0 },
      '7B': { x: 936, y: 0 }, '7C': { x: 988, y: 0 }, '7D': { x: 1040, y: 0 },
      '8B': { x: 1092, y: 0 }, '8C': { x: 1144, y: 0 }, '8D': { x: 1196, y: 0 },
      '9B': { x: 1248, y: 0 }, '9C': { x: 1300, y: 0 }, '9D': { x: 1352, y: 0 },
      'green': { x: 1404, y: 0 }, 'white': { x: 1456, y: 0 }, 'red': { x: 1508, y: 0 },
      'east': { x: 1560, y: 0 }, 'f1': { x: 1612, y: 0 }, 'f2': { x: 1664, y: 0 },
      'f3': { x: 1716, y: 0 }, 'f4': { x: 1768, y: 0 }, 'joker': { x: 1820, y: 0 },
      'north': { x: 1872, y: 0 }, 'south': { x: 1924, y: 0 }, 'west': { x: 1976, y: 0 }
    };

    return spritePositions[tileId] || { x: 0, y: 0 };
  };

  const spritePos = getSpritePosition(tile.id);

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
        {/* FIXED: Proper sprite sizing and scaling for 52x69 tiles */}
        <div 
          className="w-full h-full bg-no-repeat bg-center"
          style={{
            backgroundImage: `url('${tilesSprite}')`,
            backgroundPosition: `-${spritePos.x}px -${spritePos.y}px`,
            backgroundSize: '2028px 69px', // Full sprite sheet dimensions (39 tiles × 52px width = 2028px)
            imageRendering: 'crisp-edges' // Ensure crisp tile edges at different sizes
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