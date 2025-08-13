// frontend/src/components/charleston/CharlestonPassingArea.tsx
// Component for the 3 tile slots where players place tiles to pass

import React from 'react';
import type { Tile } from '../../types';
import TileComponent from '../tiles/TileComponent';
import EmptyTileSlot from '../tiles/EmptyTileSlot';

interface CharlestonPassingAreaProps {
  selectedTiles: Tile[];
  onTileRemove: (tile: Tile, index: number) => void;
  phase: 'right' | 'across' | 'left' | 'optional';
}

const CharlestonPassingArea: React.FC<CharlestonPassingAreaProps> = ({
  selectedTiles,
  onTileRemove,
  phase
}) => {
  const phaseLabels = {
    right: 'Pass Right',
    across: 'Pass Across', 
    left: 'Pass Left',
    optional: 'Optional Pass'
  };

  const phaseDirections = {
    right: '→',
    across: '↕',
    left: '←', 
    optional: '?'
  };

  // Create array of 3 slots, filled with selected tiles or null
  const passingSlots: (Tile | null)[] = Array(3).fill(null);
  selectedTiles.forEach((tile, index) => {
    if (index < 3) {
      passingSlots[index] = tile;
    }
  });

  const handleSlotClick = (slotIndex: number) => {
    const tileInSlot = passingSlots[slotIndex];
    if (tileInSlot) {
      onTileRemove(tileInSlot, slotIndex);
    }
  };

  return (
    <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-300 rounded-lg p-4 mb-4">
      {/* Header */}
      <div className="text-center mb-3">
        <div className="flex items-center justify-center gap-2 mb-1">
          <span className="text-2xl">{phaseDirections[phase]}</span>
          <h3 className="text-lg font-semibold text-yellow-800">
            {phaseLabels[phase]}
          </h3>
          <span className="text-2xl">{phaseDirections[phase]}</span>
        </div>
        <p className="text-sm text-yellow-700">
          Select 3 tiles from your hand to pass
        </p>
      </div>

      {/* Passing slots */}
      <div className="flex justify-center gap-3 mb-3">
        {passingSlots.map((tile, slotIndex) => (
          <div key={`pass-slot-${slotIndex}`} className="relative">
            {tile ? (
              <div className="relative">
                <TileComponent
                  tile={tile}
                  size="large"
                  onClick={() => handleSlotClick(slotIndex)}
                  isSelected={true}
                />
                {/* Remove indicator */}
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-xs text-white font-bold">✕</span>
                </div>
              </div>
            ) : (
              <EmptyTileSlot
                slotIndex={slotIndex}
                onClick={() => {}} // Empty slots don't do anything when clicked
                size="large"
              />
            )}
          </div>
        ))}
      </div>

      {/* Selection counter */}
      <div className="text-center">
        <span className={`text-sm font-medium ${
          selectedTiles.length === 3 
            ? 'text-green-700' 
            : selectedTiles.length > 3 
              ? 'text-red-700' 
              : 'text-yellow-700'
        }`}>
          {selectedTiles.length} / 3 tiles selected
          {selectedTiles.length === 3 && ' ✓'}
          {selectedTiles.length > 3 && ' (too many!)'}
        </span>
      </div>

      {/* Instructions */}
      <div className="mt-2 text-center text-xs text-yellow-600">
        Tap tiles in your hand to add them • Tap tiles here to remove them
      </div>
    </div>
  );
};

export default CharlestonPassingArea;