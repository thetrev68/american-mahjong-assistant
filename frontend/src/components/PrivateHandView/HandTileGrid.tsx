// frontend/src/components/PrivateHandView/HandTileGrid.tsx
// Redesigned grid for displaying player's tiles with modal-based selection - FIXED

import React, { useState } from 'react';
import type { Tile } from '../../types';
import TileComponent from '../tiles/TileComponent';
import EmptyTileSlot from '../tiles/EmptyTileSlot';
import TilePickerModal from '../tiles/TilePickerModal';

interface HandTileGridProps {
  tiles: Tile[];
  onTilesChange: (tiles: Tile[]) => void;
  recommendations?: {
    keep: Tile[];
    discard: Tile[];
    charleston: Tile[];
  };
  readOnly?: boolean;
  maxTiles?: number;
}

export const HandTileGrid: React.FC<HandTileGridProps> = ({
  tiles,
  onTilesChange,
  recommendations,
  readOnly = false,
  maxTiles = 14
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number>(-1);

  // Create array of tiles with empty slots (up to maxTiles)
  const handSlots: (Tile | null)[] = Array(maxTiles).fill(null);
  tiles.forEach((tile, index) => {
    if (index < maxTiles) {
      handSlots[index] = tile;
    }
  });

  // Get tile recommendation status
  const getTileRecommendation = (tile: Tile): 'keep' | 'discard' | 'charleston' | null => {
    if (!recommendations) return null;
    
    if (recommendations.keep.some(t => t.id === tile.id)) return 'keep';
    if (recommendations.discard.some(t => t.id === tile.id)) return 'discard';
    if (recommendations.charleston.some(t => t.id === tile.id)) return 'charleston';
    
    return null;
  };

  // Handle slot click (empty or filled)
  const handleSlotClick = (slotIndex: number) => {
    if (readOnly) return;
    
    console.log('HandTileGrid: Slot clicked', slotIndex);
    setSelectedSlotIndex(slotIndex);
    setModalOpen(true);
  };

  // FIXED: Handle tile selection from modal - CORRECTED accumulation logic
  const handleTileSelect = (selectedTile: Tile) => {
    console.log('HandTileGrid: Tile selected from modal', { selectedSlotIndex, selectedTile, currentTiles: tiles });
    
    const newTiles = [...tiles];
    
    if (selectedSlotIndex < tiles.length) {
      // Replace existing tile at this slot
      newTiles[selectedSlotIndex] = selectedTile;
      console.log('HandTileGrid: Replacing tile at slot', selectedSlotIndex);
    } else {
      // Add new tile - find the correct insertion point
      while (newTiles.length < selectedSlotIndex) {
        // This shouldn't happen, but just in case
        console.warn('Gap in tiles array, this shouldn\'t happen');
      }
      newTiles.push(selectedTile);
      console.log('HandTileGrid: Adding new tile at position', newTiles.length - 1);
    }
    
    console.log('HandTileGrid: Updating tiles', { oldLength: tiles.length, newLength: newTiles.length, newTiles });
    onTilesChange(newTiles);
    setModalOpen(false);
    setSelectedSlotIndex(-1);
  };

  // FIXED: Handle tile removal from modal
  const handleTileRemove = () => {
    if (selectedSlotIndex >= tiles.length) return;
    
    const newTiles = tiles.filter((_, index) => index !== selectedSlotIndex);
    console.log('HandTileGrid: Removing tile', { selectedSlotIndex, newTiles });
    onTilesChange(newTiles);
    setModalOpen(false);
    setSelectedSlotIndex(-1);
  };

  // Handle modal close
  const handleModalClose = () => {
    setModalOpen(false);
    setSelectedSlotIndex(-1);
  };

  // Get current tile for modal
  const getCurrentTile = (): Tile | null => {
    if (selectedSlotIndex >= 0 && selectedSlotIndex < tiles.length) {
      return tiles[selectedSlotIndex];
    }
    return null;
  };

  // FIXED: Clear all tiles handler
  const handleClearAll = () => {
    if (readOnly || tiles.length === 0) return;
    
    if (window.confirm('Are you sure you want to clear all tiles?')) {
      console.log('HandTileGrid: Clearing all tiles');
      onTilesChange([]);
    }
  };

  return (
    <div className="space-y-4">
      {/* Progress indicator */}
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-gray-700">
          Your Hand: {tiles.length}/{maxTiles === 14 ? '13' : maxTiles} tiles
        </div>
        
        {/* Progress bar */}
        <div className="flex-1 mx-4 max-w-32">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                tiles.length >= 13 ? 'bg-green-500' : 'bg-blue-500'
              }`}
              style={{ width: `${Math.min((tiles.length / 13) * 100, 100)}%` }}
            />
          </div>
        </div>
        
        {/* Status indicator */}
        <div className={`text-sm font-medium ${
          tiles.length === 13 ? 'text-green-600' : 
          tiles.length > 13 ? 'text-red-600' : 
          'text-gray-600'
        }`}>
          {tiles.length === 13 ? '✓ Ready' : 
           tiles.length > 13 ? '⚠️ Too many' : 
           '⏳ In progress'}
        </div>
      </div>

      {/* Tile grid - FIXED: 3 rows (5-5-4) with larger tiles */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="grid grid-cols-5 gap-3">
          {handSlots.map((tile, slotIndex) => {
            if (tile) {
              const recommendation = getTileRecommendation(tile);
              
              return (
                <div key={`slot-${slotIndex}`} className="relative">
                  <TileComponent
                    tile={tile}
                    size="large"
                    onClick={() => handleSlotClick(slotIndex)}
                    isDisabled={readOnly}
                  />
                  
                  {/* Recommendation border */}
                  {recommendation && (
                    <div className={`absolute inset-0 rounded-md ring-2 pointer-events-none ${
                      recommendation === 'keep' ? 'ring-green-500' : 
                      recommendation === 'discard' ? 'ring-red-500' : 
                      'ring-yellow-500'
                    }`} />
                  )}
                  
                  {/* Slot number for easy reference */}
                  <div className="absolute -top-1 -left-1 w-4 h-4 bg-gray-600 rounded-full flex items-center justify-center">
                    <span className="text-xs text-white font-bold">{slotIndex + 1}</span>
                  </div>
                </div>
              );
            } else {
              return (
                <EmptyTileSlot
                  key={`empty-${slotIndex}`}
                  slotIndex={slotIndex}
                  onClick={handleSlotClick}
                  size="large"
                />
              );
            }
          })}
        </div>
        
        {/* Instructions */}
        {!readOnly && (
          <div className="mt-4 text-center text-sm text-gray-600">
            {tiles.length === 0 ? (
              <p>👆 Tap any slot to add your first tile</p>
            ) : tiles.length < 13 ? (
              <p>Tap empty slots to add tiles • Tap existing tiles to change or remove</p>
            ) : (
              <p>Tap any tile to change or remove it</p>
            )}
          </div>
        )}
      </div>

      {/* Recommendation legend */}
      {recommendations && tiles.length >= 13 && (
        <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
          <div className="text-sm font-medium text-blue-800 mb-2">Strategy Recommendations:</div>
          <div className="flex flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 border-2 border-green-500 rounded"></div>
              <span className="text-green-700">Keep ({recommendations.keep.length})</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 border-2 border-red-500 rounded"></div>
              <span className="text-red-700">Consider discarding ({recommendations.discard.length})</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 border-2 border-yellow-500 rounded"></div>
              <span className="text-yellow-700">Good for Charleston ({recommendations.charleston.length})</span>
            </div>
          </div>
        </div>
      )}

      {/* FIXED: Clear all button - now properly displayed */}
      {tiles.length > 0 && !readOnly && (
        <div className="flex justify-center pt-4 border-t border-gray-200">
          <button
            onClick={handleClearAll}
            className="px-6 py-3 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors font-medium border border-red-200 hover:border-red-300"
          >
            🗑️ Clear All Tiles
          </button>
        </div>
      )}

      {/* Tile picker modal */}
      <TilePickerModal
        isOpen={modalOpen}
        currentTile={getCurrentTile()}
        currentHand={tiles}
        onTileSelect={handleTileSelect}
        onRemoveTile={handleTileRemove}
        onClose={handleModalClose}
        slotIndex={selectedSlotIndex}
      />
    </div>
  );
};