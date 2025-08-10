// frontend/src/components/PrivateHandView/HandTileGrid.tsx
// Redesigned grid for displaying player's tiles with modal-based selection - FIXED: Array gap issue

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
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

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

  // FIXED: Handle tile selection from modal - prevent infinite loop
  const handleTileSelect = (selectedTile: Tile) => {
    console.log('HandTileGrid: Tile selected from modal', { selectedSlotIndex, selectedTile, currentTiles: tiles });
    
    const newTiles = [...tiles];
    
    if (selectedSlotIndex < tiles.length) {
      // Replace existing tile at this slot
      newTiles[selectedSlotIndex] = selectedTile;
      console.log('HandTileGrid: Replacing tile at slot', selectedSlotIndex);
    } else {
      // FIXED: Instead of creating gaps, just add to the end of the array
      // This prevents the infinite loop that was happening
      newTiles.push(selectedTile);
      console.log('HandTileGrid: Adding new tile to end of array (was slot', selectedSlotIndex, ')');
    }
    
    console.log('HandTileGrid: Updating tiles', { oldLength: tiles.length, newLength: newTiles.length, newTiles });
    onTilesChange(newTiles);
    setModalOpen(false);
    setSelectedSlotIndex(-1);
  };

  // Handle tile removal from modal
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

  // Clear all tiles handler
  const handleClearAll = () => {
    if (readOnly || tiles.length === 0) return;
    
    if (window.confirm('Are you sure you want to clear all tiles?')) {
      console.log('HandTileGrid: Clearing all tiles');
      onTilesChange([]);
    }
  };

  // NEW: Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (readOnly || !handSlots[index]) return;
    
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  // FIXED: Handle drop - prevent array gaps
  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newTiles = [...tiles];
    
    // Move the tile from draggedIndex to dropIndex
    if (draggedIndex < tiles.length) {
      const draggedTile = newTiles[draggedIndex];
      
      if (draggedTile) {
        // Remove from old position
        newTiles.splice(draggedIndex, 1);
        
        // FIXED: Ensure we don't try to insert beyond the array length
        // Insert at new position (adjust index if we removed from before the drop point)
        const adjustedDropIndex = draggedIndex < dropIndex ? dropIndex - 1 : dropIndex;
        const finalDropIndex = Math.min(adjustedDropIndex, newTiles.length);
        
        newTiles.splice(finalDropIndex, 0, draggedTile);
        
        console.log('HandTileGrid: Tile moved', { 
          from: draggedIndex, 
          to: finalDropIndex, 
          draggedTile: draggedTile.id 
        });
        
        onTilesChange(newTiles);
      }
    }

    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div className="space-y-4">
      {/* Header with tile count and clear button */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">
          Your Tiles ({tiles.length}/{maxTiles})
        </h3>
        
        {!readOnly && tiles.length > 0 && (
          <button
            onClick={handleClearAll}
            className="text-sm text-red-600 hover:text-red-700 underline"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Main tile grid - 5x3 layout (5/5/4) with centering */}
      <div className="grid grid-cols-5 gap-4 p-4 bg-gray-50 rounded-lg min-h-[200px] justify-items-center">
        {handSlots.map((tile, slotIndex) => {
          const recommendation = tile ? getTileRecommendation(tile) : null;
          const isDraggedOver = dragOverIndex === slotIndex;
          const isDragging = draggedIndex === slotIndex;

          if (tile) {
            return (
              <div
                key={`tile-${slotIndex}-${tile.id}`}
                className={`relative cursor-pointer transition-all ${
                  isDraggedOver ? 'scale-105' : ''
                } ${
                  isDragging ? 'opacity-50' : ''
                }`}
                draggable={!readOnly}
                onDragStart={(e) => handleDragStart(e, slotIndex)}
                onDragOver={(e) => handleDragOver(e, slotIndex)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, slotIndex)}
                onDragEnd={handleDragEnd}
              >
                <TileComponent
                  tile={tile}
                  size="large"
                  onClick={() => handleSlotClick(slotIndex)}
                  isDisabled={readOnly}
                />
                
                {/* Recommendation border - matches tile size exactly */}
                {recommendation && (
                  <div className={`absolute inset-0 rounded-md ring-2 pointer-events-none ${
                    recommendation === 'keep' ? 'ring-green-500' : 
                    recommendation === 'discard' ? 'ring-red-500' : 
                    'ring-yellow-500'
                  }`} />
                )}
                
                {/* Drag indicator */}
                {!readOnly && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-gray-400 rounded-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <span className="text-xs text-white">⋮⋮</span>
                  </div>
                )}
              </div>
            );
          } else {
            return (
              <div
                key={`empty-${slotIndex}`}
                className={`transition-all ${
                  isDraggedOver ? 'scale-105 bg-blue-100 border-blue-300' : ''
                }`}
                onDragOver={(e) => handleDragOver(e, slotIndex)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, slotIndex)}
              >
                <EmptyTileSlot
                  slotIndex={slotIndex}
                  onClick={handleSlotClick}
                  size="large"
                />
              </div>
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
            <div>
              <p>Keep adding tiles... ({13 - tiles.length} more needed)</p>
              {tiles.length === 10 && (
                <p className="text-orange-600 font-medium mt-1">
                  🎯 Almost there! Just 3 more tiles to go!
                </p>
              )}
            </div>
          ) : tiles.length === 13 ? (
            <p className="text-green-600 font-medium">✅ Perfect! You have 13 tiles</p>
          ) : (
            <p className="text-blue-600 font-medium">
              You have {tiles.length} tiles (dealer gets 14, others get 13)
            </p>
          )}
        </div>
      )}

      {/* Tile picker modal */}
      <TilePickerModal
        isOpen={modalOpen}
        onClose={handleModalClose}
        onTileSelect={handleTileSelect}
        onRemoveTile={handleTileRemove}
        currentTile={getCurrentTile()}
        currentHand={tiles}
        slotIndex={selectedSlotIndex}
      />
    </div>
  );
};