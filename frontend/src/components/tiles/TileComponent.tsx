// frontend/src/components/tiles/TileComponent.tsx
import React from 'react';
import type { Tile } from '../../types';

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
  // Size configurations for responsive design
  const sizeClasses = {
    small: 'w-10 h-12',   // 40x48px
    medium: 'w-12 h-16',  // 48x64px  
    large: 'w-16 h-20'    // 64x80px
  };

  const handleClick = () => {
    if (!isDisabled && onClick) {
      onClick(tile);
    }
  };

  const handleDoubleClick = () => {
    if (!isDisabled && onDoubleClick) {
      onDoubleClick(tile);
    }
  };

  // Get sprite position for this tile from tiles.json coordinates
  const getSpritePosition = (tileId: string) => {
    // Map our tile IDs to sprite filenames
    const spriteMap: { [key: string]: string } = {
      '1D': '1D.png', '2D': '2D.png', '3D': '3D.png', '4D': '4D.png', '5D': '5D.png',
      '6D': '6D.png', '7D': '7D.png', '8D': '8D.png', '9D': '9D.png',
      '1B': '1B.png', '2B': '2B.png', '3B': '3B.png', '4B': '4B.png', '5B': '5B.png',
      '6B': '6B.png', '7B': '7B.png', '8B': '8B.png', '9B': '9B.png',
      '1C': '1C.png', '2C': '2C.png', '3C': '3C.png', '4C': '4C.png', '5C': '5C.png',
      '6C': '6C.png', '7C': '7C.png', '8C': '8C.png', '9C': '9C.png',
      'east': 'E.png', 'south': 'S.png', 'west': 'W.png', 'north': 'N.png',
      'red': 'DD.png', 'green': 'DB.png', 'white': 'DC.png',
      'f1': 'F1.png', 'f2': 'F2.png', 'f3': 'F3.png', 'f4': 'F4.png',
      'joker': 'J.png'
    };

    const filename = spriteMap[tileId];
    if (!filename) return { x: 0, y: 0 }; // Fallback

    // These coordinates come from your tiles.json
    const spritePositions: { [key: string]: { x: number; y: number } } = {
      '1B.png': { x: 0, y: 0 }, '1C.png': { x: 52, y: 0 }, '1D.png': { x: 104, y: 0 },
      '2B.png': { x: 156, y: 0 }, '2C.png': { x: 208, y: 0 }, '2D.png': { x: 260, y: 0 },
      '3B.png': { x: 312, y: 0 }, '3C.png': { x: 364, y: 0 }, '3D.png': { x: 416, y: 0 },
      '4B.png': { x: 468, y: 0 }, '4C.png': { x: 520, y: 0 }, '4D.png': { x: 572, y: 0 },
      '5B.png': { x: 624, y: 0 }, '5C.png': { x: 676, y: 0 }, '5D.png': { x: 728, y: 0 },
      '6B.png': { x: 780, y: 0 }, '6C.png': { x: 832, y: 0 }, '6D.png': { x: 884, y: 0 },
      '7B.png': { x: 936, y: 0 }, '7C.png': { x: 988, y: 0 }, '7D.png': { x: 1040, y: 0 },
      '8B.png': { x: 1092, y: 0 }, '8C.png': { x: 1144, y: 0 }, '8D.png': { x: 1196, y: 0 },
      '9B.png': { x: 1248, y: 0 }, '9C.png': { x: 1300, y: 0 }, '9D.png': { x: 1352, y: 0 },
      'DB.png': { x: 1404, y: 0 }, 'DC.png': { x: 1456, y: 0 }, 'DD.png': { x: 1508, y: 0 },
      'E.png': { x: 1560, y: 0 }, 'F1.png': { x: 1612, y: 0 }, 'F2.png': { x: 1664, y: 0 },
      'F3.png': { x: 1716, y: 0 }, 'F4.png': { x: 1768, y: 0 }, 'J.png': { x: 1820, y: 0 },
      'N.png': { x: 1872, y: 0 }, 'S.png': { x: 1924, y: 0 }, 'W.png': { x: 1976, y: 0 }
    };

    return spritePositions[filename] || { x: 0, y: 0 };
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
        {/* Tile sprite background */}
        <div 
          className="w-full h-full bg-no-repeat bg-contain bg-center"
          style={{
            backgroundImage: `url('/tiles.png')`,
            backgroundPosition: `-${spritePos.x}px -${spritePos.y}px`,
            backgroundSize: '2028px 69px' // Full sprite sheet dimensions
          }}
        />
        
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