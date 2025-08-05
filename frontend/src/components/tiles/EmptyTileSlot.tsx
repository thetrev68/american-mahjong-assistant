// frontend/src/components/tiles/EmptyTileSlot.tsx
// Component for empty tile slots in the hand grid - FIXED sizing

import React from 'react';

interface EmptyTileSlotProps {
  slotIndex: number;
  onClick: (slotIndex: number) => void;
  size?: 'small' | 'medium' | 'large';
  showIndex?: boolean;
}

const EmptyTileSlot: React.FC<EmptyTileSlotProps> = ({
  slotIndex,
  onClick,
  size = 'medium',
  showIndex = false
}) => {
  // FIXED: Size configurations to match TileComponent exactly
  const sizeClasses = {
    small: 'w-8 h-11',      // Match TileComponent small
    medium: 'w-10 h-14',    // Match TileComponent medium
    large: 'w-13 h-17'      // Match TileComponent large
  };

  const handleClick = () => {
    console.log('EmptyTileSlot: Clicked slot', slotIndex);
    onClick(slotIndex);
  };

  return (
    <button
      onClick={handleClick}
      className={`
        ${sizeClasses[size]}
        relative
        border-2 border-dashed border-gray-300
        rounded-md
        transition-all
        duration-150
        hover:border-blue-400
        hover:bg-blue-50
        active:scale-95
        cursor-pointer
        bg-gray-50
        flex
        items-center
        justify-center
        min-h-[44px] min-w-[44px]
        group
      `}
      aria-label={`Empty tile slot ${slotIndex + 1}, tap to add tile`}
    >
      {/* Plus icon */}
      <div className="text-gray-400 group-hover:text-blue-500 transition-colors">
        <svg 
          width="16" 
          height="16" 
          viewBox="0 0 16 16" 
          fill="currentColor"
          className="drop-shadow-sm"
        >
          <path d="M8 2a1 1 0 0 1 1 1v4h4a1 1 0 1 1 0 2H9v4a1 1 0 1 1-2 0V9H3a1 1 0 0 1 0-2h4V3a1 1 0 0 1 1-1z"/>
        </svg>
      </div>
      
      {/* Slot index (for debugging/development) */}
      {showIndex && (
        <div className="absolute -top-1 -left-1 w-4 h-4 bg-gray-400 rounded-full flex items-center justify-center">
          <span className="text-xs text-white font-bold">{slotIndex + 1}</span>
        </div>
      )}
      
      {/* Tooltip hint */}
      <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <div className="bg-gray-800 text-white text-xs py-1 px-2 rounded whitespace-nowrap">
          Tap to add tile
        </div>
      </div>
    </button>
  );
};

export default EmptyTileSlot;